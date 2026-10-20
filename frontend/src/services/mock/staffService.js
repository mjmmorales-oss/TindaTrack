/**
 * Future Laravel Endpoint:
 * - GET/POST /api/users -> UserController
 * - PUT /api/users/{id}
 * - PATCH /api/users/{id}/toggle-active
 * - POST /api/users/{id}/reset-password
 * - POST /api/users/{id}/revoke-sessions
 * - DELETE /api/users/{id}
 * - POST /api/users/{id}/restore
 */

import { useMockDb } from '../../mocks/db.js'
import { delay, ApiError } from '../../lib/mockApi.js'

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem('tindatrack_user')
    if (raw) {
      const u = JSON.parse(raw)
      if (u?.id) return Number(u.id)
    }
  } catch {
    // fallback
  }
  return 1 // Default to owner
}

function generateRandomPassword(length = 10) {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%'
  let result = ''
  result += letters.charAt(Math.floor(Math.random() * letters.length))
  result += digits.charAt(Math.floor(Math.random() * digits.length))
  result += symbols.charAt(Math.floor(Math.random() * symbols.length))
  const allChars = letters + digits + symbols
  for (let i = 3; i < length; i++) {
    result += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }
  return result
}

export const staffService = {
  /**
   * Retrieves staff users filtered by status and search.
   * Statuses: 'active', 'inactive', 'archived', 'all'
   */
  async list(params = {}) {
    await delay()
    const { status = 'active', search = '' } = params
    const state = useMockDb.getState()
    const sales = state.sales || []
    const today = new Date().toISOString().slice(0, 10)

    let list = [...(state.staff || [])]

    // Status filter
    if (status === 'active') {
      list = list.filter((u) => u.is_active && !u.deleted_at)
    } else if (status === 'inactive') {
      list = list.filter((u) => !u.is_active && !u.deleted_at)
    } else if (status === 'archived') {
      list = list.filter((u) => Boolean(u.deleted_at))
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q),
      )
    }

    // Attach aggregates (sales_count, sales_total_today)
    const withMetrics = list.map((user) => {
      const userSales = sales.filter(
        (s) => (s.user_id === user.id || s.cashier_id === user.id) && s.status === 'completed',
      )
      const salesCount = userSales.length
      const salesToday = userSales
        .filter((s) => s.created_at && s.created_at.slice(0, 10) === today)
        .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0)

      return {
        ...user,
        phone: user.phone || null,
        must_change_password: Boolean(user.must_change_password),
        sales_count: salesCount,
        sales_total_today: salesToday,
      }
    })

    return { data: withMetrics }
  },

  /**
   * Retrieves single staff user.
   */
  async get(id) {
    await delay()
    const staffId = Number(id)
    const state = useMockDb.getState()
    const user = state.staff.find((u) => u.id === staffId)
    if (!user) {
      throw new ApiError(404, 'User not found.')
    }
    return { data: user }
  },

  /**
   * Creates a new cashier user.
   */
  async create(data) {
    await delay()
    const errors = {}

    if (!data.name?.trim()) errors.name = ['The name field is required.']
    if (!data.email?.trim()) errors.email = ['The email field is required.']

    const state = useMockDb.getState()
    const activeWithEmail = state.staff.some(
      (u) => !u.deleted_at && u.email.toLowerCase() === data.email?.trim().toLowerCase(),
    )
    if (activeWithEmail) {
      errors.email = ['The email has already been taken.']
    }

    if (data.role && data.role !== 'cashier') {
      errors.role = ['Only cashier role can be created.']
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The given data was invalid.', errors })
    }

    const tempPassword = data.password?.trim() ? data.password.trim() : generateRandomPassword(10)
    const nextId = Math.max(...state.staff.map((u) => u.id), 0) + 1

    const newStaff = {
      id: nextId,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || null,
      role: 'cashier',
      is_active: true,
      must_change_password: true,
      deleted_at: null,
      last_login_at: null,
      created_at: new Date().toISOString(),
    }

    state.setStaff((prev) => [...prev, newStaff])

    return {
      data: newStaff,
      // Same key as Laravel UserController (store / resetPassword)
      temporary_password: data.password?.trim() ? null : tempPassword,
    }
  },

  /**
   * Updates staff profile (name, email, phone).
   */
  async update(id, data) {
    await delay()
    const staffId = Number(id)
    const state = useMockDb.getState()
    const user = state.staff.find((u) => u.id === staffId)

    if (!user) {
      throw new ApiError(404, 'User not found.')
    }

    const errors = {}
    if (!data.name?.trim()) errors.name = ['The name field is required.']
    if (!data.email?.trim()) errors.email = ['The email field is required.']

    const emailInUse = state.staff.some(
      (u) =>
        u.id !== staffId &&
        !u.deleted_at &&
        u.email.toLowerCase() === data.email?.trim().toLowerCase(),
    )
    if (emailInUse) {
      errors.email = ['The email has already been taken.']
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The given data was invalid.', errors })
    }

    const updated = {
      ...user,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || null,
    }

    state.setStaff((prev) => prev.map((u) => (u.id === staffId ? updated : u)))
    return { data: updated }
  },

  /**
   * Toggles staff member active/inactive status.
   */
  async toggleActive(id) {
    await delay()
    const staffId = Number(id)
    const currentUserId = getCurrentUserId()
    const state = useMockDb.getState()
    const user = state.staff.find((u) => u.id === staffId)

    if (!user) {
      throw new ApiError(404, 'User not found.')
    }

    if (user.id === currentUserId) {
      const err = new ApiError(422, { message: 'You cannot deactivate your own account.' })
      err.error_code = 'self_action'
      throw err
    }

    if (user.role === 'owner' && user.is_active) {
      const activeOwners = state.staff.filter((u) => u.role === 'owner' && u.is_active && !u.deleted_at)
      if (activeOwners.length <= 1) {
        const err = new ApiError(422, { message: 'Cannot deactivate the last active owner.' })
        err.error_code = 'last_owner'
        throw err
      }
    }

    const updated = {
      ...user,
      is_active: !user.is_active,
    }

    state.setStaff((prev) => prev.map((u) => (u.id === staffId ? updated : u)))
    return { data: updated }
  },

  /**
   * Resets staff password and sets must_change_password=true.
   */
  async resetPassword(id, data = {}) {
    await delay()
    const staffId = Number(id)
    const currentUserId = getCurrentUserId()
    const state = useMockDb.getState()
    const user = state.staff.find((u) => u.id === staffId)

    if (!user) {
      throw new ApiError(404, 'User not found.')
    }

    if (user.id === currentUserId) {
      const err = new ApiError(422, {
        message: 'Cannot reset your own password via staff management. Use account settings.',
      })
      err.error_code = 'self_action'
      throw err
    }

    if (user.role === 'owner') {
      const err = new ApiError(422, { message: 'Cannot reset another owner’s password.' })
      err.error_code = 'owner_protected'
      throw err
    }

    const tempPassword = data.password?.trim() ? data.password.trim() : generateRandomPassword(10)
    const updated = {
      ...user,
      must_change_password: true,
    }

    state.setStaff((prev) => prev.map((u) => (u.id === staffId ? updated : u)))
    return {
      message: 'Password reset successfully.',
      data: updated,
      // Same key as Laravel UserController (store / resetPassword)
      temporary_password: data.password?.trim() ? null : tempPassword,
    }
  },

  /**
   * Revokes all active sessions for a staff member.
   */
  async revokeSessions(id) {
    await delay()
    const staffId = Number(id)
    const state = useMockDb.getState()
    const user = state.staff.find((u) => u.id === staffId)

    if (!user) {
      throw new ApiError(404, 'User not found.')
    }

    return {
      message: 'All active sessions and paired scanner devices have been revoked.',
    }
  },

  /**
   * Soft-deletes (archives) a staff member.
   */
  async archive(id) {
    await delay()
    const staffId = Number(id)
    const currentUserId = getCurrentUserId()
    const state = useMockDb.getState()
    const user = state.staff.find((u) => u.id === staffId)

    if (!user) {
      throw new ApiError(404, 'User not found.')
    }

    if (user.id === currentUserId) {
      const err = new ApiError(422, { message: 'You cannot archive your own account.' })
      err.error_code = 'self_action'
      throw err
    }

    if (user.role === 'owner') {
      const err = new ApiError(422, { message: 'Store owners cannot be archived.' })
      err.error_code = 'owner_protected'
      throw err
    }

    const updated = {
      ...user,
      is_active: false,
      deleted_at: new Date().toISOString(),
    }

    state.setStaff((prev) => prev.map((u) => (u.id === staffId ? updated : u)))
    return {
      message: 'Staff member archived successfully.',
      data: updated,
    }
  },

  /**
   * Restores a soft-deleted staff member.
   */
  async restore(id) {
    await delay()
    const staffId = Number(id)
    const state = useMockDb.getState()
    const user = state.staff.find((u) => u.id === staffId)

    if (!user) {
      throw new ApiError(404, 'User not found.')
    }

    // Check if email taken by active/inactive non-deleted user
    const emailConflict = state.staff.some(
      (u) =>
        u.id !== staffId &&
        !u.deleted_at &&
        u.email.toLowerCase() === user.email.toLowerCase(),
    )

    if (emailConflict) {
      const err = new ApiError(422, {
        message: 'Cannot restore: an active user already has this email address.',
      })
      err.error_code = 'email_taken'
      throw err
    }

    const updated = {
      ...user,
      deleted_at: null,
      is_active: true,
    }

    state.setStaff((prev) => prev.map((u) => (u.id === staffId ? updated : u)))
    return {
      message: 'Staff member restored successfully.',
      data: updated,
    }
  },
}

export default staffService
