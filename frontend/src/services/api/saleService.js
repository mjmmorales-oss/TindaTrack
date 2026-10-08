import { apiClient } from './apiClient.js'

export const saleService = {
  /**
   * Retrieves paginated sales with optional filters (user, customer, payment_type, status, date range).
   * GET /api/sales
   */
  async list(params = {}) {
    return apiClient.get('/sales', params)
  },

  /**
   * Retrieves full sale receipt details by ID.
   * GET /api/sales/{id}
   */
  async get(id) {
    return apiClient.get(`/sales/${id}`)
  },

  /**
   * Creates and completes a POS sale (cash or utang).
   * POST /api/sales
   */
  async create(cartItems = [], payment = {}) {
    return apiClient.post('/sales', {
      items: cartItems,
      ...payment,
    })
  },

  /**
   * Voids an existing sale, reversing stock movements and utang balance.
   * POST /api/sales/{id}/void
   */
  async void(id, reason = '') {
    return apiClient.post(`/sales/${id}/void`, { reason })
  },
}

export default saleService
