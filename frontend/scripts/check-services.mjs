#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')

console.log('--- Verifying Mock vs API Service Parity & Hook Calls ---')

const RESERVED = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'constructor'])

function getServiceMethods(filePath) {
  const code = fs.readFileSync(filePath, 'utf8')
  const objMatch = code.match(/export\s+const\s+(\w+Service)\s*=\s*\{([\s\S]*?)\n\}/)
  if (!objMatch) return { serviceName: null, methods: [] }
  const serviceName = objMatch[1]
  const body = objMatch[2]

  const methods = []
  const lines = body.split('\n')
  for (const line of lines) {
    const m = line.match(/^  (?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/)
    if (m && !RESERVED.has(m[1])) {
      methods.push(m[1])
    }
  }
  return { serviceName, methods: Array.from(new Set(methods)).sort() }
}

const mockDir = path.join(frontendRoot, 'src/services/mock')
const apiDir = path.join(frontendRoot, 'src/services/api')

const mockFiles = fs.readdirSync(mockDir).filter((f) => f.endsWith('.js')).sort()
const apiFiles = fs.readdirSync(apiDir).filter((f) => f.endsWith('.js') && f !== 'apiClient.js').sort()

let hasErrors = false

// Check 1: File matching
const missingApiFiles = mockFiles.filter((f) => !apiFiles.includes(f))
const missingMockFiles = apiFiles.filter((f) => !mockFiles.includes(f))

if (missingApiFiles.length > 0) {
  console.error('❌ Missing in api directory:', missingApiFiles)
  hasErrors = true
}
if (missingMockFiles.length > 0) {
  console.error('❌ Missing in mock directory:', missingMockFiles)
  hasErrors = true
}

const servicesMap = new Map()

// Check 2: Method parity between mock and api
for (const file of mockFiles) {
  const mockPath = path.join(mockDir, file)
  const apiPath = path.join(apiDir, file)

  const mock = getServiceMethods(mockPath)
  const api = getServiceMethods(apiPath)

  if (!mock.serviceName || !api.serviceName) {
    console.error(`❌ Could not parse service name in ${file}`)
    hasErrors = true
    continue
  }

  servicesMap.set(mock.serviceName, mock.methods)

  const missingInApi = mock.methods.filter((m) => !api.methods.includes(m))
  const missingInMock = api.methods.filter((m) => !mock.methods.includes(m))

  if (missingInApi.length > 0) {
    console.error(`❌ [${file}] Methods missing in API service: ${missingInApi.join(', ')}`)
    hasErrors = true
  }
  if (missingInMock.length > 0) {
    console.error(`❌ [${file}] Methods missing in Mock service: ${missingInMock.join(', ')}`)
    hasErrors = true
  }

  if (missingInApi.length === 0 && missingInMock.length === 0) {
    console.log(`✓ ${mock.serviceName}: ${mock.methods.length} methods matched`)
  }
}

// Check 3: Audit all hook files for calls against service methods
const hooksDir = path.join(frontendRoot, 'src/features')
function findHookFiles(dir) {
  let results = []
  const list = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results = results.concat(findHookFiles(fullPath))
    } else if (entry.isFile() && fullPath.includes('/hooks/') && entry.name.endsWith('.js')) {
      results.push(fullPath)
    }
  }
  return results
}

const hookFiles = findHookFiles(hooksDir)
for (const hookFile of hookFiles) {
  const content = fs.readFileSync(hookFile, 'utf8')
  for (const [serviceName, methods] of servicesMap.entries()) {
    const regex = new RegExp(`\\b${serviceName}\\.([a-zA-Z0-9_$]+)\\b`, 'g')
    let match
    while ((match = regex.exec(content)) !== null) {
      const calledMethod = match[1]
      if (!methods.includes(calledMethod)) {
        console.error(`❌ [${path.relative(frontendRoot, hookFile)}] calls unknown method: ${serviceName}.${calledMethod}`)
        hasErrors = true
      }
    }
  }
}

if (hasErrors) {
  console.error('\n❌ Service check failed with discrepancies.')
  process.exit(1)
} else {
  console.log('\n✓ All mock/api service contracts match and all hook invocations are verified.')
  process.exit(0)
}
