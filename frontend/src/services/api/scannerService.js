import axios from 'axios'
import { apiClient } from './apiClient.js'
import { ApiError } from '@/lib/mockApi'
import { getApiBaseUrl } from '@/lib/api'

const SCANNER_TOKEN_KEY = 'tt_scanner_token'

const deviceAxios = axios.create({
  baseURL: getApiBaseUrl(),
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
      message: error.message || 'Could not reach scanner server.',
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
    const res = await apiClient.post('/scanner-sessions', data)
    return res?.data ?? res
  },

  /**
   * GET /api/scanner-sessions/{id}
   */
  async getScannerSession(id) {
    const res = await apiClient.get(`/scanner-sessions/${id}`)
    return res?.data ?? res
  },

  /**
   * GET /api/scanner-sessions/{id}/events
   */
  async listScannerEvents(id, after = 0) {
    const res = await apiClient.get(`/scanner-sessions/${id}/events`, { after: after || 0 })
    return res?.data ?? res
  },

  /**
   * DELETE /api/scanner-sessions/{id}
   */
  async endScannerSession(id) {
    const res = await apiClient.delete(`/scanner-sessions/${id}`)
    return res?.data ?? res
  },

  /**
   * GET /api/scanner/unknown-barcodes
   */
  async getUnknownBarcodes() {
    const res = await apiClient.get('/scanner/unknown-barcodes')
    return res?.data ?? res
  },

  // Device endpoints (X-Scanner-Token)
  /**
   * POST /api/scanner/pair
   */
  async pairScanner(data) {
    const res = await handleDeviceRequest(deviceAxios.post('/scanner/pair', data))
    const payload = res?.data ?? res
    if (payload?.token && typeof window !== 'undefined') {
      sessionStorage.setItem(SCANNER_TOKEN_KEY, payload.token)
    }
    return payload
  },

  /**
   * POST /api/scanner/scans
   */
  async sendScan(data) {
    const res = await handleDeviceRequest(deviceAxios.post('/scanner/scans', data))
    return res?.data ?? res
  },

  /**
   * POST /api/scanner/heartbeat
   */
  async scannerHeartbeat() {
    const res = await handleDeviceRequest(deviceAxios.post('/scanner/heartbeat'))
    return res?.data ?? res
  },

  /**
   * POST /api/scanner/ai-basket
   *
   * @param {Blob|File} imageBlob
   */
  async sendAiBasket(imageBlob, options = {}) {
    const formData = new FormData()
    formData.append('image', imageBlob, 'basket.jpg')
    if (options.capture_mode) {
      formData.append('capture_mode', options.capture_mode)
    }
    const res = await handleDeviceRequest(
      deviceAxios.post('/scanner/ai-basket', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    )
    return res?.data ?? res
  },
}

export default scannerService
