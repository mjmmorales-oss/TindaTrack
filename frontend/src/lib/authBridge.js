/**
 * Lightweight bridge to retrieve current user details and role for mock services.
 */
export function getCurrentUser() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('tindatrack_user')
      if (raw) {
        return JSON.parse(raw)
      }
    }
  } catch {
    // ignore
  }

  // Default fallback is owner for demo/testing
  return {
    id: 1,
    name: 'Nena Dela Cruz',
    email: 'owner@tindatrack.test',
    role: 'owner',
    is_active: true,
  }
}

/**
 * Returns current user role ('owner' | 'cashier').
 * @returns {'owner' | 'cashier'}
 */
export function getCurrentUserRole() {
  return getCurrentUser()?.role || 'owner'
}
