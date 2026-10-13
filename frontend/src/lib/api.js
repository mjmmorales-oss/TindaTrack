import axios from 'axios'

export const TOKEN_KEY = 'tindatrack_token'

/**
 * Returns the effective API base URL.
 * Accepts full URLs (e.g. 'http://localhost:8000/api', 'https://api.example.com/api')
 * or relative bases (e.g. '/api' when using Vite proxy in dev:lan mode).
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_URL
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl
  }
  if (import.meta.env?.VITE_DEV_HTTPS === 'true') {
    return '/api'
  }
  return 'http://localhost:8000/api'
}

export const API_BASE = getApiBaseUrl()

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
    } else if (error.response?.status === 403) {
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
