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
      message: 'Demo data has been restored to default.',
      data: fresh,
    }
  },

  /**
   * Restores demo product packshots for products without images.
   */
  async restoreDemoImages() {
    await delay(300)
    const state = useMockDb.getState()
    const { initialProducts } = await import('../../mocks/data/products.js')
    const demoMap = new Map(
      initialProducts
        .filter((p) => p.sku && p.image_url)
        .map((p) => [String(p.sku).toUpperCase(), p.image_url]),
    )
    let updated = 0
    const nextProducts = state.products.map((p) => {
      if (!p.image_url && demoMap.has(String(p.sku).toUpperCase())) {
        updated++
        return { ...p, image_url: demoMap.get(String(p.sku).toUpperCase()) }
      }
      return p
    })
    state.setProducts(nextProducts)
    return {
      updated,
      message: `Restored ${updated} demo product images.`,
    }
  },
}

export default settingsService
