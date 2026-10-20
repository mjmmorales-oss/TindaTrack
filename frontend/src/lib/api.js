import axios from 'axios'

export const TOKEN_KEY = 'tindatrack_token'

/**
 * Returns the effective API base URL.
 * Accepts full URLs (e.g. 'http://localhost:8000/api', 'https://api.example.com/api')
 * or relative bases (e.g. '/api' when using Vite proxy in dev:lan mode).
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_URL
  if (typeof envUrl === 'string') {
    // "https://api.example.com/api/" and ".../api" must behave the same
    const trimmed = envUrl.trim().replace(/\/+$/, '')
    if (trimmed.length > 0) {
      return trimmed
    }
    // Explicitly empty string (e.g. VITE_API_URL= in dev:lan mode): use relative '/api'
    return '/api'
  }
  if (import.meta.env?.VITE_DEV_HTTPS === 'true') {
    return '/api'
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api'
  }
  return '/api'
}

export const API_BASE = getApiBaseUrl()

/**
 * True when authenticated API calls can succeed: mock/test data source, or a
 * stored bearer token. The paired phone scanner (/scan) has neither, so shared
 * components skip owner/cashier queries there instead of triggering 401 toasts.
 */
export function hasApiSession() {
  if (import.meta.env?.MODE === 'test' || import.meta.env?.VITE_DATA_SOURCE === 'mock') return true
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY))
  } catch {
    return false
  }
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: error.response?.data?.message,
        }),
      )
    } else if (error.response?.status === 403 && !error.response?.data?.code) {
      // A 403 with a domain `code` (e.g. ai_disabled) is shown by the caller, not as "Access Denied"
      window.dispatchEvent(
        new CustomEvent('auth:forbidden', {
          detail: error.response?.data?.message,
        }),
      )
    } else if (!error.response && !window.navigator.onLine) {
      window.dispatchEvent(new CustomEvent('network:offline'))
    }
    return Promise.reject(error)
  },
)
