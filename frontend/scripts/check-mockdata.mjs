#!/usr/bin/env node
import { performance } from 'node:perf_hooks'
import { generateMockHistory } from '../src/mocks/generators/index.js'

console.log('--- Checking TindaTrack Mock Data & Generators ---')

const startTime = performance.now()
const data = generateMockHistory()
const durationMs = (performance.now() - startTime).toFixed(2)

const {
  settings,
  staff,
  categories,
  products,
  customers,
  sales,
  utangPayments,
  stockMovements,
} = data

// Counts per table
console.log('\nTable Counts:')
console.log(`- settings: 1 (${settings.store_name})`)
console.log(`- staff: ${staff.length}`)
console.log(`- categories: ${categories.length}`)
console.log(`- products: ${products.length}`)
console.log(`- customers: ${customers.length}`)
console.log(`- sales: ${sales.length}`)
console.log(`- utang_payments: ${utangPayments.length}`)
console.log(`- stock_movements: ${stockMovements.length}`)

// Products metrics
const totalProducts = products.length
const outOfStock = products.filter((p) => p.stock_quantity <= 0).length
const lowStock = products.filter(
  (p) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level,
).length
console.log('\nProduct Stock Breakdown:')
console.log(`- Total products: ${totalProducts}`)
console.log(`- Low stock: ${lowStock}`)
console.log(`- Out of stock: ${outOfStock}`)

// Sales metrics
const avgSalesPerDay = (sales.length / 90).toFixed(1)
console.log(`\nSales Average: ${avgSalesPerDay} sales/day (90-day window)`)

// Debtors metrics
const debtors = customers.filter((c) => c.credit_balance > 0)
console.log(`Active Debtors: ${debtors.length} of ${customers.length}`)
console.log(`Generation Time: ${durationMs} ms`)

// Assertions
const errors = []

// 1. Balance reconciliation: Σ customer credit_balance === Σ utang sales (not voided) − Σ payments
const totalCustomerCredit = customers.reduce((sum, c) => sum + c.credit_balance, 0)
const totalUtangSales = sales
  .filter((s) => s.payment_method === 'utang' && s.status === 'completed')
  .reduce((sum, s) => sum + s.total, 0)
const totalPayments = utangPayments.reduce((sum, p) => sum + p.amount, 0)
const expectedCredit = Math.round((totalUtangSales - totalPayments) * 100) / 100
const actualCredit = Math.round(totalCustomerCredit * 100) / 100
const diff = Math.abs(actualCredit - expectedCredit)

console.log('\nBalance Reconciliation:')
console.log(`- Total Utang Sales: ₱${totalUtangSales.toFixed(2)}`)
console.log(`- Total Utang Payments: ₱${totalPayments.toFixed(2)}`)
console.log(`- Expected Net Debt: ₱${expectedCredit.toFixed(2)}`)
console.log(`- Actual Customer Balances: ₱${actualCredit.toFixed(2)}`)
console.log(`- Discrepancy: ₱${diff.toFixed(4)}`)

if (diff > 0.01) {
  errors.push(
    `Balance reconciliation failed: actual (₱${actualCredit}) !== expected (₱${expectedCredit}), diff: ${diff}`,
  )
}

// 2. No negative stock
const negativeStock = products.filter((p) => p.stock_quantity < 0)
if (negativeStock.length > 0) {
  errors.push(
    `Negative stock found for ${negativeStock.length} products: ${negativeStock.map((p) => p.name).join(', ')}`,
  )
}

// 3. No duplicate sale numbers
const saleNumbers = new Set()
for (const s of sales) {
  if (saleNumbers.has(s.sale_number)) {
    errors.push(`Duplicate sale_number found: ${s.sale_number}`)
    break
  }
  saleNumbers.add(s.sale_number)
}

// 4. No duplicate SKUs
const skus = new Set()
for (const p of products) {
  if (skus.has(p.sku)) {
    errors.push(`Duplicate SKU found: ${p.sku}`)
    break
  }
  skus.add(p.sku)
}

// 5. No duplicate barcodes
const barcodes = new Set()
for (const p of products) {
  if (barcodes.has(p.barcode)) {
    errors.push(`Duplicate barcode found: ${p.barcode}`)
    break
  }
  barcodes.add(p.barcode)
}

// 6. All utang sales belong to customers
const customerIdSet = new Set(customers.map((c) => c.id))
const invalidUtangSales = sales.filter(
  (s) =>
    s.payment_method === 'utang' &&
    (!s.customer_id || !customerIdSet.has(s.customer_id)),
)
if (invalidUtangSales.length > 0) {
  errors.push(
    `Found ${invalidUtangSales.length} utang sales without a valid customer_id: IDs ${invalidUtangSales.map((s) => s.id).join(', ')}`,
  )
}

if (errors.length > 0) {
  console.error('\n❌ FAIL: The following assertions failed:')
  errors.forEach((e) => console.error(` - ${e}`))
  process.exit(1)
}

console.log('\n✅ All assertions passed successfully!')
process.exit(0)
