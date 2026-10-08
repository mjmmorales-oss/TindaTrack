import { apiClient } from './apiClient.js'

export const reportService = {
  /**
   * Retrieves aggregated sales over time and summary.
   * GET /api/reports/sales
   */
  async sales(params = {}) {
    return apiClient.get('/reports/sales', params)
  },

  /**
   * Retrieves best-selling products by quantity and revenue.
   * GET /api/reports/best-sellers
   */
  async bestSellers(params = {}) {
    return apiClient.get('/reports/best-sellers', params)
  },

  /**
   * Retrieves revenue and volume breakdown by product category.
   * GET /api/reports/category-breakdown
   */
  async categoryBreakdown(params = {}) {
    return apiClient.get('/reports/category-breakdown', params)
  },

  /**
   * Retrieves sales volume distributed across 24 hours of the day.
   * GET /api/reports/hourly
   */
  async hourly(params = {}) {
    return apiClient.get('/reports/hourly', params)
  },
}

export default reportService
