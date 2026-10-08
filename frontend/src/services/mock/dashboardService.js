/**
 * Future Laravel Endpoint:
 * - GET /api/dashboard -> DashboardController@index
 */

import { useMockDb } from '../../mocks/db.js'
import { delay } from '../../lib/mockApi.js'
import { getCurrentUser } from '../../lib/authBridge.js'

function toMoney(n) {
  return Math.round(n * 100) / 100
}

export const dashboardService = {
  /**
   * Retrieves dashboard analytics tailored for owner or cashier views.
   * Future: GET /api/dashboard?range=today|7d|30d
   *
   * @param {{ range?: 'today' | '7d' | '30d' }} [params]
   */
  async get(params = {}) {
    await delay()
    const range = params.range || 'today'
    const currentUser = getCurrentUser()
    const { sales, products, customers } = useMockDb.getState()

    const now = new Date()
    const nowTime = now.getTime()

    // Determine time windows
    let rangeDays = 1
    if (range === '7d') rangeDays = 7
    if (range === '30d') rangeDays = 30

    const currentPeriodStart = new Date(nowTime - rangeDays * 24 * 3600000).getTime()
    const previousPeriodStart = new Date(nowTime - rangeDays * 2 * 24 * 3600000).getTime()

    // Filter completed sales for current and previous period
    const completedSales = sales.filter((s) => s.status === 'completed')

    const currentSales = completedSales.filter((s) => {
      const t = new Date(s.created_at).getTime()
      return t >= currentPeriodStart && t <= nowTime
    })

    const previousSales = completedSales.filter((s) => {
      const t = new Date(s.created_at).getTime()
      return t >= previousPeriodStart && t < currentPeriodStart
    })

    // Totals
    const currentSalesTotal = toMoney(currentSales.reduce((acc, s) => acc + s.total_amount, 0))
    const previousSalesTotal = toMoney(previousSales.reduce((acc, s) => acc + s.total_amount, 0))

    // Delta %
    let salesDelta = 0
    if (previousSalesTotal > 0) {
      salesDelta = toMoney(((currentSalesTotal - previousSalesTotal) / previousSalesTotal) * 100)
    }

    const currentTxCount = currentSales.length
    const previousTxCount = previousSales.length
    let txDelta = 0
    if (previousTxCount > 0) {
      txDelta = toMoney(((currentTxCount - previousTxCount) / previousTxCount) * 100)
    }

    // Debtors and utang
    const debtors = customers.filter((c) => c.credit_balance > 0)
    const totalUtang = toMoney(debtors.reduce((acc, c) => acc + c.credit_balance, 0))

    // Stock alerts
    const lowStockProducts = products.filter((p) => p.is_active && p.stock_quantity <= p.reorder_level)
    const outOfStockProducts = products.filter((p) => p.is_active && p.stock_quantity <= 0)

    // Payment mix (Cash vs Utang)
    let cashTotal = 0
    let utangTotal = 0
    for (const s of currentSales) {
      if (s.payment_type === 'cash') {
        cashTotal = toMoney(cashTotal + s.total_amount)
      } else {
        utangTotal = toMoney(utangTotal + s.total_amount)
      }
    }

    // Sales Trend by day
    const trendMap = {}
    const numPoints = range === 'today' ? 7 : rangeDays
    for (let i = numPoints - 1; i >= 0; i--) {
      const d = new Date(nowTime - i * 24 * 3600000)
      const key = d.toISOString().slice(0, 10)
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
      trendMap[key] = {
        date: key,
        label: dayLabel,
        sales: 0,
        cash: 0,
        utang: 0,
        transactions: 0,
      }
    }

    for (const s of currentSales) {
      const key = s.created_at.slice(0, 10)
      if (trendMap[key]) {
        trendMap[key].sales = toMoney(trendMap[key].sales + s.total_amount)
        if (s.payment_type === 'cash') {
          trendMap[key].cash = toMoney(trendMap[key].cash + s.total_amount)
        } else {
          trendMap[key].utang = toMoney(trendMap[key].utang + s.total_amount)
        }
        trendMap[key].transactions++
      }
    }
    const salesTrend = Object.values(trendMap)

    // Top 5 sellers
    const productSalesMap = {}
    for (const s of currentSales) {
      for (const item of s.items) {
        if (!productSalesMap[item.product_id]) {
          productSalesMap[item.product_id] = {
            id: item.product_id,
            name: item.product_name,
            quantity: 0,
            revenue: 0,
          }
        }
        productSalesMap[item.product_id].quantity += item.quantity
        productSalesMap[item.product_id].revenue = toMoney(
          productSalesMap[item.product_id].revenue + item.subtotal,
        )
      }
    }

    const sortedSellers = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity)
    const maxQty = sortedSellers.length > 0 ? sortedSellers[0].quantity : 1
    const topSellers = sortedSellers.slice(0, 5).map((seller, index) => ({
      ...seller,
      rank: index + 1,
      progress: Math.round((seller.quantity / maxQty) * 100),
    }))

    // Running low (5 rows)
    const runningLow = lowStockProducts.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock_quantity: p.stock_quantity,
      reorder_level: p.reorder_level,
      unit: p.unit,
    }))

    // Recent sales (5 rows)
    const recentSales = completedSales.slice(0, 5)

    // Cashier specific stats
    const mySalesToday = completedSales.filter(
      (s) => s.user_id === currentUser.id && s.created_at.slice(0, 10) === now.toISOString().slice(0, 10),
    )
    const mySalesTotal = toMoney(mySalesToday.reduce((acc, s) => acc + s.total_amount, 0))

    return {
      data: {
        range,
        kpis: {
          sales: currentSalesTotal,
          sales_delta: salesDelta,
          transactions: currentTxCount,
          transactions_delta: txDelta,
          outstanding_utang: totalUtang,
          debtors_count: debtors.length,
          low_stock_count: lowStockProducts.length,
          out_of_stock_count: outOfStockProducts.length,
        },
        payment_mix: {
          cash: cashTotal,
          utang: utangTotal,
          cash_percent: currentSalesTotal > 0 ? Math.round((cashTotal / currentSalesTotal) * 100) : 100,
          utang_percent: currentSalesTotal > 0 ? Math.round((utangTotal / currentSalesTotal) * 100) : 0,
        },
        sales_trend: salesTrend,
        top_sellers: topSellers,
        running_low: runningLow,
        recent_sales: recentSales,
        cashier_shift: {
          my_sales_total: mySalesTotal,
          my_transactions_count: mySalesToday.length,
          my_recent_sales: mySalesToday.slice(0, 5),
        },
      },
    }
  },
}

export default dashboardService
