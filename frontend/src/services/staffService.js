/**
 * Future Laravel Endpoint:
 * - GET/POST /api/users -> UserController
 */

import { useMockDb } from '../mocks/db.js'
import { delay, ApiError } from '../lib/mockApi.js'

export const staffService = {
  /**
   * Retrieves all staff users.
   * Future: GET /api/users
   */
  async list() {
    await delay()
    return { data: useMockDb.getState().staff }
  },

  /**
   * Scaffolds creating a new staff member.
   * Future: POST /api/users
   */
  async create(data) {
    await delay()
    const errors = {}

    if (!data.name?.trim()) errors.name = ['The name field is required.']
    if (!data.email?.trim()) errors.email = ['The email field is required.']

    const state = useMockDb.getState()
    if (state.staff.some((u) => u.email.toLowerCase() === data.email?.trim().toLowerCase())) {
      errors.email = ['The email has already been taken.']
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The given data was invalid.', errors })
    }

    const nextId = Math.max(...state.staff.map((u) => u.id), 0) + 1
    const newStaff = {
      id: nextId,
      name: data.name.trim(),
      email: data.email.trim(),
      role: data.role || 'cashier',
      is_active: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }

    state.setStaff((prev) => [...prev, newStaff])
    return { data: newStaff }
  },

  /**
   * Toggles staff member active/inactive status.
   * Future: PATCH /api/users/{id}/toggle-active
   */
  async toggleActive(id) {
    await delay()
    const staffId = Number(id)
    const state = useMockDb.getState()
    const user = state.staff.find((u) => u.id === staffId)

    if (!user) {
      throw new ApiError(404, 'User not found.')
    }

    const updated = {
      ...user,
      is_active: !user.is_active,
    }

    state.setStaff((prev) => prev.map((u) => (u.id === staffId ? updated : u)))
    return { data: updated }
  },
}

export default staffService
