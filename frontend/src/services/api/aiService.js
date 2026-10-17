import { apiClient } from './apiClient.js'

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
   */
  async basketScan(imageBlob, options = {}) {
    const formData = new FormData()
    formData.append('image', imageBlob, 'basket.jpg')

    const res = await apiClient.post('/ai/basket-scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options.signal,
    })
    return res?.data ?? res
  },

  /**
   * POST /api/ai/product-scan (multipart/form-data)
   *
   * @param {Blob|File} imageBlob
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async productScan(imageBlob, options = {}) {
    const formData = new FormData()
    formData.append('image', imageBlob, 'products.jpg')

    const res = await apiClient.post('/ai/product-scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options.signal,
    })
    return res?.data ?? res
  },

  /**
   * POST /api/ai/scans/{scanId}/feedback
   *
   * @param {string} scanId
   * @param {Array<object>} lines
   */
  async sendFeedback(scanId, lines) {
    const res = await apiClient.post(`/ai/scans/${scanId}/feedback`, { lines })
    return res?.data ?? res
  },

  /**
   * GET /api/ai/scans
   *
   * @param {object} [params]
   */
  async listScans(params = {}) {
    const res = await apiClient.get('/ai/scans', { params })
    return res?.data ?? res
  },

  /**
   * GET /api/ai/scans/{scanId}/image
   *
   * @param {string} scanId
   * @returns {Promise<Blob>}
   */
  async getScanImage(scanId) {
    const res = await apiClient.get(`/ai/scans/${scanId}/image`, {
      responseType: 'blob',
    })
    return res?.data ?? res
  },

  /**
   * GET /api/ai/metrics
   *
   * @param {object} [params]
   */
  async getMetrics(params = {}) {
    const res = await apiClient.get('/ai/metrics', { params })
    return res?.data ?? res
  },

  /**
   * GET /api/ai/metrics/export.csv
   *
   * @param {object} [params]
   */
  async exportMetricsCsv(params = {}) {
    const res = await apiClient.get('/ai/metrics/export.csv', {
      params,
      responseType: 'text',
    })
    return res?.data ?? res
  },

  /**
   * GET /api/products/embeddings
   *
   * @param {object} [params]
   */
  async getEmbeddings(params = {}) {
    const res = await apiClient.get('/products/embeddings', { params })
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
    const formData = new FormData()
    formData.append('image', imageBlob, 'experiment_case.jpg')
    formData.append('ground_truth', JSON.stringify(groundTruth))

    const res = await apiClient.post(`/ai/experiments/${id}/cases`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
    const res = await apiClient.get(`/ai/experiments/${id}/export.csv`, {
      responseType: 'text',
    })
    return res?.data ?? res
  },
}

export default aiService
