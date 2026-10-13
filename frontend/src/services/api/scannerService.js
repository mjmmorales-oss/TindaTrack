import axios from 'axios'
import { apiClient } from './apiClient.js'
import { ApiError } from '@/lib/mockApi'

const SCANNER_TOKEN_KEY = 'tt_scanner_token'

const deviceAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  timeout: 10000,
})

deviceAxios.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem(SCANNER_TOKEN_KEY) : null
  if (token) {
    config.headers['X-Scanner-Token'] = token
  }
  // Ensure user bearer token is NEVER sent on device endpoints
  delete config.headers.Authorization
  return config
})

async function handleDeviceRequest(promise) {
  try {
    const res = await promise
    return res.data
  } catch (error) {
    if (error.response) {
      throw new ApiError(error.response.status, error.response.data)
    }
    throw new ApiError(500, {
      message: error.message || 'Hindi maabot ang scanner server.',
      errors: {},
    })
  }
}

export const scannerService = {
  // Authenticated endpoints (Bearer token)
  /**
   * POST /api/scanner-sessions
   */
  async createScannerSession(data = { mode: 'pos' }) {
    return apiClient.post('/scanner-sessions', data)
  },

  /**
   * GET /api/scanner-sessions/{id}
   */
  async getScannerSession(id) {
    return apiClient.get(`/scanner-sessions/${id}`)
  },

  /**
   * GET /api/scanner-sessions/{id}/events
   */
  async listScannerEvents(id, after = 0) {
    return apiClient.get(`/scanner-sessions/${id}/events`, { after: after || 0 })
  },

  /**
   * DELETE /api/scanner-sessions/{id}
   */
  async endScannerSession(id) {
    return apiClient.delete(`/scanner-sessions/${id}`)
  },

  /**
   * GET /api/scanner/unknown-barcodes
   */
  async getUnknownBarcodes() {
    return apiClient.get('/scanner/unknown-barcodes')
  },

  // Device endpoints (X-Scanner-Token)
  /**
   * POST /api/scanner/pair
   */
  async pairScanner(data) {
    const result = await handleDeviceRequest(deviceAxios.post('/scanner/pair', data))
    if (result?.token && typeof window !== 'undefined') {
      sessionStorage.setItem(SCANNER_TOKEN_KEY, result.token)
    }
    return result
  },

  /**
   * POST /api/scanner/scans
   */
  async sendScan(data) {
    return handleDeviceRequest(deviceAxios.post('/scanner/scans', data))
  },

  /**
   * POST /api/scanner/heartbeat
   */
  async scannerHeartbeat() {
    return handleDeviceRequest(deviceAxios.post('/scanner/heartbeat'))
  },
}

export default scannerService
