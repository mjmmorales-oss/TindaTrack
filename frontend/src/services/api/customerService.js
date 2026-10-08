import { apiClient } from './apiClient.js'

export const customerService = {
  /**
   * Retrieves paginated customers with optional search, suki filter, and sorting.
   * GET /api/customers
   */
  async list(params = {}) {
    return apiClient.get('/customers', params)
  },

  /**
   * Retrieves a single customer by ID.
   * GET /api/customers/{id}
   */
  async get(id) {
    return apiClient.get(`/customers/${id}`)
  },

  /**
   * Creates a new customer.
   * POST /api/customers
   */
  async create(data) {
    return apiClient.post('/customers', data)
  },

  /**
   * Updates an existing customer.
   * PUT /api/customers/{id}
   */
  async update(id, data) {
    return apiClient.put(`/customers/${id}`, data)
  },

  /**
   * Deletes a customer. Blocked if customer has active utang balance.
   * DELETE /api/customers/{id}
   */
  async remove(id) {
    return apiClient.delete(`/customers/${id}`)
  },

  /**
   * Retrieves complete ledger history (utang sales + payments) with running balance.
   * GET /api/customers/{id}/ledger
   */
  async ledger(id) {
    return apiClient.get(`/customers/${id}/ledger`)
  },
}

export default customerService
