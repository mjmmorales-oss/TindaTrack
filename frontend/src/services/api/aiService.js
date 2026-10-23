import { apiClient } from './apiClient.js'
import {
  normalizeBasketResult,
  normalizeProductScanResult,
} from '@/lib/aiContract.js'
import { toImageBlob } from '@/lib/imagePrep.js'
import { AI_REQUEST_TIMEOUT_MS } from '@/config/ai.js'

/**
 * Posts a photo and measures the browser side: upload_ms (until the last byte left,
 * via onUploadProgress) and total_ms (until the answer arrived).
 */
async function postPhoto(url, formData, { signal, onStage } = {}) {
  const startedAt = performance.now()
  let uploadedAt = null
  onStage?.('uploading')
  const res = await apiClient.post(url, formData, {
    signal,
    timeout: AI_REQUEST_TIMEOUT_MS,
    onUploadProgress: (e) => {
      if (e.total && e.loaded >= e.total && uploadedAt === null) {
        uploadedAt = performance.now()
        onStage?.('reading')
      }
    },
  })
  onStage?.('matching')
  const doneAt = performance.now()
  const data = res?.data ?? res
  return {
    ...data,
    client_timings: {
      upload_ms: Math.round((uploadedAt ?? doneAt) - startedAt),
      total_ms: Math.round(doneAt - startedAt),
    },
  }
}

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
   * @param {(stage: 'uploading'|'reading'|'matching') => void} [options.onStage]
   */
  async basketScan(imageBlob, options = {}) {
    const image = await toImageBlob(imageBlob)
    const formData = new FormData()
    formData.append('image', image, 'basket.jpg')
    if (options.capture_mode) {
      formData.append('capture_mode', options.capture_mode)
    }

    return normalizeBasketResult(await postPhoto('/ai/basket-scan', formData, options))
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

    return normalizeProductScanResult(await postPhoto('/ai/product-scan', formData, options), options.categories || [])
  },

  /**
   * POST /api/ai/scans/{scanId}/feedback
   *
   * @param {string|number} scanId
   * @param {Array<object>|{ lines: Array<object> }} payload
   */
  async sendFeedback(scanId, payload, options = {}) {
    const body = Array.isArray(payload) ? { lines: payload } : (payload?.lines ? payload : { lines: [] })
    // The browser only knows the upload time after the scan returned
    if (Number.isFinite(options.upload_ms)) body.upload_ms = Math.max(0, Math.round(options.upload_ms))
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
    // Keep Laravel's { data } envelope: AiExperimentsTab (and the mock) read res.data
    return apiClient.get('/ai/experiments')
  },

  /**
   * GET /api/ai/experiments/{id}
   *
   * @param {number|string} id
   */
  async getExperiment(id) {
    return apiClient.get(`/ai/experiments/${id}`)
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
