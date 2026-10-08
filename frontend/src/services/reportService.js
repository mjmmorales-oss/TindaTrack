/**
 * Future Laravel Endpoints:
 * - GET /api/reports/sales              -> ReportController@sales
 * - GET /api/reports/best-sellers       -> ReportController@bestSellers
 * - GET /api/reports/category-breakdown -> ReportController@categoryBreakdown
 */

import { useMockDb } from '../mocks/db.js'
import { delay } from '../lib/mockApi.js'

function toMoney(n) {
  return Math.round(n * 100) / 100
}

export const reportService = {
  /**
   * Retrieves sales over time aggregated by day, week, or month.
   * Future: GET /api/reports/sales
   */
  async sales(params = {}) {
    await delay()
    const { from, to, granularity = 'daily' } = params
    const { sales } = useMockDb.getState()

    let filtered = sales.filter((s) => s.status === 'completed')

    if (from) {
      const fromTime = new Date(from).getTime()
      filtered = filtered.filter((s) => new Date(s.created_at).getTime() >= fromTime)
    }

    if (to) {
      const toTime = new Date(to).getTime()
      filtered = filtered.filter((s) => new Date(s.created_at).getTime() <= toTime)
    }

    const groups = {}
    let totalSales = 0
    let totalProfit = 0
    let totalCash = 0
    let totalUtang = 0

    for (const s of filtered) {
      const d = new Date(s.created_at)
      let key = d.toISOString().slice(0, 10) // default daily: YYYY-MM-DD

      if (granularity === 'weekly') {
        const startOfWeek = new Date(d)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
        startOfWeek.setDate(diff)
        key = `Wk ${startOfWeek.toISOString().slice(5, 10)}`
      } else if (granularity === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }

      if (!groups[key]) {
        groups[key] = {
          period: key,
          sales: 0,
          cost: 0,
          gross_profit: 0,
          cash: 0,
          utang: 0,
          transactions: 0,
        }
      }

      let saleCost = 0
      for (const item of s.items) {
        saleCost += item.quantity * item.unit_cost
      }

      groups[key].sales = toMoney(groups[key].sales + s.total_amount)
      groups[key].cost = toMoney(groups[key].cost + saleCost)
      groups[key].gross_profit = toMoney(groups[key].gross_profit + (s.total_amount - saleCost))
      groups[key].transactions++

      if (s.payment_type === 'cash') {
        groups[key].cash = toMoney(groups[key].cash + s.total_amount)
        totalCash = toMoney(totalCash + s.total_amount)
      } else {
        groups[key].utang = toMoney(groups[key].utang + s.total_amount)
        totalUtang = toMoney(totalUtang + s.total_amount)
      }

      totalSales = toMoney(totalSales + s.total_amount)
      totalProfit = toMoney(totalProfit + (s.total_amount - saleCost))
    }

    const series = Object.values(groups).sort((a, b) => a.period.localeCompare(b.period))

    return {
      data: {
        summary: {
          total_sales: totalSales,
          total_gross_profit: totalProfit,
          profit_margin: totalSales > 0 ? toMoney((totalProfit / totalSales) * 100) : 0,
          total_transactions: filtered.length,
          total_cash: totalCash,
          total_utang: totalUtang,
        },
        series,
      },
    }
  },

  /**
   * Retrieves best-selling items sorted by total quantity sold.
   * Future: GET /api/reports/best-sellers
   */
  async bestSellers(params = {}) {
    await delay()
    const { from, to, limit = 10 } = params
    const { sales, products, categories } = useMockDb.getState()

    let filtered = sales.filter((s) => s.status === 'completed')
    if (from) {
      filtered = filtered.filter((s) => new Date(s.created_at).getTime() >= new Date(from).getTime())
    }
    if (to) {
      filtered = filtered.filter((s) => new Date(s.created_at).getTime() <= new Date(to).getTime())
    }

    const itemMap = {}
    for (const s of filtered) {
      for (const item of s.items) {
        if (!itemMap[item.product_id]) {
          const prod = products.find((p) => p.id === item.product_id)
          const cat = prod ? categories.find((c) => c.id === prod.category_id) : null
          itemMap[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            sku: prod?.sku || '',
            category_name: cat?.name || 'Uncategorized',
            quantity_sold: 0,
            revenue: 0,
            cost: 0,
            gross_profit: 0,
          }
        }

        const rev = item.subtotal
        const cost = item.quantity * item.unit_cost
        itemMap[item.product_id].quantity_sold += item.quantity
        itemMap[item.product_id].revenue = toMoney(itemMap[item.product_id].revenue + rev)
        itemMap[item.product_id].cost = toMoney(itemMap[item.product_id].cost + cost)
        itemMap[item.product_id].gross_profit = toMoney(
          itemMap[item.product_id].gross_profit + (rev - cost),
        )
      }
    }

    const ranked = Object.values(itemMap)
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, Number(limit))

    return { data: ranked }
  },

  /**
   * Retrieves sales revenue breakdown by category.
   * Future: GET /api/reports/category-breakdown
   */
  async categoryBreakdown(params = {}) {
    await delay()
    const { from, to } = params
    const { sales, products, categories } = useMockDb.getState()

    let filtered = sales.filter((s) => s.status === 'completed')
    if (from) {
      filtered = filtered.filter((s) => new Date(s.created_at).getTime() >= new Date(from).getTime())
    }
    if (to) {
      filtered = filtered.filter((s) => new Date(s.created_at).getTime() <= new Date(to).getTime())
    }

    const catMap = {}
    categories.forEach((cat) => {
      catMap[cat.id] = {
        category_id: cat.id,
        category_name: cat.name,
        color: cat.color,
        revenue: 0,
        items_sold: 0,
      }
    })

    let grandRevenue = 0
    for (const s of filtered) {
      for (const item of s.items) {
        const prod = products.find((p) => p.id === item.product_id)
        if (prod && catMap[prod.category_id]) {
          catMap[prod.category_id].revenue = toMoney(
            catMap[prod.category_id].revenue + item.subtotal,
          )
          catMap[prod.category_id].items_sold += item.quantity
          grandRevenue = toMoney(grandRevenue + item.subtotal)
        }
      }
    }

    const breakdown = Object.values(catMap)
      .map((c) => ({
        ...c,
        percentage: grandRevenue > 0 ? toMoney((c.revenue / grandRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return {
      data: {
        total_revenue: grandRevenue,
        categories: breakdown,
      },
    }
  },

  /**
   * Retrieves hourly sales and transaction distribution (0-23 hours).
   * Future: GET /api/reports/hourly
   */
  async hourly(params = {}) {
    await delay()
    const { from, to } = params
    const { sales } = useMockDb.getState()

    let filtered = sales.filter((s) => s.status === 'completed')
    if (from) {
      filtered = filtered.filter(
        (s) => new Date(s.created_at).getTime() >= new Date(from).getTime(),
      )
    }
    if (to) {
      filtered = filtered.filter(
        (s) => new Date(s.created_at).getTime() <= new Date(to).getTime(),
      )
    }

    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label:
        i === 0
          ? '12 AM'
          : i < 12
            ? `${i} AM`
            : i === 12
              ? '12 PM'
              : `${i - 12} PM`,
      sales: 0,
      transactions: 0,
    }))

    for (const s of filtered) {
      const h = new Date(s.created_at).getHours()
      hours[h].sales = toMoney(hours[h].sales + s.total_amount)
      hours[h].transactions++
    }

    return { data: hours }
  },
}

export default reportService
