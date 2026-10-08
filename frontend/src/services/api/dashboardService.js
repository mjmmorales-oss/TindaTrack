import { apiClient } from './apiClient.js'

export const dashboardService = {
  /**
   * Retrieves dashboard metrics tailored to the authenticated role.
   * GET /api/dashboard
   */
  async get(params = {}) {
    return apiClient.get('/dashboard', params)
  },
}

export default dashboardService
