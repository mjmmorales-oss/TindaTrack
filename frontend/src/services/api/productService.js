import { apiClient } from './apiClient.js'

export const productService = {
  /**
   * Retrieves paginated products with optional search, category, stock filters, and sorting.
   * GET /api/products
   */
  async list(params = {}) {
    return apiClient.get('/products', params)
  },

  /**
   * Retrieves a single product by ID.
   * GET /api/products/{id}
   */
  async get(id) {
    return apiClient.get(`/products/${id}`)
  },

  /**
   * Creates a new product.
   * POST /api/products
   */
  async create(data) {
    return apiClient.post('/products', data)
  },

  /**
   * Updates an existing product.
   * PUT /api/products/{id}
   */
  async update(id, data) {
    return apiClient.put(`/products/${id}`, data)
  },

  /**
   * Soft deletes a product.
   * DELETE /api/products/{id}
   */
  async remove(id) {
    return apiClient.delete(`/products/${id}`)
  },

  /**
   * Adjusts inventory stock (restock, damage, correction).
   * POST /api/products/{id}/adjust
   */
  async adjustStock(id, data) {
    return apiClient.post(`/products/${id}/adjust`, data)
  },

  /**
   * Retrieves all products currently at or below their reorder level.
   * GET /api/products/low-stock
   */
  async lowStock() {
    return apiClient.get('/products/low-stock')
  },
}

export default productService
