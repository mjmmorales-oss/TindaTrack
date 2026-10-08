import { apiClient } from './apiClient.js'

export const categoryService = {
  /**
   * Retrieves all categories with product counts.
   * GET /api/categories
   */
  async list() {
    return apiClient.get('/categories')
  },

  /**
   * Creates a new category.
   * POST /api/categories
   */
  async create(data) {
    return apiClient.post('/categories', data)
  },

  /**
   * Updates an existing category.
   * PUT /api/categories/{id}
   */
  async update(id, data) {
    return apiClient.put(`/categories/${id}`, data)
  },

  /**
   * Deletes a category. Blocked if products belong to it.
   * DELETE /api/categories/{id}
   */
  async remove(id) {
    return apiClient.delete(`/categories/${id}`)
  },
}

export default categoryService
