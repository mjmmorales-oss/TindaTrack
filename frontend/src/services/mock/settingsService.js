/**
 * Future Laravel Endpoint:
 * - GET/PUT /api/settings -> SettingsController
 */

import { useMockDb } from '../../mocks/db.js'
import { delay } from '../../lib/mockApi.js'

export const settingsService = {
  /**
   * Retrieves store profile and receipt settings.
   * Future: GET /api/settings
   */
  async get() {
    await delay()
    return { data: useMockDb.getState().settings }
  },

  /**
   * Updates store settings.
   * Future: PUT /api/settings
   */
  async update(data = {}) {
    await delay()
    const state = useMockDb.getState()
    const updated = {
      ...state.settings,
      ...data,
      updated_at: new Date().toISOString(),
    }
    state.setSettings(updated)
    return { data: updated }
  },

  /**
   * Resets mock database back to fresh demo seed data.
   */
  async resetDemoData() {
    await delay(600)
    const fresh = useMockDb.getState().resetDemoData()
    return {
      message: 'Matagumpay na naibalik ang demo data sa orihinal na estado.',
      data: fresh,
    }
  },
}

export default settingsService
