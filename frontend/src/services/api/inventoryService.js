import { apiClient } from './apiClient.js'

export const inventoryService = {
  /**
   * Retrieves high-level inventory KPIs (total valuation, out-of-stock count, etc.).
   * GET /api/inventory/overview
   */
  async overview() {
    return apiClient.get('/inventory/overview')
  },

  /**
   * Retrieves paginated stock movements audit trail.
   * GET /api/inventory/movements
   */
  async movements(params = {}) {
    return apiClient.get('/inventory/movements', params)
  },

  /**
   * Retrieves restock recommendation list for low-stock products.
   * GET /api/inventory/restock-list
   */
  async restockList() {
    return apiClient.get('/inventory/restock-list')
  },
}

export default inventoryService
