/**
 * Future Laravel Endpoints:
 * - GET    /api/inventory/overview     -> InventoryController@overview
 * - GET    /api/inventory/movements    -> InventoryController@movements
 * - GET    /api/inventory/restock-list -> InventoryController@restockList
 */

import { useMockDb } from '../../mocks/db.js'
import { delay, paginate, applySearch, applySort } from '../../lib/mockApi.js'

function toMoney(n) {
  return Math.round(n * 100) / 100
}

export const inventoryService = {
  /**
   * Retrieves summary counts and inventory valuation (cost vs retail).
   * Future: GET /api/inventory/overview
   */
  async overview() {
    await delay()
    const { products } = useMockDb.getState()

    let inStockCount = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let totalCostVal = 0
    let totalRetailVal = 0

    for (const p of products) {
      if (!p.is_active) continue

      if (p.stock_quantity <= 0) {
        outOfStockCount++
      } else if (p.stock_quantity <= p.reorder_level) {
        lowStockCount++
      } else {
        inStockCount++
      }

      totalCostVal = toMoney(totalCostVal + p.stock_quantity * p.cost_price)
      totalRetailVal = toMoney(totalRetailVal + p.stock_quantity * p.price)
    }

    const estimatedPotentialProfit = toMoney(totalRetailVal - totalCostVal)

    return {
      data: {
        total_products: products.length,
        in_stock_count: inStockCount,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        total_stock_value_cost: totalCostVal,
        total_stock_value_retail: totalRetailVal,
        estimated_potential_profit: estimatedPotentialProfit,
      },
    }
  },

  /**
   * Retrieves paginated stock movement audit trail.
   * Future: GET /api/inventory/movements
   */
  async movements(params = {}) {
    await delay()
    const {
      product_id,
      type, // 'sale'|'void'|'restock'|'damage'|'correction'
      from,
      to,
      page = 1,
      per_page = 20,
      sort = '-created_at',
    } = params

    const { stockMovements, products, staff } = useMockDb.getState()

    let items = stockMovements.map((m) => {
      const prod = products.find((p) => p.id === m.product_id)
      const user = staff.find((u) => u.id === m.user_id)
      return {
        ...m,
        product: prod ? { id: prod.id, name: prod.name, sku: prod.sku } : null,
        user: user ? { id: user.id, name: user.name } : null,
      }
    })

    if (product_id) {
      items = items.filter((m) => String(m.product_id) === String(product_id))
    }

    if (type) {
      items = items.filter((m) => m.type === type)
    }

    if (from) {
      const fromTime = new Date(from).getTime()
      items = items.filter((m) => new Date(m.created_at).getTime() >= fromTime)
    }

    if (to) {
      const toTime = new Date(to).getTime()
      items = items.filter((m) => new Date(m.created_at).getTime() <= toTime)
    }

    items = applySort(items, sort)
    return paginate(items, page, per_page)
  },

  /**
   * Generates a printable restock checklist grouped by category.
   * Suggested quantity formula: (reorder_level * 2) - current_stock.
   * Future: GET /api/inventory/restock-list
   */
  async restockList() {
    await delay()
    const { products, categories } = useMockDb.getState()

    const lowAndOut = products
      .filter((p) => p.is_active && p.stock_quantity <= p.reorder_level)
      .map((p) => {
        const cat = categories.find((c) => c.id === p.category_id)
        const suggested = Math.max(1, p.reorder_level * 2 - p.stock_quantity)
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          category_id: p.category_id,
          category_name: cat ? cat.name : 'Other',
          stock_quantity: p.stock_quantity,
          reorder_level: p.reorder_level,
          suggested_quantity: suggested,
          cost_price: p.cost_price,
          estimated_cost: toMoney(suggested * p.cost_price),
        }
      })

    // Group by category name
    const grouped = {}
    for (const item of lowAndOut) {
      if (!grouped[item.category_name]) {
        grouped[item.category_name] = []
      }
      grouped[item.category_name].push(item)
    }

    return {
      data: {
        total_items: lowAndOut.length,
        items: lowAndOut,
        grouped,
      },
    }
  },
}

export default inventoryService
