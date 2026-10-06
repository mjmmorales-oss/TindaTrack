import { mulberry32 } from '../../lib/prng.js'
import { initialCategories } from '../data/categories.js'
import { initialProducts } from '../data/products.js'
import { initialCustomers } from '../data/customers.js'
import { initialStaff } from '../data/staff.js'
import { initialSettings } from '../data/settings.js'

/**
 * Rounds money amounts to 2 decimal places to prevent floating point inaccuracies.
 * @param {number} n
 * @returns {number}
 */
export function toMoney(n) {
  return Math.round(n * 100) / 100
}

/**
 * Fast two-digit padding.
 * @param {number} n
 * @returns {string}
 */
const pad2 = (n) => (n < 10 ? '0' + n : String(n))

/**
 * Generates deterministic mock database records:
 * - 90 days of sales with peak hours and weekend boosts (18–40/day)
 * - ~12% utang sales to suki customers
 * - ~2% voided sales with realistic store reasons
 * - Utang payments reconciling customer credit balances
 * - 30 days of stock movements
 *
 * @param {Date} [baseDate=new Date('2026-10-07T12:00:00.000Z')]
 * @param {number} [seed=20261007]
 */
export function generateMockHistory(
  baseDate = new Date('2026-10-07T12:00:00.000Z'),
  seed = 20261007,
) {
  const prng = mulberry32(seed)

  const randomInt = (min, max) => Math.floor(prng() * (max - min + 1)) + min
  const randomChoice = (arr) => arr[Math.floor(prng() * arr.length)]

  // Clone customers and products so we don't mutate originals
  const products = initialProducts.map((p) => ({ ...p }))
  const customers = initialCustomers.map((c) => ({ ...c, credit_balance: 0 }))
  const productMap = new Map(products.map((p) => [p.id, p]))

  const sales = []
  const utangPayments = []
  const stockMovements = []

  let nextSaleId = 1
  let nextPaymentId = 1
  let nextMovementId = 1

  const voidReasons = [
    'Maling item ang napindot ng kahera',
    'Ibinalik ng kustomer (palit item)',
    'Kulang ang dalang pambayad ng bumibili',
    'Dobleng na-punch sa POS',
  ]

  // Track customer debt ledgers for exact balance reconciliation
  // customerId -> { balance: number, lastPaymentDay: number }
  const customerLedgers = {}
  customers.forEach((c) => {
    customerLedgers[c.id] = { balance: 0, lastPaymentDay: -1 }
  })

  // 7 active debtors:
  // - 1 (Maria Santos)
  // - 3 (Ricardo Dalisay)
  // - 5 (Corazon Dizon) -> OVER LIMIT (limit 2000, target ~2150)
  // - 6 (Jonathan Ocampo)
  // - 8 (Marites Garcia) -> DEBT > 30 DAYS OLD (no activity in last 32 days)
  // - 9 (Eduardo Ramos)  -> DEBT > 30 DAYS OLD (no activity in last 32 days)
  // - 11 (Victoria Morales)
  const recentDebtorIds = [1, 3, 5, 6, 11]

  const baseYear = baseDate.getFullYear()
  const baseMonth = baseDate.getMonth()
  const baseDay = baseDate.getDate()

  // Iterate backwards from 89 days ago to 0 (today)
  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const curDate = new Date(baseYear, baseMonth, baseDay - dayOffset)
    const y = curDate.getFullYear()
    const m = pad2(curDate.getMonth() + 1)
    const d = pad2(curDate.getDate())
    const datePrefix = `${y}${m}${d}`
    const isWeekend = curDate.getDay() === 0 || curDate.getDay() === 6

    // Baseline 18–34 sales/day, +20% on weekends -> ~22–40
    let salesCount = randomInt(18, 33)
    if (isWeekend) {
      salesCount = Math.round(salesCount * 1.2)
    }

    let dailySaleSeq = 1

    for (let s = 0; s < salesCount; s++) {
      // Pick hour with peak distribution:
      // Morning peak (6-8 AM), Lunch (11 AM - 1 PM), Evening peak (5-8 PM)
      const peakType = randomInt(1, 10)
      let hour = 14
      if (peakType <= 3) {
        hour = randomInt(6, 8)
      } else if (peakType <= 6) {
        hour = randomInt(11, 13)
      } else if (peakType <= 9) {
        hour = randomInt(17, 20)
      } else {
        hour = randomInt(9, 16)
      }
      const minute = randomInt(0, 59)
      const second = randomInt(0, 59)
      const saleTimestamp = `${y}-${m}-${d}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}.000Z`

      const saleNo = `TT-${datePrefix}-${String(dailySaleSeq++).padStart(4, '0')}`

      // Cashier distribution: Juan (id 2) ~75%, Nena (id 1) ~25%
      const cashierId = prng() < 0.75 ? 2 : 1

      // Pick 1 to 4 items, weighted towards popular (low index items)
      const itemCount = randomInt(1, 4)
      const pickedProducts = new Set()
      const items = []
      let saleTotal = 0

      for (let i = 0; i < itemCount; i++) {
        const pIndex = Math.min(
          products.length - 1,
          Math.floor(Math.pow(prng(), 1.7) * products.length),
        )
        const prod = products[pIndex]

        if (pickedProducts.has(prod.id)) continue
        pickedProducts.add(prod.id)

        const qty = randomInt(1, 3)
        const subtotal = toMoney(prod.price * qty)
        saleTotal = toMoney(saleTotal + subtotal)

        items.push({
          id: i + 1,
          sale_id: nextSaleId,
          product_id: prod.id,
          product_name: prod.name,
          quantity: qty,
          unit_price: prod.price,
          unit_cost: prod.cost_price,
          subtotal,
        })
      }

      if (items.length === 0) continue

      // ~2% voided
      const isVoided = prng() < 0.02
      // ~12% utang (only if not voided)
      const isUtang = !isVoided && prng() < 0.12

      let paymentType = 'cash'
      let customerId = null
      let amountPaid = saleTotal
      let changeAmount = 0
      let status = isVoided ? 'voided' : 'completed'
      let voidReason = undefined
      let voidedBy = undefined
      let voidedAt = undefined

      if (isVoided) {
        voidReason = randomChoice(voidReasons)
        voidedBy = 1 // only owner voids
        const voidMin = Math.min(59, minute + randomInt(5, 30))
        voidedAt = `${y}-${m}-${d}T${pad2(hour)}:${pad2(voidMin)}:${pad2(second)}.000Z`
      } else if (isUtang) {
        paymentType = 'utang'

        // Determine debtor:
        // If older than 33 days ago, customers 8 and 9 can buy on debt.
        // In the last 32 days, customers 8 and 9 do NOT buy on debt (ensuring their debt is > 30 days old).
        let eligibleDebtors
        if (dayOffset >= 33) {
          eligibleDebtors = [8, 9, ...recentDebtorIds]
        } else {
          eligibleDebtors = recentDebtorIds
        }
        customerId = randomChoice(eligibleDebtors)

        // For Cora (id 5), let her purchases grow her debt
        // For others, if projected balance gets close to credit limit, pick another debtor
        const targetCust = customers.find((c) => c.id === customerId)
        if (customerId !== 5 && targetCust) {
          const projected = customerLedgers[customerId].balance + saleTotal
          if (projected > targetCust.credit_limit * 0.85) {
            customerId = 5 // redirect to Cora
          }
        }

        amountPaid = 0.0
        changeAmount = 0.0

        customerLedgers[customerId].balance = toMoney(
          customerLedgers[customerId].balance + saleTotal,
        )
      } else {
        // Cash payment: exact or quick cash bills with change
        if (prng() < 0.4) {
          amountPaid = saleTotal
          changeAmount = 0.0
        } else {
          const quickCash = [20, 50, 100, 200, 500, 1000]
          const bills = quickCash.filter((b) => b >= saleTotal)
          amountPaid = bills.length > 0 ? bills[0] : saleTotal + 50
          changeAmount = toMoney(amountPaid - saleTotal)
        }
      }

      const saleRecord = {
        id: nextSaleId,
        sale_number: saleNo,
        sale_no: saleNo,
        user_id: cashierId,
        customer_id: customerId,
        subtotal: saleTotal,
        total: saleTotal,
        total_amount: saleTotal,
        payment_method: paymentType,
        payment_type: paymentType,
        amount_tendered: amountPaid,
        amount_paid: amountPaid,
        change: changeAmount,
        change_amount: changeAmount,
        status,
        void_reason: voidReason,
        voided_by: voidedBy,
        voided_at: voidedAt,
        created_at: saleTimestamp,
        items,
      }
      nextSaleId++

      sales.push(saleRecord)

      // Stock movements for sales in last 30 days
      if (dayOffset < 30) {
        for (const item of items) {
          const prod = productMap.get(item.product_id)
          const baseStock = prod ? prod.stock_quantity : 15

          stockMovements.push({
            id: nextMovementId++,
            product_id: item.product_id,
            type: 'sale',
            quantity: -item.quantity,
            stock_after: Math.max(0, baseStock + 1),
            reference: saleNo,
            notes: `POS sale ${saleNo}`,
            user_id: cashierId,
            created_at: saleTimestamp,
          })

          if (isVoided) {
            stockMovements.push({
              id: nextMovementId++,
              product_id: item.product_id,
              type: 'void',
              quantity: item.quantity,
              stock_after: Math.max(0, baseStock + 1 + item.quantity),
              reference: saleNo,
              notes: `Voided sale: ${voidReason}`,
              user_id: voidedBy,
              created_at: voidedAt || saleTimestamp,
            })
          }
        }
      }
    }

    // Daily payment check for customers who owe money
    // Debtors 8 & 9 stop paying after dayOffset 33 (so debt is > 30 days old)
    for (const custId of recentDebtorIds) {
      const ledger = customerLedgers[custId]
      if (ledger.balance > 0) {
        const daysSinceLastPayment =
          ledger.lastPaymentDay === -1 ? 999 : ledger.lastPaymentDay - dayOffset

        if (daysSinceLastPayment >= randomInt(3, 7)) {
          // Keep active debtors with an active balance >= 50
          // For Cora (id 5), make sure she stays over 2000 on day 0
          const minResidual = custId === 5 ? 2150 : 50
          const maxPayable = Math.max(0, ledger.balance - minResidual)

          if (maxPayable >= 50) {
            const paymentAmount = toMoney(
              Math.min(maxPayable, randomInt(1, 3) * 100),
            )
            if (paymentAmount > 0) {
              ledger.balance = toMoney(ledger.balance - paymentAmount)
              ledger.lastPaymentDay = dayOffset

              const payHour = randomInt(10, 16)
              const payMin = randomInt(0, 59)
              const paymentTimestamp = `${y}-${m}-${d}T${pad2(payHour)}:${pad2(payMin)}:00.000Z`

              utangPayments.push({
                id: nextPaymentId++,
                customer_id: custId,
                sale_id: null,
                amount: paymentAmount,
                payment_date: paymentTimestamp,
                notes: 'Partial payment sa tindahan',
                recorded_by: 1,
              })
            }
          }
        }
      }
    }

    // Occasional restock movements in last 30 days
    if (dayOffset < 30 && (dayOffset % 6 === 0 || dayOffset === 2)) {
      const restockProducts = [products[0], products[7], products[12], products[23]]
      for (const rp of restockProducts) {
        const restockQty = randomInt(12, 24)
        stockMovements.push({
          id: nextMovementId++,
          product_id: rp.id,
          type: 'restock',
          quantity: restockQty,
          stock_after: rp.stock_quantity + restockQty,
          reference: `DEL-${datePrefix}`,
          notes: 'Regular supplier delivery restock',
          user_id: 1,
          created_at: `${y}-${m}-${d}T08:00:00.000Z`,
        })
      }
    }
  }

  // Ensure Cora (id 5) is strictly over her credit limit (2,000)
  // by topping up her debt on day 0 if needed
  const cora = customers.find((c) => c.id === 5)
  if (cora && customerLedgers[5].balance < 2150) {
    const needed = toMoney(2150 - customerLedgers[5].balance)
    const y = baseYear
    const m = pad2(baseMonth + 1)
    const d = pad2(baseDay)
    const datePrefix = `${y}${m}${d}`
    const topupSaleNo = `TT-${datePrefix}-9999`

    sales.push({
      id: nextSaleId++,
      sale_number: topupSaleNo,
      sale_no: topupSaleNo,
      user_id: 1,
      customer_id: 5,
      subtotal: needed,
      total: needed,
      total_amount: needed,
      payment_method: 'utang',
      payment_type: 'utang',
      amount_tendered: 0.0,
      amount_paid: 0.0,
      change: 0.0,
      change_amount: 0.0,
      status: 'completed',
      created_at: `${y}-${m}-${d}T17:30:00.000Z`,
      items: [
        {
          id: 1,
          sale_id: nextSaleId - 1,
          product_id: 43,
          product_name: 'Well-milled Rice',
          quantity: Math.max(1, Math.round(needed / 50)),
          unit_price: 50.0,
          unit_cost: 44.0,
          subtotal: needed,
        },
      ],
    })
    customerLedgers[5].balance = toMoney(customerLedgers[5].balance + needed)
  }

  // Ensure Marites (8) and Eduardo (9) have non-zero balance
  if (customerLedgers[8].balance === 0) {
    customerLedgers[8].balance = 850.0
    const oldDate = new Date(baseYear, baseMonth, baseDay - 45)
    const y = oldDate.getFullYear()
    const m = pad2(oldDate.getMonth() + 1)
    const d = pad2(oldDate.getDate())
    const oldSaleNo = `TT-${y}${m}${d}-9991`
    sales.push({
      id: nextSaleId++,
      sale_number: oldSaleNo,
      sale_no: oldSaleNo,
      user_id: 1,
      customer_id: 8,
      subtotal: 850.0,
      total: 850.0,
      total_amount: 850.0,
      payment_method: 'utang',
      payment_type: 'utang',
      amount_tendered: 0.0,
      amount_paid: 0.0,
      change: 0.0,
      change_amount: 0.0,
      status: 'completed',
      created_at: `${y}-${m}-${d}T10:00:00.000Z`,
      items: [
        {
          id: 1,
          sale_id: nextSaleId - 1,
          product_id: 43,
          product_name: 'Well-milled Rice',
          quantity: 17,
          unit_price: 50.0,
          unit_cost: 44.0,
          subtotal: 850.0,
        },
      ],
    })
  }

  if (customerLedgers[9].balance === 0) {
    customerLedgers[9].balance = 620.0
    const oldDate = new Date(baseYear, baseMonth, baseDay - 40)
    const y = oldDate.getFullYear()
    const m = pad2(oldDate.getMonth() + 1)
    const d = pad2(oldDate.getDate())
    const oldSaleNo = `TT-${y}${m}${d}-9992`
    sales.push({
      id: nextSaleId++,
      sale_number: oldSaleNo,
      sale_no: oldSaleNo,
      user_id: 1,
      customer_id: 9,
      subtotal: 620.0,
      total: 620.0,
      total_amount: 620.0,
      payment_method: 'utang',
      payment_type: 'utang',
      amount_tendered: 0.0,
      amount_paid: 0.0,
      change: 0.0,
      change_amount: 0.0,
      status: 'completed',
      created_at: `${y}-${m}-${d}T11:00:00.000Z`,
      items: [
        {
          id: 1,
          sale_id: nextSaleId - 1,
          product_id: 34,
          product_name: 'Surf Powder Blossom Fresh',
          quantity: 62,
          unit_price: 10.0,
          unit_cost: 8.5,
          subtotal: 620.0,
        },
      ],
    })
  }

  // Apply computed balances back to customers table
  customers.forEach((c) => {
    c.credit_balance = toMoney(customerLedgers[c.id].balance)
  })

  return {
    settings: initialSettings,
    staff: initialStaff,
    categories: initialCategories,
    products,
    customers,
    sales,
    utangPayments,
    stockMovements,
  }
}
