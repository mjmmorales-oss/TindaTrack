import { apiClient } from './apiClient.js'
import {
  normalizeBasketResult,
  normalizeProductScanResult,
} from '@/lib/aiContract.js'
import { toImageBlob } from '@/lib/imagePrep.js'
import { AI_REQUEST_TIMEOUT_MS } from '@/config/ai.js'

export const aiService = {
  /**
   * GET /api/ai/status
   */
  async getAiStatus() {
    const res = await apiClient.get('/ai/status')
    return res?.data ?? res
  },

  /**
   * POST /api/ai/basket-scan (multipart/form-data)
   *
   * @param {Blob|File} imageBlob
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {'auto'|'manual'|'upload'} [options.capture_mode]
   */
  async basketScan(imageBlob, options = {}) {
    const image = await toImageBlob(imageBlob)
    const formData = new FormData()
    formData.append('image', image, 'basket.jpg')
    if (options.capture_mode) {
      formData.append('capture_mode', options.capture_mode)
    }

    const res = await apiClient.post('/ai/basket-scan', formData, {
      signal: options.signal,
      timeout: AI_REQUEST_TIMEOUT_MS,
    })
    const data = res?.data ?? res
    return normalizeBasketResult(data)
  },

  /**
   * POST /api/ai/product-scan (multipart/form-data)
   *
   * @param {Blob|File} imageBlob
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {'auto'|'manual'|'upload'} [options.capture_mode]
   * @param {Array<object>} [options.categories]
   */
  async productScan(imageBlob, options = {}) {
    const image = await toImageBlob(imageBlob)
    const formData = new FormData()
    formData.append('image', image, 'products.jpg')
    if (options.capture_mode) {
      formData.append('capture_mode', options.capture_mode)
    }

    const res = await apiClient.post('/ai/product-scan', formData, {
      signal: options.signal,
      timeout: AI_REQUEST_TIMEOUT_MS,
    })
    const data = res?.data ?? res
    return normalizeProductScanResult(data, options.categories || [])
  },

  /**
   * POST /api/ai/scans/{scanId}/feedback
   *
   * @param {string|number} scanId
   * @param {Array<object>|{ lines: Array<object> }} payload
   */
  async sendFeedback(scanId, payload) {
    const body = Array.isArray(payload) ? { lines: payload } : (payload?.lines ? payload : { lines: [] })
    const res = await apiClient.post(`/ai/scans/${scanId}/feedback`, body)
    return res?.data ?? res
  },

  /**
   * GET /api/ai/scans
   *
   * @param {object} [params]
   */
  async listScans(params = {}) {
    const res = await apiClient.get('/ai/scans', params)
    return res?.data ?? res
  },

  /**
   * GET /api/ai/scans/{scanId}/image
   *
   * @param {string} scanId
   * @returns {Promise<Blob>}
   */
  async getScanImage(scanId) {
    const res = await apiClient.get(`/ai/scans/${scanId}/image`, {}, { responseType: 'blob' })
    return res?.data ?? res
  },

  /**
   * GET /api/ai/metrics
   *
   * @param {object} [params]
   */
  async getMetrics(params = {}) {
    const res = await apiClient.get('/ai/metrics', params)
    return res?.data ?? res
  },

  /**
   * GET /api/ai/metrics/export.csv
   *
   * @param {object} [params]
   */
  async exportMetricsCsv(params = {}) {
    const res = await apiClient.get('/ai/metrics/export.csv', params, { responseType: 'text' })
    return res?.data ?? res
  },

  /**
   * GET /api/products/embeddings
   *
   * @param {object} [params]
   */
  async getEmbeddings(params = {}) {
    const res = await apiClient.get('/products/embeddings', params)
    return res?.data ?? res
  },

  /**
   * POST /api/products/{productId}/embeddings
   *
   * @param {number|string} productId
   * @param {object} data
   */
  async saveEmbedding(productId, data) {
    const res = await apiClient.post(`/products/${productId}/embeddings`, data)
    return res?.data ?? res
  },

  /**
   * DELETE /api/products/{productId}/embeddings/{id}
   *
   * @param {number|string} productId
   * @param {number|string} id
   */
  async deleteEmbedding(productId, id) {
    const res = await apiClient.delete(`/products/${productId}/embeddings/${id}`)
    return res?.data ?? res
  },

  /**
   * POST /api/products/bulk
   *
   * @param {Array<object>} products
   */
  async bulkCreateProducts(products) {
    const res = await apiClient.post('/products/bulk', { products })
    return res?.data ?? res
  },

  /**
   * GET /api/ai/experiments
   */
  async getExperiments() {
    const res = await apiClient.get('/ai/experiments')
    return res?.data ?? res
  },

  /**
   * GET /api/ai/experiments/{id}
   *
   * @param {number|string} id
   */
  async getExperiment(id) {
    const res = await apiClient.get(`/ai/experiments/${id}`)
    return res?.data ?? res
  },

  /**
   * POST /api/ai/experiments
   *
   * @param {object} data
   */
  async createExperiment(data) {
    const res = await apiClient.post('/ai/experiments', data)
    return res?.data ?? res
  },

  /**
   * POST /api/ai/experiments/{id}/cases
   *
   * @param {number|string} id
   * @param {Blob|File} imageBlob
   * @param {Array<object>} groundTruth
   */
  async runExperimentCase(id, imageBlob, groundTruth) {
    const image = await toImageBlob(imageBlob)
    const formData = new FormData()
    formData.append('image', image, 'experiment_case.jpg')
    formData.append('ground_truth', JSON.stringify(groundTruth))

    const res = await apiClient.post(`/ai/experiments/${id}/cases`, formData, {
      timeout: AI_REQUEST_TIMEOUT_MS,
    })
    return res?.data ?? res
  },

  /**
   * POST /api/ai/experiments/{id}/reset
   *
   * @param {number|string} id
   */
  async resetExperiment(id) {
    const res = await apiClient.post(`/ai/experiments/${id}/reset`)
    return res?.data ?? res
  },

  /**
   * GET /api/ai/experiments/{id}/export.csv
   *
   * @param {number|string} id
   */
  async exportExperimentCsv(id) {
    const res = await apiClient.get(`/ai/experiments/${id}/export.csv`, {}, { responseType: 'text' })
    return res?.data ?? res
  },
}

export default aiService
