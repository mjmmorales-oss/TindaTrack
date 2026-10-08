import { apiClient } from './apiClient.js'

export const staffService = {
  /**
   * Retrieves all staff users.
   * GET /api/users
   */
  async list() {
    return apiClient.get('/users')
  },

  /**
   * Creates a new cashier user.
   * POST /api/users
   */
  async create(data) {
    return apiClient.post('/users', data)
  },

  /**
   * Toggles staff member active/inactive status.
   * PATCH /api/users/{id}/toggle-active
   */
  async toggleActive(id) {
    return apiClient.patch(`/users/${id}/toggle-active`)
  },
}

export default staffService
