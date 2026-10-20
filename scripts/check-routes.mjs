#!/usr/bin/env node
/**
 * check-routes: every HTTP call the frontend makes must hit a real Laravel route
 * with the same method. Unlike check-contract (a hand-written list), this parses
 * the source, so a new or renamed call can't slip through.
 *
 *   node scripts/check-routes.mjs [routes.json]
 *
 * - Sources: frontend/src (no tests, no mocks); calls on apiClient / api / deviceAxios
 *   whose first argument is a string or template literal starting with "/".
 * - Routes: `php artisan route:list --path=api --json` (or a saved JSON file).
 * - Fails on a call without a route or with the wrong method; lists backend
 *   routes no frontend code calls (informational).
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(repoRoot, 'frontend', 'src')
const backendDir = path.join(repoRoot, 'backend')

// Routes that are called by something other than the SPA (phones' QR, curl, health checks…)
const NOT_CALLED_BY_SPA = new Set([
  'GET api/ping',
  'GET api/owner/ping',
  'GET api/staff/ping',
  'GET api/product-images/{ulid}', // used as <img src>, not through axios
  'GET api/ai/scans/{scan}/image', // used as <img src>
  'GET api/user/email/verify/{id}/{hash}',
  'GET api/verify-email/{id}/{hash}',
  'POST api/email/verification-notification',
  'GET api/broadcasting/auth', // laravel-echo (pusher driver)
  'POST api/broadcasting/auth',
])

function loadRoutes() {
  const file = process.argv[2]
  const raw =
    file && fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8')
      : execSync('php artisan route:list --path=api --json', { cwd: backendDir, encoding: 'utf8' })
  return JSON.parse(raw).map((r) => ({
    methods: r.method.split('|').map((m) => m.trim().toUpperCase()).filter((m) => m !== 'HEAD'),
    uri: r.uri.replace(/^\//, ''),
  }))
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['test', 'mocks', 'mock'].includes(entry.name)) continue
      walk(full, out)
    } else if (/\.(js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const CALL_RE = /\b(apiClient|api|deviceAxios)\.(get|post|put|patch|delete)\(\s*(['"`])(\/[^'"`]*)\3/g

function extractCalls() {
  const calls = []
  for (const file of walk(srcDir)) {
    const text = fs.readFileSync(file, 'utf8')
    for (const m of text.matchAll(CALL_RE)) {
      const line = text.slice(0, m.index).split('\n').length
      const rawPath = m[4]
        .replace(/\$\{[^}]*\}/g, '{param}') // template parameters
        .replace(/\?.*$/, '') // query strings
        .replace(/\/+$/, '')
      calls.push({
        method: m[2].toUpperCase(),
        uri: `api${rawPath}`,
        where: `${path.relative(repoRoot, file)}:${line}`,
      })
    }
  }
  return calls
}

// Routes declared with ->where('param', '.*'): the last param may swallow slashes
const CATCH_ALL_ROUTES = new Set(['api/barcode-lookup/{barcode}'])

function segmentsMatch(callUri, routeUri) {
  const a = callUri.split('/')
  const b = routeUri.split('/')
  const catchAll = CATCH_ALL_ROUTES.has(routeUri)
  if (a.length !== b.length && !(catchAll && a.length > b.length)) return false
  return b.every((seg, i) => {
    const isParam = /^\{[^}]+\}$/.test(seg)
    if (isParam) return a[i] !== undefined && a[i] !== ''
    return a[i] === '{param}' ? false : seg.toLowerCase() === (a[i] || '').toLowerCase()
  })
}

const routes = loadRoutes()
const calls = extractCalls()
const problems = []
const used = new Set()

for (const call of calls) {
  const sameUri = routes.filter((r) => segmentsMatch(call.uri, r.uri))
  const exact = sameUri.find((r) => r.methods.includes(call.method))
  if (exact) {
    used.add(`${call.method} ${exact.uri}`)
  } else if (sameUri.length) {
    problems.push(
      `METHOD MISMATCH  ${call.method} /${call.uri}  (${call.where}) — route allows ${sameUri.map((r) => r.methods.join('|')).join(', ')}`,
    )
  } else {
    problems.push(`MISSING ROUTE    ${call.method} /${call.uri}  (${call.where})`)
  }
}

console.log(`--- check-routes: ${calls.length} frontend calls vs ${routes.length} API routes ---`)

const unused = []
for (const r of routes) {
  for (const method of r.methods) {
    const key = `${method} ${r.uri}`
    if (!used.has(key) && !NOT_CALLED_BY_SPA.has(key)) unused.push(key)
  }
}
if (unused.length) {
  console.log(`\nℹ️  ${unused.length} backend route(s) not called by the SPA:`)
  unused.sort().forEach((u) => console.log(`   ${u}`))
}

if (problems.length) {
  console.error(`\n❌ ${problems.length} frontend call(s) without a matching route:`)
  problems.forEach((p) => console.error(`   ${p}`))
  process.exit(1)
}

console.log('\n✅ Every frontend API call matches a Laravel route and method.')
