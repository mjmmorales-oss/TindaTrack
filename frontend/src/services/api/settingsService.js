import { apiClient } from './apiClient.js'

export const settingsService = {
  /**
   * Retrieves store profile and receipt configuration.
   * GET /api/settings
   */
  async get() {
    return apiClient.get('/settings')
  },

  /**
   * Updates store profile and receipt configuration.
   * PUT /api/settings
   */
  async update(data = {}) {
    return apiClient.put('/settings', data)
  },

  /**
   * Reset is only supported in mock mode.
   */
  async resetDemoData() {
    throw new Error('Ang reset ng database ay para lamang sa mock data mode.')
  },
}

export default settingsService
