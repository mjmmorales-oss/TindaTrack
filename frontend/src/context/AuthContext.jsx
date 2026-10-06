import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, TOKEN_KEY } from '@/lib/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'authenticated' | 'guest'

  const saveSession = useCallback(({ user, token }) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(user)
    setStatus('authenticated')
    return user
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setStatus('guest')
  }, [])

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
    window.addEventListener('auth:unauthorized', clearSession)
    return () => window.removeEventListener('auth:unauthorized', clearSession)
  }, [clearSession])

  const login = useCallback(
    async (credentials) => saveSession((await api.post('/login', credentials)).data),
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
    }),
    [user, status, login, register, logout, forgotPassword, resetPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
