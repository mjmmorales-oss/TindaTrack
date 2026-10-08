import axios from 'axios'

export const TOKEN_KEY = 'tindatrack_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
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
