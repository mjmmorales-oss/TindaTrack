#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const distDir = path.resolve(repoRoot, 'frontend/dist')

console.log('--- Checking Production Bundle for Leaked Secrets & Dev Credentials ---')

if (!fs.existsSync(distDir)) {
  console.error(`❌ dist directory not found at ${distDir}. Run "npm run build" first.`)
  process.exit(1)
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList)
    } else {
      fileList.push(filePath)
    }
  }
  return fileList
}

const FORBIDDEN_PATTERNS = [
  { pattern: /owner@tindatrack\.test/i, desc: 'Demo email: owner@tindatrack.test' },
  { pattern: /cashier@tindatrack\.test/i, desc: 'Demo email: cashier@tindatrack.test' },
  { pattern: /DemoAccounts/i, desc: 'Dev component name: DemoAccounts' },
  { pattern: /demo-accounts/i, desc: 'Dev identifier: demo-accounts' },
  { pattern: /localhost:8000/i, desc: 'Hardcoded local API: localhost:8000' },
  { pattern: /AIza[0-9A-Za-z-_]{35}/, desc: 'Google Cloud / Gemini API key token: AIza...' },
  { pattern: /GEMINI/, desc: 'Backend AI environment variable or token: GEMINI' },
  { pattern: /generativelanguage/, desc: 'Google Gemini direct REST endpoint: generativelanguage' },
]

const files = getAllFiles(distDir).filter(
  (f) => f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.css') || f.endsWith('.json'),
)

let failures = []

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const relPath = path.relative(repoRoot, file)

  for (const { pattern, desc } of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      failures.push({ file: relPath, desc })
    }
  }
}

// A production build must talk to Laravel: main.jsx stamps the data source into the bundle
// (the minifier may emit "…", '…' or `…`)
const usesMockData = files.some((f) => /dataSource\s*=\s*["'`]mock["'`]/.test(fs.readFileSync(f, 'utf8')))
const hasMarker = files.some((f) => /dataSource\s*=\s*["'`](api|mock)["'`]/.test(fs.readFileSync(f, 'utf8')))
if (usesMockData) {
  failures.push({ file: 'frontend/dist', desc: 'Built with VITE_DATA_SOURCE=mock (demo data instead of the API)' })
} else if (!hasMarker) {
  console.warn('⚠️  Data-source marker not found in the bundle (main.jsx); could not verify VITE_DATA_SOURCE.')
}

if (failures.length > 0) {
  console.error('❌ Production bundle check FAILED! Forbidden patterns found in dist:')
  for (const f of failures) {
    console.error(`  - [${f.desc}] found in ${f.file}`)
  }
  process.exit(1)
}

console.log(`✅ Production bundle clean! Scanned ${files.length} built assets with 0 secret or dev leaks.\n`)
process.exit(0)
