#!/usr/bin/env node

/**
 * scripts/check-i18n.mjs
 *
 * Verifies:
 * 1. Key parity: every key in en exists in fil and vice versa; no value is empty.
 * 2. Placeholder parity: every {{var}} in en matches fil.
 * 3. Key existence: every t('ns:key') or t('key') used in frontend/src exists in en.
 * 4. Filipino marker leaks scan in frontend/src (excluding locales, tests, and mock seed data).
 * 5. Filipino marker leaks scan in backend/app user-facing strings.
 * 6. Heuristic scan for untranslated strings (props/toasts).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Robust repo root resolution
const candidateRoot = path.resolve(__dirname, '..')
const root = fs.existsSync(path.join(candidateRoot, 'frontend', 'src'))
  ? candidateRoot
  : path.resolve(__dirname, '..', '..')

const localesEnDir = path.join(root, 'frontend', 'src', 'locales', 'en')
const localesFilDir = path.join(root, 'frontend', 'src', 'locales', 'fil')
const srcDir = path.join(root, 'frontend', 'src')
const backendAppDir = path.join(root, 'backend', 'app')

let totalErrors = 0

console.log('--- Checking i18n Dictionary Parity & Placeholders ---')

let hasParityError = false
const enDictionaries = {}
const filDictionaries = {}

if (!fs.existsSync(localesEnDir) || !fs.existsSync(localesFilDir)) {
  console.error('[FAIL] Locales directories do not exist.')
  process.exit(1)
}

const enFiles = fs.readdirSync(localesEnDir).filter((f) => f.endsWith('.json'))
const filFiles = fs.readdirSync(localesFilDir).filter((f) => f.endsWith('.json'))

const allNamespaces = Array.from(new Set([...enFiles, ...filFiles])).map((f) => f.replace('.json', ''))

function extractPlaceholders(str) {
  if (typeof str !== 'string') return []
  const matches = str.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []
  return matches.map((m) => m.slice(2, -2).trim()).sort()
}

for (const ns of allNamespaces) {
  const enPath = path.join(localesEnDir, `${ns}.json`)
  const filPath = path.join(localesFilDir, `${ns}.json`)

  if (!fs.existsSync(enPath)) {
    console.error(`[FAIL] Namespace ${ns} exists in fil but missing in en`)
    hasParityError = true
    continue
  }
  if (!fs.existsSync(filPath)) {
    console.error(`[FAIL] Namespace ${ns} exists in en but missing in fil`)
    hasParityError = true
    continue
  }

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const filData = JSON.parse(fs.readFileSync(filPath, 'utf8'))
  enDictionaries[ns] = enData
  filDictionaries[ns] = filData

  const enKeys = Object.keys(enData)
  const filKeys = Object.keys(filData)

  for (const k of enKeys) {
    if (!(k in filData)) {
      console.error(`[FAIL] ${ns}.json: key "${k}" exists in en but missing in fil`)
      hasParityError = true
    } else if (!enData[k] || typeof enData[k] !== 'string' || !enData[k].trim()) {
      console.error(`[FAIL] ${ns}.json [en]: key "${k}" is empty`)
      hasParityError = true
    } else if (!filData[k] || typeof filData[k] !== 'string' || !filData[k].trim()) {
      console.error(`[FAIL] ${ns}.json [fil]: key "${k}" is empty`)
      hasParityError = true
    } else {
      // Placeholder parity check
      const enPlaceholders = extractPlaceholders(enData[k])
      const filPlaceholders = extractPlaceholders(filData[k])
      if (enPlaceholders.join(',') !== filPlaceholders.join(',')) {
        console.error(
          `[FAIL] ${ns}.json: placeholder mismatch for key "${k}" (en: [${enPlaceholders}] vs fil: [${filPlaceholders}])`
        )
        hasParityError = true
      }
    }
  }

  for (const k of filKeys) {
    if (!(k in enData)) {
      console.error(`[FAIL] ${ns}.json: key "${k}" exists in fil but missing in en`)
      hasParityError = true
    }
  }
}

console.log(`Verified ${allNamespaces.length} namespaces.`)
if (hasParityError) {
  console.error('[FAIL] Key/placeholder parity checks failed.')
  totalErrors++
} else {
  console.log('✅ Key parity, non-empty, and placeholder checks passed across all namespaces!')
}

// 2. Scan src for t(...) calls and ensure keys exist in en
console.log('\n--- Scanning Codebase for t(...) Invocations ---')

function getAllSourceFiles(dir, files = [], extensions = ['.jsx', '.js']) {
  if (!fs.existsSync(dir)) return files
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist' && item !== 'test' && item !== '.git') {
        getAllSourceFiles(full, files, extensions)
      }
    } else if (extensions.some((ext) => item.endsWith(ext))) {
      files.push(full)
    }
  }
  return files
}

const allSrcFiles = getAllSourceFiles(srcDir)
let hasMissingKeyError = false
let totalTCalls = 0

const tCallRegex = /\bt\(\s*['"`]([^'"`]+)['"`]/g

for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8')
  let match
  while ((match = tCallRegex.exec(content)) !== null) {
    totalTCalls++
    const rawKey = match[1]
    let ns = 'common'
    let key = rawKey

    if (rawKey.includes(':')) {
      const parts = rawKey.split(':')
      ns = parts[0]
      key = parts[1]
    } else if (rawKey.includes('.')) {
      const parts = rawKey.split('.')
      ns = parts[0]
      key = parts.slice(1).join('.')
    }

    if (!enDictionaries[ns] || !(key in enDictionaries[ns])) {
      if (!enDictionaries.common || !(rawKey in enDictionaries.common)) {
        console.error(`[FAIL] Missing translation key "${rawKey}" in file: ${path.relative(root, file)}`)
        hasMissingKeyError = true
      }
    }
  }
}

console.log(`Validated ${totalTCalls} t(...) invocations.`)
if (hasMissingKeyError) {
  console.error('[FAIL] Undefined translation keys detected in src!')
  totalErrors++
} else {
  console.log('✅ All t(...) invocation keys verified against English dictionary!')
}

// 3. Filipino Marker Words Scanner
console.log('\n--- Scanning for Filipino Marker Words (UI / User-facing Leaks) ---')

const MARKER_WORDS = [
  'ang', 'ng', 'nang', 'mga', 'sa', 'ay', 'po', 'hindi', 'walang',
  'pindutin', 'i-scan', 'i-type', 'sinisimulan', 'ikonekta', 'bayaran', 'paninda'
]
const MARKER_PREFIXES = ['naka-', 'mag-', 'pag-', 'i-scan', 'i-type']

const markerRegexParts = [
  ...MARKER_WORDS.map((w) => `\\b${w}\\b`),
  ...MARKER_PREFIXES.map((p) => `\\b${p}`)
]
const filipinoMarkerRegex = new RegExp(`(${markerRegexParts.join('|')})`, 'i')

// Allowed domain terms and seed store fixtures
const ALLOW_LIST = [
  'utang',
  'sari-sari',
  'puhunan',
  'tindahan',
  'tindahan ni aling nena',
  'mura at sariwa araw-araw',
  'purok 3, brgy. san isidro',
  '0917-123-4567',
  'juan (kahera)',
  'change (sukli)',
  'sale (benta)',
  'nena dela cruz',
  'juan dela cruz',
  'bea santos',
  'salamat po! balik po kayo!'
]

function stripAllowed(str) {
  let res = str
  for (const allowed of ALLOW_LIST) {
    res = res.split(new RegExp(allowed, 'gi')).join(' ')
  }
  return res
}

function stripComments(line) {
  let l = line.trim()
  if (l.startsWith('//') || l.startsWith('*') || l.startsWith('/*') || l.startsWith('#')) {
    return ''
  }
  // Remove trailing line comments
  const commentIdx = l.indexOf('//')
  if (commentIdx !== -1) {
    l = l.substring(0, commentIdx)
  }
  return l
}

// Scan frontend/src
let feMarkerHits = 0
const feExcludePatterns = [
  path.join('src', 'locales'),
  path.join('src', 'test'),
  '__tests__',
  '.test.',
  '.spec.',
  path.join('src', 'mocks', 'data'),
  path.join('src', 'mocks', 'generators'),
  path.join('src', 'features', 'dev'),
  path.join('src', 'components', 'ui')
]

for (const file of allSrcFiles) {
  const rel = path.relative(root, file)
  if (feExcludePatterns.some((pattern) => rel.includes(pattern))) {
    continue
  }

  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split('\n')

  lines.forEach((line, idx) => {
    const cleanedLine = stripComments(line)
    if (!cleanedLine) return

    const sanitized = stripAllowed(cleanedLine)
    const match = filipinoMarkerRegex.exec(sanitized)
    if (match) {
      feMarkerHits++
      console.error(`[FAIL] Filipino marker "${match[0]}" in frontend: ${rel}:${idx + 1}`)
      console.error(`       Line: ${line.trim()}`)
    }
  })
}

if (feMarkerHits > 0) {
  console.error(`[FAIL] Found ${feMarkerHits} Filipino marker leaks in frontend!`)
  totalErrors++
} else {
  console.log('✅ Zero Filipino marker leaks in frontend/src!')
}

// Scan backend/app
let beMarkerHits = 0
if (fs.existsSync(backendAppDir)) {
  const backendFiles = getAllSourceFiles(backendAppDir, [], ['.php'])

  for (const file of backendFiles) {
    const rel = path.relative(root, file)
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      const cleanedLine = stripComments(line)
      if (!cleanedLine) return

      // Extract quoted string literals
      const stringMatches = cleanedLine.match(/['"]([^'"]+)['"]/g) || []
      for (const quoted of stringMatches) {
        const strVal = quoted.slice(1, -1)
        const sanitized = stripAllowed(strVal)
        const match = filipinoMarkerRegex.exec(sanitized)
        if (match) {
          beMarkerHits++
          console.error(`[FAIL] Filipino marker "${match[0]}" in backend user string: ${rel}:${idx + 1}`)
          console.error(`       String: ${strVal}`)
        }
      }
    })
  }
}

if (beMarkerHits > 0) {
  console.error(`[FAIL] Found ${beMarkerHits} Filipino marker leaks in backend/app!`)
  totalErrors++
} else {
  console.log('✅ Zero Filipino marker leaks in backend/app!')
}

// 4. Heuristic untranslated strings check
console.log('\n--- Heuristic Scan for Untranslated Strings ---')

const HEURISTIC_ALLOW_LIST = new Set([
  'TindaTrack', 'React', 'Laravel', 'Vite', 'Pusher', 'SDG', 'Railway', 'Vercel',
  'PHP', 'MySQL', 'GTIN', 'EAN', 'UPC', 'SKU', 'ISBN', 'POS', 'CSV', 'PDF', 'API',
  'Enter', 'Esc', 'Tab', 'Ctrl', 'Alt', 'Shift', '0917-123-4567',
  'owner@tindatrack.test', 'cashier@tindatrack.test'
])

function isAllowedString(str) {
  if (!str) return true
  const trimmed = str.trim()
  if (trimmed.length <= 1) return true
  if (HEURISTIC_ALLOW_LIST.has(trimmed)) return true
  if (/^[\d\s.,₱%+\-/*#():;!?"'@—_]+$/.test(trimmed)) return true
  if (/^\d+\s*(px|ms|s|min|h|d|kB|MB|GB|%|kilos|pcs|g|ml|L)$/i.test(trimmed)) return true
  if (/^(⌘|⌥|⌃|⇧|[A-Z0-9])$/.test(trimmed)) return true
  return false
}

const targetDirs = [
  path.join(root, 'frontend', 'src', 'features'),
  path.join(root, 'frontend', 'src', 'components')
]

let untranslatedCount = 0
const untranslatedFindings = []

for (const targetDir of targetDirs) {
  const files = getAllSourceFiles(targetDir).filter((f) => {
    return !f.includes(path.join('components', 'ui'))
  })

  for (const file of files) {
    const rel = path.relative(root, file)
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      const lineNum = idx + 1
      const propRegex = /\b(placeholder|title|label|description|aria-label)\s*=\s*["']([^"']+)["']/g
      let propMatch
      while ((propMatch = propRegex.exec(line)) !== null) {
        const val = propMatch[2]
        if (!isAllowedString(val) && /[a-zA-Z]{2,}/.test(val)) {
          untranslatedCount++
          untranslatedFindings.push({ file: rel, line: lineNum, type: propMatch[1], text: val })
        }
      }

      const notifyRegex = /\bnotify\.(success|warning|error|info)\s*\(\s*["']([^"']+)["']/g
      let notifMatch
      while ((notifMatch = notifyRegex.exec(line)) !== null) {
        const val = notifMatch[2]
        if (!isAllowedString(val) && /[a-zA-Z]{2,}/.test(val)) {
          untranslatedCount++
          untranslatedFindings.push({ file: rel, line: lineNum, type: 'notify', text: val })
        }
      }
    })
  }
}

console.log(`Untranslated candidate strings found in UI features/components: ${untranslatedCount}`)
if (process.argv.includes('--strict') && untranslatedCount > 0) {
  console.error(`[FAIL] --strict mode: ${untranslatedCount} untranslated strings found!`)
  for (const f of untranslatedFindings.slice(0, 10)) {
    console.error(`  ${f.file}:${f.line} [${f.type}] "${f.text}"`)
  }
  totalErrors++
}

if (totalErrors > 0) {
  console.error(`\n❌ i18n checks failed with ${totalErrors} error category(ies).`)
  process.exit(1)
}

console.log('\n🎉 i18n check completed successfully with zero errors!')
process.exit(0)
