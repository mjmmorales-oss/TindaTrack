/**
 * Future Laravel Endpoints:
 * - GET    /api/utang/summary          -> UtangController@summary
 * - GET    /api/utang/debtors          -> UtangController@debtors
 * - POST   /api/utang-payments         -> UtangPaymentController@store
 */

import { useMockDb } from '../../mocks/db.js'
import { delay, ApiError, paginate, applySearch, applySort } from '../../lib/mockApi.js'
import { getCurrentUser } from '../../lib/authBridge.js'

function toMoney(n) {
  return Math.round(n * 100) / 100
}

export const utangService = {
  /**
   * Retrieves summary statistics, aging buckets, and collection totals.
   * Future: GET /api/utang/summary
   */
  async summary() {
    await delay()
    const { customers, sales, utangPayments } = useMockDb.getState()

    const debtors = customers.filter((c) => c.credit_balance > 0)
    const totalOutstanding = toMoney(
      debtors.reduce((acc, c) => acc + c.credit_balance, 0),
    )

    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 3600000

    // Collected this week
    const collectedThisWeek = toMoney(
      utangPayments
        .filter((p) => new Date(p.payment_date).getTime() >= sevenDaysAgo)
        .reduce((acc, p) => acc + p.amount, 0),
    )

    // Overdue (> 30 days since oldest unpaid sale)
    let overdueCount = 0
    const aging = {
      '0_7': 0,
      '8_30': 0,
      '31_60': 0,
      '60_plus': 0,
    }

    for (const d of debtors) {
      // Find oldest utang sale for this customer
      const custSales = sales
        .filter(
          (s) =>
            s.customer_id === d.id &&
            s.payment_type === 'utang' &&
            s.status === 'completed',
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      const oldestDate = custSales.length > 0 ? new Date(custSales[0].created_at).getTime() : now
      const ageInDays = Math.floor((now - oldestDate) / (24 * 3600000))

      if (ageInDays > 30) {
        overdueCount++
      }

      if (ageInDays <= 7) {
        aging['0_7'] = toMoney(aging['0_7'] + d.credit_balance)
      } else if (ageInDays <= 30) {
        aging['8_30'] = toMoney(aging['8_30'] + d.credit_balance)
      } else if (ageInDays <= 60) {
        aging['31_60'] = toMoney(aging['31_60'] + d.credit_balance)
      } else {
        aging['60_plus'] = toMoney(aging['60_plus'] + d.credit_balance)
      }
    }

    return {
      data: {
        total_outstanding: totalOutstanding,
        debtors_count: debtors.length,
        collected_this_week: collectedThisWeek,
        overdue_count: overdueCount,
        aging_buckets: aging,
      },
    }
  },

  /**
   * Retrieves list of active debtors with their balance and limit usage.
   * Future: GET /api/utang/debtors
   */
  async debtors(params = {}) {
    await delay()
    const { q = '', page = 1, per_page = 15, sort = '-credit_balance' } = params

    const state = useMockDb.getState()
    const now = Date.now()
    let items = state.customers
      .filter((c) => c.credit_balance > 0)
      .map((c) => {
        const custSales = state.sales
          .filter(
            (s) =>
              s.customer_id === c.id &&
              s.payment_type === 'utang' &&
              s.status === 'completed',
          )
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        const oldestDate = custSales.length > 0 ? custSales[0].created_at : c.created_at
        const ageInDays = Math.floor((now - new Date(oldestDate).getTime()) / (24 * 3600000))

        return {
          ...c,
          utilization_rate:
            c.credit_limit > 0 ? toMoney((c.credit_balance / c.credit_limit) * 100) : 100,
          is_over_limit: c.credit_balance > c.credit_limit,
          oldest_debt_date: oldestDate,
          days_overdue: Math.max(0, ageInDays),
        }
      })

    items = applySearch(items, q, ['name', 'nickname', 'contact_number'])
    items = applySort(items, sort)

    return paginate(items, page, per_page)
  },

  /**
   * Records a payment against customer's outstanding utang balance.
   * Future: POST /api/utang-payments
   */
  async recordPayment(customerId, data = {}) {
    await delay()
    const currentUser = getCurrentUser()
    const custId = Number(customerId)
    const state = useMockDb.getState()
    const customer = state.customers.find((c) => c.id === custId)

    if (!customer) {
      throw new ApiError(404, 'Customer not found.')
    }

    const amount = Number(data.amount || 0)
    if (isNaN(amount) || amount <= 0) {
      throw new ApiError(422, {
        message: 'Invalid payment amount.',
        errors: { amount: ['Ilagay ang wastong halaga ng ibabayad.'] },
      })
    }

    // Business rule: payment <= current balance
    if (amount > customer.credit_balance) {
      throw new ApiError(422, {
        message: 'Payment exceeds outstanding balance.',
        errors: {
          amount: [
            `Hindi maaaring lumampas ang bayad sa kasalukuyang utang na ₱${customer.credit_balance.toFixed(2)}.`,
          ],
        },
      })
    }

    const paymentAmount = toMoney(amount)
    const newBalance = toMoney(customer.credit_balance - paymentAmount)
    const paymentId = state.nextIds.payment++
    const nowIso = data.payment_date || new Date().toISOString()

    const newPayment = {
      id: paymentId,
      customer_id: custId,
      sale_id: data.sale_id ? Number(data.sale_id) : null,
      amount: paymentAmount,
      payment_date: nowIso,
      notes: data.notes?.trim() || 'Bayad sa tindahan',
      recorded_by: currentUser.id,
    }

    // Update customer balance and log payment
    state.setCustomers((prev) =>
      prev.map((c) => (c.id === custId ? { ...c, credit_balance: newBalance } : c)),
    )
    state.setUtangPayments((prev) => [newPayment, ...prev])

    return {
      data: {
        payment: newPayment,
        new_balance: newBalance,
      },
    }
  },
}

export default utangService
