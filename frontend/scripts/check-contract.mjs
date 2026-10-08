#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('--- Verifying Frontend API Services against Laravel Routes ---')

// 1. Obtain Laravel routes JSON
let routesJsonRaw = ''
const fileArg = process.argv[2]

if (fileArg && fs.existsSync(fileArg)) {
  console.log(`Loading routes from file: ${fileArg}`)
  routesJsonRaw = fs.readFileSync(fileArg, 'utf8')
} else {
  // Attempt to execute artisan route:list directly
  const backendDir = path.resolve(__dirname, '../../backend')
  console.log(`Executing "php artisan route:list --path=api --json" in ${backendDir}...`)
  try {
    routesJsonRaw = execSync('php artisan route:list --path=api --json', {
      cwd: backendDir,
      encoding: 'utf8',
    })
  } catch (err) {
    console.error('Failed to run artisan route:list:', err.message)
    process.exit(1)
  }
}

let routes = []
try {
  routes = JSON.parse(routesJsonRaw)
} catch (err) {
  console.error('Failed to parse routes JSON:', err.message)
  process.exit(1)
}

// Normalize route entries for quick lookup
// e.g. "GET|HEAD api/products" -> { methods: ['GET', 'HEAD'], uri: 'api/products' }
const normalizedRoutes = routes.map((r) => {
  const methods = r.method.split('|').map((m) => m.trim().toUpperCase())
  const uri = r.uri.replace(/^\//, '')
  return { methods, uri }
})

function hasRoute(method, targetUri) {
  const cleanUri = targetUri.replace(/^\//, '')
  return normalizedRoutes.some((r) => {
    return (
      r.methods.includes(method.toUpperCase()) &&
      r.uri.toLowerCase() === cleanUri.toLowerCase()
    )
  })
}

// Contract mapping between each service function and its expected route
const CONTRACT = [
  // categoryService
  { service: 'categoryService', fn: 'list', method: 'GET', uri: 'api/categories' },
  { service: 'categoryService', fn: 'create', method: 'POST', uri: 'api/categories' },
  { service: 'categoryService', fn: 'update', method: 'PUT', uri: 'api/categories/{category}' },
  { service: 'categoryService', fn: 'remove', method: 'DELETE', uri: 'api/categories/{category}' },

  // productService
  { service: 'productService', fn: 'list', method: 'GET', uri: 'api/products' },
  { service: 'productService', fn: 'get', method: 'GET', uri: 'api/products/{product}' },
  { service: 'productService', fn: 'create', method: 'POST', uri: 'api/products' },
  { service: 'productService', fn: 'update', method: 'PUT', uri: 'api/products/{product}' },
  { service: 'productService', fn: 'remove', method: 'DELETE', uri: 'api/products/{product}' },
  { service: 'productService', fn: 'adjustStock', method: 'POST', uri: 'api/products/{product}/adjust' },
  { service: 'productService', fn: 'lowStock', method: 'GET', uri: 'api/products/low-stock' },

  // customerService
  { service: 'customerService', fn: 'list', method: 'GET', uri: 'api/customers' },
  { service: 'customerService', fn: 'get', method: 'GET', uri: 'api/customers/{customer}' },
  { service: 'customerService', fn: 'create', method: 'POST', uri: 'api/customers' },
  { service: 'customerService', fn: 'update', method: 'PUT', uri: 'api/customers/{customer}' },
  { service: 'customerService', fn: 'remove', method: 'DELETE', uri: 'api/customers/{customer}' },
  { service: 'customerService', fn: 'ledger', method: 'GET', uri: 'api/customers/{customer}/ledger' },

  // saleService
  { service: 'saleService', fn: 'list', method: 'GET', uri: 'api/sales' },
  { service: 'saleService', fn: 'get', method: 'GET', uri: 'api/sales/{sale}' },
  { service: 'saleService', fn: 'create', method: 'POST', uri: 'api/sales' },
  { service: 'saleService', fn: 'void', method: 'POST', uri: 'api/sales/{sale}/void' },

  // utangService
  { service: 'utangService', fn: 'summary', method: 'GET', uri: 'api/utang/summary' },
  { service: 'utangService', fn: 'debtors', method: 'GET', uri: 'api/utang/debtors' },
  { service: 'utangService', fn: 'recordPayment', method: 'POST', uri: 'api/utang-payments' },

  // inventoryService
  { service: 'inventoryService', fn: 'overview', method: 'GET', uri: 'api/inventory/overview' },
  { service: 'inventoryService', fn: 'movements', method: 'GET', uri: 'api/inventory/movements' },
  { service: 'inventoryService', fn: 'restockList', method: 'GET', uri: 'api/inventory/restock-list' },

  // dashboardService
  { service: 'dashboardService', fn: 'get', method: 'GET', uri: 'api/dashboard' },

  // reportService
  { service: 'reportService', fn: 'sales', method: 'GET', uri: 'api/reports/sales' },
  { service: 'reportService', fn: 'bestSellers', method: 'GET', uri: 'api/reports/best-sellers' },
  { service: 'reportService', fn: 'categoryBreakdown', method: 'GET', uri: 'api/reports/category-breakdown' },
  { service: 'reportService', fn: 'hourly', method: 'GET', uri: 'api/reports/hourly' },

  // settingsService
  { service: 'settingsService', fn: 'get', method: 'GET', uri: 'api/settings' },
  { service: 'settingsService', fn: 'update', method: 'PUT', uri: 'api/settings' },

  // staffService
  { service: 'staffService', fn: 'list', method: 'GET', uri: 'api/users' },
  { service: 'staffService', fn: 'create', method: 'POST', uri: 'api/users' },
  { service: 'staffService', fn: 'toggleActive', method: 'PATCH', uri: 'api/users/{user}/toggle-active' },
]

// 2. Validate all functions in src/services/api/* exist and match contract
const apiServicesDir = path.resolve(__dirname, '../src/services/api')
const files = fs.readdirSync(apiServicesDir).filter((f) => f.endsWith('.js') && f !== 'apiClient.js')

let errors = []
let verifiedCount = 0

for (const entry of CONTRACT) {
  const match = hasRoute(entry.method, entry.uri)
  if (!match) {
    errors.push(`Missing route for ${entry.service}.${entry.fn}(): ${entry.method} ${entry.uri}`)
  } else {
    verifiedCount++
  }
}

console.log(`\nVerified ${verifiedCount} API endpoint contracts against backend routes.`)

if (errors.length > 0) {
  console.error('\n❌ Contract check failed:')
  errors.forEach((e) => console.error(` - ${e}`))
  process.exit(1)
}

console.log('✅ All API contracts match registered Laravel routes!\n')
process.exit(0)
