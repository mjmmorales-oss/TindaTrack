import { apiClient } from './apiClient.js'

export const utangService = {
  /**
   * Retrieves high-level utang portfolio KPI summary.
   * GET /api/utang/summary
   */
  async summary() {
    return apiClient.get('/utang/summary')
  },

  /**
   * Retrieves active debtors with aging metrics and overdue indicators.
   * GET /api/utang/debtors
   */
  async debtors(params = {}) {
    return apiClient.get('/utang/debtors', params)
  },

  /**
   * Records a payment against a customer's utang balance.
   * POST /api/utang-payments
   */
  async recordPayment(customerId, data = {}) {
    return apiClient.post('/utang-payments', {
      customer_id: customerId,
      ...data,
    })
  },
}

export default utangService
