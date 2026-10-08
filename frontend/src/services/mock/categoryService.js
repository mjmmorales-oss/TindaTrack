/**
 * Future Laravel Endpoints:
 * - GET    /api/categories             -> CategoryController@index
 * - POST   /api/categories             -> CategoryController@store
 * - PUT    /api/categories/{id}        -> CategoryController@update
 * - DELETE /api/categories/{id}        -> CategoryController@destroy
 */

import { useMockDb } from '../../mocks/db.js'
import { delay, ApiError } from '../../lib/mockApi.js'

export const categoryService = {
  /**
   * Retrieves all categories with product counts.
   * Future: GET /api/categories
   */
  async list() {
    await delay()
    const { categories, products } = useMockDb.getState()

    const withCounts = categories.map((cat) => {
      const count = products.filter((p) => p.category_id === cat.id).length
      return {
        ...cat,
        product_count: count,
      }
    })

    return { data: withCounts }
  },

  /**
   * Creates a new category.
   * Future: POST /api/categories
   */
  async create(data) {
    await delay()
    const errors = {}
    if (!data.name?.trim()) errors.name = ['The name field is required.']

    const state = useMockDb.getState()
    if (
      data.name &&
      state.categories.some(
        (c) => c.name.toLowerCase() === data.name.trim().toLowerCase(),
      )
    ) {
      errors.name = ['Category name must be unique.']
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The given data was invalid.', errors })
    }

    const nextId = state.nextIds.category++
    const newCategory = {
      id: nextId,
      name: data.name.trim(),
      code: data.code?.trim().toUpperCase() || data.name.slice(0, 3).toUpperCase(),
      description: data.description?.trim() || '',
      color: data.color || '#0E7C66',
      icon: data.icon || 'Package',
      created_at: new Date().toISOString(),
    }

    state.setCategories((prev) => [...prev, newCategory])
    return { data: newCategory }
  },

  /**
   * Updates an existing category.
   * Future: PUT /api/categories/{id}
   */
  async update(id, data) {
    await delay()
    const catId = Number(id)
    const state = useMockDb.getState()
    const category = state.categories.find((c) => c.id === catId)

    if (!category) {
      throw new ApiError(404, 'Category not found.')
    }

    if (
      data.name &&
      state.categories.some(
        (c) =>
          c.id !== catId &&
          c.name.toLowerCase() === data.name.trim().toLowerCase(),
      )
    ) {
      throw new ApiError(422, {
        message: 'The given data was invalid.',
        errors: { name: ['Category name has already been taken.'] },
      })
    }

    const updated = {
      ...category,
      ...data,
      name: data.name?.trim() || category.name,
    }

    state.setCategories((prev) => prev.map((c) => (c.id === catId ? updated : c)))
    return { data: updated }
  },

  /**
   * Deletes a category. Blocked if products belong to this category.
   * Future: DELETE /api/categories/{id}
   */
  async remove(id) {
    await delay()
    const catId = Number(id)
    const state = useMockDb.getState()
    const category = state.categories.find((c) => c.id === catId)

    if (!category) {
      throw new ApiError(404, 'Category not found.')
    }

    // Business rule: category delete blocked if it has products
    const hasProducts = state.products.some((p) => p.category_id === catId)
    if (hasProducts) {
      throw new ApiError(422, {
        message: 'Cannot delete category that still has products assigned to it.',
        errors: {
          category: [
            'May mga produkto pang nakatalaga sa kategoryang ito. Ilipat o burahin muna ang mga produkto bago mag-delete.',
          ],
        },
      })
    }

    state.setCategories((prev) => prev.filter((c) => c.id !== catId))
    return { message: 'Category deleted successfully.' }
  },
}

export default categoryService
