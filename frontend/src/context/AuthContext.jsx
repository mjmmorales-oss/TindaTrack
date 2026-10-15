import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, TOKEN_KEY } from '@/lib/api'
import { useCartStore } from '@/stores/cartStore'
import { notify } from '@/lib/notify'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'authenticated' | 'guest'

  const saveSession = useCallback(({ user, token }) => {
    localStorage.setItem(TOKEN_KEY, token)
    if (user) {
      try {
        localStorage.setItem('tindatrack_user', JSON.stringify(user))
      } catch {
        // ignore
      }
    }
    setUser(user)
    setStatus('authenticated')
    return user
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('tindatrack_user')
    localStorage.removeItem('tindatrack-cart-v1')
    localStorage.removeItem('tt_pos_cart')

    // Reset Zustand cart store
    try {
      useCartStore.getState().reset?.()
      useCartStore.persist?.clearStorage?.()
    } catch {
      // ignore
    }

    if (typeof sessionStorage !== 'undefined') {
      const posSessionRaw = sessionStorage.getItem('tt_pos_scanner_session')
      if (posSessionRaw) {
        try {
          const parsed = JSON.parse(posSessionRaw)
          if (parsed?.id) {
            import('@/services/scanner.js').then((m) => m.endScannerSession(parsed.id)).catch(() => {})
          }
        } catch {
          // ignore
        }
      }
      sessionStorage.removeItem('tt_pos_scanner_session')
      sessionStorage.removeItem('tt_scanner_token')
    }
    setUser(null)
    setStatus('guest')
    queryClient?.clear()
  }, [queryClient])

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setStatus('guest')
      return
    }
    api
      .get('/user')
      .then(({ data }) => {
        setUser(data)
        setStatus('authenticated')
      })
      .catch(clearSession)
  }, [clearSession])

  useEffect(() => {
    const handleUnauthorized = (e) => {
      clearSession()
      notify.error(
        'Sesyon Nag-expire (401)',
        e.detail || 'Nag-expire ang iyong sesyon. Mag-sign in muli upang magpatuloy.',
      )
    }

    const handleForbidden = (e) => {
      notify.error(
        'Walang Pahintulot (403)',
        e.detail || 'Bawal ang aksyong ito sa iyong kasalukuyang tungkulin.',
      )
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    window.addEventListener('auth:forbidden', handleForbidden)
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
      window.removeEventListener('auth:forbidden', handleForbidden)
    }
  }, [clearSession])

  const login = useCallback(
    async (credentials) =>
      saveSession((await api.post('/login', credentials)).data),
    [saveSession],
  )

  const register = useCallback(
    async (payload) => saveSession((await api.post('/register', payload)).data),
    [saveSession],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // Ignored: clear session regardless
    } finally {
      clearSession()
    }
  }, [clearSession])

  const forgotPassword = useCallback(
    (email) => api.post('/forgot-password', { email }),
    [],
  )

  const resetPassword = useCallback(
    (payload) => api.post('/reset-password', payload),
    [],
  )

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/user')
      setUser(data)
      try {
        localStorage.setItem('tindatrack_user', JSON.stringify(data))
      } catch {
        // ignore
      }
      return data
    } catch {
      return null
    }
  }, [])

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      try {
        localStorage.setItem('tindatrack_user', JSON.stringify(updated))
      } catch {
        // ignore
      }
      return updated
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      role: user?.role,
      isOwner: user?.role === 'owner',
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      refreshUser,
      updateUser,
    }),
    [user, status, login, register, logout, forgotPassword, resetPassword, refreshUser, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
