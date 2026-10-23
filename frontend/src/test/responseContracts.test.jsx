import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { useMockDb } from '@/mocks/db'
import { apiClient } from '@/services/api/apiClient.js'

/**
 * v2.2 C1.3 response contracts. `contracts/responses/api/*.json` are type
 * skeletons of the real Laravel responses (written by Pest
 * ResponseContractExportTest). For each one we:
 *   1. feed the API service a body built from the skeleton (apiClient stubbed),
 *      so the service's own unwrapping/normalizing runs;
 *   2. call the mock service the UI uses in tests/mock mode;
 *   3. compare both results' shapes.
 * A mismatch means the UI is tested against data the real backend never sends.
 */

const DIR = path.resolve(__dirname, '../../../contracts/responses/api')

function shapeOf(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'empty'
    return [value.map(shapeOf).reduce(mergeShapes, null)]
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) out[key] = shapeOf(value[key])
    return out
  }
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  return 'null'
}

function mergeShapes(a, b) {
  if (a == null || a === 'null' || a === 'empty') return b
  if (b == null || b === 'null' || b === 'empty') return a
  if (Array.isArray(a) && Array.isArray(b)) return [mergeShapes(a[0], b[0])]
  if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const out = { ...a }
    for (const key of Object.keys(b)) out[key] = mergeShapes(out[key], b[key])
    return out
  }
  return a
}

function sampleFrom(shape) {
  if (Array.isArray(shape)) return [sampleFrom(shape[0])]
  if (shape && typeof shape === 'object') {
    return Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, sampleFrom(v)]))
  }
  return { number: 1, string: 'x', boolean: true, empty: [] }[shape] ?? null
}

/**
 * Returns human-readable differences between the API-side and mock-side shapes.
 * Nullable/empty values are compatible with anything (we only see one sample).
 */
function diffShapes(api, mock, at = '$', out = []) {
  const loose = (s) => s === 'null' || s === 'empty' || s == null
  if (loose(api) || loose(mock)) return out
  if (Array.isArray(api) || Array.isArray(mock)) {
    if (!Array.isArray(api) || !Array.isArray(mock)) {
      out.push(`${at}: api is ${Array.isArray(api) ? 'array' : typeof api}, mock is ${Array.isArray(mock) ? 'array' : typeof mock}`)
      return out
    }
    return diffShapes(api[0], mock[0], `${at}[]`, out)
  }
  if (typeof api === 'object' || typeof mock === 'object') {
    if (typeof api !== 'object' || typeof mock !== 'object') {
      out.push(`${at}: api is ${typeof api === 'object' ? 'object' : api}, mock is ${typeof mock === 'object' ? 'object' : mock}`)
      return out
    }
    // Extra API keys are harmless (the mock is just thinner); keys only the mock
    // has are not: UI written against the mock would read undefined in production.
    for (const key of Object.keys(api)) {
      if (key in mock) diffShapes(api[key], mock[key], `${at}.${key}`, out)
    }
    for (const key of Object.keys(mock)) {
      if (!(key in api)) out.push(`${at}.${key}: only in MOCK (UI may rely on it; the real API never sends it)`)
    }
    return out
  }
  if (api !== mock) out.push(`${at}: api ${api}, mock ${mock}`)
  return out
}

const load = (name) => JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8'))

/** fixture → [service module name, function, args] */
const CASES = {
  'products-list': ['productService', 'list', [{ per_page: 5 }]],
  'products-detail': ['productService', 'get', [1]],
  'products-low-stock': ['productService', 'lowStock', []],
  'categories-list': ['categoryService', 'list', []],
  'customers-list': ['customerService', 'list', [{ per_page: 5 }]],
  'customers-detail': ['customerService', 'get', [1]],
  'customers-ledger': ['customerService', 'ledger', [1]],
  'sales-list': ['saleService', 'list', [{ per_page: 5 }]],
  'utang-summary': ['utangService', 'summary', []],
  'utang-debtors': ['utangService', 'debtors', []],
  'dashboard': ['dashboardService', 'get', []],
  'reports-sales': ['reportService', 'sales', [{}]],
  'reports-best-sellers': ['reportService', 'bestSellers', [{}]],
  'reports-category-breakdown': ['reportService', 'categoryBreakdown', [{}]],
  'reports-hourly': ['reportService', 'hourly', [{}]],
  'inventory-overview': ['inventoryService', 'overview', []],
  'inventory-movements': ['inventoryService', 'movements', [{ per_page: 5 }]],
  'inventory-restock-list': ['inventoryService', 'restockList', []],
  'settings': ['settingsService', 'get', []],
  'users-list': ['staffService', 'list', []],
  'users-detail': ['staffService', 'get', [1]],
  'ai-status': ['aiService', 'getAiStatus', []],
  'barcode-lookup': ['barcodeService', 'lookupBarcode', ['4800016601011']],
  // Mutations (args depend on the mock DB, so they are functions)
  'utang-payment-create': [
    'utangService',
    'recordPayment',
    () => [useMockDb.getState().customers.find((c) => c.credit_balance > 1).id, { amount: 1 }],
  ],
  'sales-create': [
    'saleService',
    'create',
    () => {
      const p = useMockDb.getState().products.find((x) => x.is_active && x.stock_quantity > 1)
      return [[{ product_id: p.id, quantity: 1 }], { payment_type: 'cash', amount_paid: 10000 }]
    },
  ],
}

/**
 * Known, reviewed differences (path prefixes). Keep this list short: each entry
 * must be harmless for the UI (documented in docs/AUDIT-v2.2.0.md).
 */
const ALLOWED = {}

async function callApi(service, fn, args, body) {
  const mod = await import(`@/services/api/${service}.js`)
  const impl = mod[service] || mod.default
  const respond = vi.fn().mockResolvedValue(body)
  const spies = ['get', 'post', 'put', 'patch', 'delete'].map((m) => vi.spyOn(apiClient, m).mockImplementation(respond))
  try {
    return await impl[fn](...args)
  } finally {
    spies.forEach((s) => s.mockRestore())
  }
}

async function callMock(service, fn, args) {
  const mod = await import(`@/services/mock/${service}.js`)
  const impl = mod[service] || mod.default
  return impl[fn](...args)
}

describe('C1.3: mock services return the same shape as the Laravel API', () => {
  beforeAll(() => {
    localStorage.clear()
    useMockDb.getState().resetDemoData()
  })
  afterAll(() => vi.restoreAllMocks())

  for (let [name, [service, fn, args]] of Object.entries(CASES)) {
    it(`${name}: ${service}.${fn}`, async () => {
      args = typeof args === 'function' ? args() : args
      const apiResult = await callApi(service, fn, args, sampleFrom(load(name)))
      const mockResult = await callMock(service, fn, args)
      const allowed = ALLOWED[name] || []
      const diffs = diffShapes(shapeOf(apiResult), shapeOf(mockResult)).filter(
        (d) => !allowed.some((prefix) => d.startsWith(prefix)),
      )
      if (process.env.CONTRACT_DIFF_OUT && diffs.length) {
        fs.appendFileSync(process.env.CONTRACT_DIFF_OUT, `## ${name}\n${diffs.join('\n')}\n\n`)
      }
      expect(diffs, `${service}.${fn} shape differences`).toEqual([])
    })
  }
})
