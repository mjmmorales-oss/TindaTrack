import { apiClient } from './apiClient.js'

export const staffService = {
  /**
   * Retrieves all staff users with optional status and search filtering.
   * GET /api/users
   */
  async list(params = {}) {
    return apiClient.get('/users', { params })
  },

  /**
   * Retrieves a single staff user by ID.
   * GET /api/users/{id}
   */
  async get(id) {
    return apiClient.get(`/users/${id}`)
  },

  /**
   * Creates a new cashier user.
   * POST /api/users
   */
  async create(data) {
    return apiClient.post('/users', data)
  },

  /**
   * Updates an existing staff user.
   * PUT /api/users/{id}
   */
  async update(id, data) {
    return apiClient.put(`/users/${id}`, data)
  },

  /**
   * Toggles staff member active/inactive status.
   * PATCH /api/users/{id}/toggle-active
   */
  async toggleActive(id) {
    return apiClient.patch(`/users/${id}/toggle-active`)
  },

  /**
   * Resets a staff member's password.
   * POST /api/users/{id}/reset-password
   */
  async resetPassword(id, data = {}) {
    return apiClient.post(`/users/${id}/reset-password`, data)
  },

  /**
   * Revokes all active tokens and scanner sessions for a staff member.
   * POST /api/users/{id}/revoke-sessions
   */
  async revokeSessions(id) {
    return apiClient.post(`/users/${id}/revoke-sessions`)
  },

  /**
   * Soft-deletes (archives) a staff member.
   * DELETE /api/users/{id}
   */
  async archive(id) {
    return apiClient.delete(`/users/${id}`)
  },

  /**
   * Restores a soft-deleted (archived) staff member.
   * POST /api/users/{id}/restore
   */
  async restore(id) {
    return apiClient.post(`/users/${id}/restore`)
  },
}

export default staffService
