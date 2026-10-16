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
    throw new Error('Database reset is only available in mock data mode.')
  },

  /**
   * Restores demo product packshots for products without images.
   * POST /api/settings/restore-demo-images
   */
  async restoreDemoImages() {
    return apiClient.post('/settings/restore-demo-images')
  },
}

export default settingsService
