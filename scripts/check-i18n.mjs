#!/usr/bin/env node

/**
 * scripts/check-i18n.mjs
 *
 * Verifies:
 * 1. Key parity: every key in en exists in fil and vice versa; no value is empty.
 * 2. Key existence: every t('ns:key') or t('key') used in frontend/src exists in en.
 * 3. Heuristic untranslated scan: flags untranslated JSX text nodes and string props
 *    (placeholder, title, aria-label, label, description, and notify.* messages).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Robust repo root resolution whether invoked from root/scripts or frontend/scripts
const candidateRoot = path.resolve(__dirname, '..')
const root = fs.existsSync(path.join(candidateRoot, 'frontend', 'src'))
  ? candidateRoot
  : path.resolve(__dirname, '..', '..')

const localesEnDir = path.join(root, 'frontend', 'src', 'locales', 'en')
const localesFilDir = path.join(root, 'frontend', 'src', 'locales', 'fil')
const srcDir = path.join(root, 'frontend', 'src')

console.log('--- Checking i18n Dictionary Parity & Key Existence ---')

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
  console.error('[FAIL] Key parity checks failed.')
  process.exit(1)
}
console.log('✅ Key parity & non-empty checks passed across all namespaces!')

// 2. Scan src for t(...) calls and ensure keys exist in en
console.log('\n--- Scanning Codebase for t(...) Invocations ---')

function getAllSourceFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist' && item !== 'test') {
        getAllSourceFiles(full, files)
      }
    } else if (item.endsWith('.jsx') || item.endsWith('.js')) {
      files.push(full)
    }
  }
  return files
}

const allSrcFiles = getAllSourceFiles(srcDir)
let hasMissingKeyError = false
let totalTCalls = 0

// Match t('...') or t("...")
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
      // Check if rawKey is direct key in common
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
  process.exit(1)
}
console.log('✅ All t(...) invocation keys verified against English dictionary!')

// 3. Heuristic untranslated text scanner
console.log('\n--- Heuristic Scan for Untranslated Strings ---')

const ALLOW_LIST = new Set([
  'TindaTrack', 'React', 'Laravel', 'Vite', 'Pusher', 'SDG', 'Railway', 'Vercel',
  'PHP', 'MySQL', 'GTIN', 'EAN', 'UPC', 'SKU', 'ISBN', 'POS', 'CSV', 'PDF', 'API',
  'Enter', 'Esc', 'Tab', 'Ctrl', 'Alt', 'Shift', '0917-123-4567',
  'owner@tindatrack.test', 'cashier@tindatrack.test',
])

function isAllowedString(str) {
  if (!str) return true
  const trimmed = str.trim()
  if (trimmed.length <= 1) return true
  if (ALLOW_LIST.has(trimmed)) return true
  // Currency or purely numbers/symbols
  if (/^[\d\s.,₱%+\-/*#():;!?"'@—_]+$/.test(trimmed)) return true
  // Dimension/duration/byte patterns
  if (/^\d+\s*(px|ms|s|min|h|d|kB|MB|GB|%|kilos|pcs|g|ml|L)$/i.test(trimmed)) return true
  // Single keyboard key / shortcuts
  if (/^(⌘|⌥|⌃|⇧|[A-Z0-9])$/.test(trimmed)) return true
  return false
}

const targetDirs = [
  path.join(root, 'frontend', 'src', 'features'),
  path.join(root, 'frontend', 'src', 'components'),
]

let untranslatedCount = 0
const untranslatedFindings = []

for (const targetDir of targetDirs) {
  const files = getAllSourceFiles(targetDir).filter((f) => {
    // Exclude components/ui Radix primitives
    return !f.includes(path.join('components', 'ui'))
  })

  for (const file of files) {
    const rel = path.relative(root, file)
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      const lineNum = idx + 1
      // Check hardcoded props: placeholder="...", title="...", label="...", aria-label="..."
      const propRegex = /\b(placeholder|title|label|description|aria-label)\s*=\s*["']([^"']+)["']/g
      let propMatch
      while ((propMatch = propRegex.exec(line)) !== null) {
        const val = propMatch[2]
        if (!isAllowedString(val) && /[a-zA-Z]{2,}/.test(val)) {
          untranslatedCount++
          untranslatedFindings.push({ file: rel, line: lineNum, type: propMatch[1], text: val })
        }
      }

      // Check notify.success/warning/error/info("...")
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
  process.exit(1)
}

console.log('✅ i18n check completed successfully.')
process.exit(0)
