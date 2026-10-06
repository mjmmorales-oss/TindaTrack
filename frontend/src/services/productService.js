/**
 * Future Laravel Endpoints:
 * - GET    /api/products               -> ProductController@index
 * - POST   /api/products               -> ProductController@store
 * - GET    /api/products/{id}          -> ProductController@show
 * - PUT    /api/products/{id}          -> ProductController@update
 * - DELETE /api/products/{id}          -> ProductController@destroy
 * - POST   /api/products/{id}/adjust   -> ProductController@adjustStock
 * - GET    /api/products/low-stock     -> ProductController@lowStock
 */

import { useMockDb } from '../mocks/db.js'
import {
  delay,
  ApiError,
  paginate,
  applySearch,
  applySort,
} from '../lib/mockApi.js'
import { getCurrentUser } from '../lib/authBridge.js'

export const productService = {
  /**
   * Retrieves paginated products with optional search, category, stock filters, and sorting.
   * Future: GET /api/products
   */
  async list(params = {}) {
    await delay()
    const {
      q = '',
      category_id,
      stock, // 'in' | 'low' | 'out'
      is_active,
      page = 1,
      per_page = 15,
      sort = 'name',
    } = params

    let items = [...useMockDb.getState().products]

    if (category_id) {
      items = items.filter((p) => String(p.category_id) === String(category_id))
    }

    if (stock) {
      if (stock === 'out') {
        items = items.filter((p) => p.stock_quantity <= 0)
      } else if (stock === 'low') {
        items = items.filter(
          (p) => p.stock_quantity > 0 && p.stock_quantity <= p.reorder_level,
        )
      } else if (stock === 'in') {
        items = items.filter((p) => p.stock_quantity > p.reorder_level)
      }
    }

    if (is_active !== undefined && is_active !== '') {
      const activeBool = is_active === true || is_active === 'true' || is_active === 1
      items = items.filter((p) => p.is_active === activeBool)
    }

    items = applySearch(items, q, ['name', 'sku', 'barcode'])
    items = applySort(items, sort)

    return paginate(items, page, per_page)
  },

  /**
   * Retrieves single product by ID.
   * Future: GET /api/products/{id}
   */
  async get(id) {
    await delay()
    const product = useMockDb.getState().products.find((p) => p.id === Number(id))
    if (!product) {
      throw new ApiError(404, 'Product not found.')
    }
    return { data: product }
  },

  /**
   * Creates a new product.
   * Future: POST /api/products
   */
  async create(data) {
    await delay()
    const currentUser = getCurrentUser()
    const errors = {}

    if (!data.name?.trim()) errors.name = ['The name field is required.']
    if (!data.category_id) errors.category_id = ['The category field is required.']
    if (data.price === undefined || data.price === null || data.price < 0) {
      errors.price = ['The price must be at least 0.']
    }
    if (data.cost_price !== undefined && data.cost_price < 0) {
      errors.cost_price = ['The cost price must be at least 0.']
    }
    if (data.stock_quantity !== undefined && data.stock_quantity < 0) {
      errors.stock_quantity = ['The stock quantity cannot be negative.']
    }
    if (data.reorder_level !== undefined && data.reorder_level < 0) {
      errors.reorder_level = ['The reorder level cannot be negative.']
    }

    // SKU / Barcode uniqueness check
    const existing = useMockDb.getState().products
    if (data.sku && existing.some((p) => p.sku.toLowerCase() === data.sku.trim().toLowerCase())) {
      errors.sku = ['The SKU has already been taken.']
    }
    if (data.barcode && existing.some((p) => p.barcode === data.barcode.trim())) {
      errors.barcode = ['The barcode has already been taken.']
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The given data was invalid.', errors })
    }

    const state = useMockDb.getState()
    const nextId = state.nextIds.product
    const now = new Date().toISOString()

    const newProduct = {
      id: nextId,
      category_id: Number(data.category_id),
      name: data.name.trim(),
      sku: data.sku?.trim() || `TT-GEN-${String(nextId).padStart(3, '0')}`,
      barcode: data.barcode?.trim() || undefined,
      unit: data.unit || 'pc',
      price: Math.round(Number(data.price) * 100) / 100,
      cost_price: Math.round(Number(data.cost_price || 0) * 100) / 100,
      stock_quantity: Math.max(0, parseInt(data.stock_quantity, 10) || 0),
      reorder_level: Math.max(0, parseInt(data.reorder_level, 10) || 10),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      description: data.description?.trim() || '',
      created_at: now,
      updated_at: now,
    }

    // Record initial stock movement if starting stock > 0
    if (newProduct.stock_quantity > 0) {
      const movementId = state.nextIds.movement
      state.setStockMovements((prev) => [
        {
          id: movementId,
          product_id: nextId,
          type: 'restock',
          quantity: newProduct.stock_quantity,
          stock_after: newProduct.stock_quantity,
          reference: 'INITIAL_STOCK',
          notes: 'Initial stock on product creation',
          user_id: currentUser.id,
          created_at: now,
        },
        ...prev,
      ])
      state.nextIds.movement++
    }

    state.setProducts((prev) => [newProduct, ...prev])
    state.nextIds.product++

    return { data: newProduct }
  },

  /**
   * Updates an existing product.
   * Future: PUT /api/products/{id}
   */
  async update(id, data) {
    await delay()
    const prodId = Number(id)
    const state = useMockDb.getState()
    const product = state.products.find((p) => p.id === prodId)

    if (!product) {
      throw new ApiError(404, 'Product not found.')
    }

    const errors = {}
    if (data.name !== undefined && !data.name?.trim()) {
      errors.name = ['The name field cannot be empty.']
    }
    if (data.price !== undefined && data.price < 0) {
      errors.price = ['The price must be at least 0.']
    }
    if (data.cost_price !== undefined && data.cost_price < 0) {
      errors.cost_price = ['The cost price must be at least 0.']
    }
    if (data.reorder_level !== undefined && data.reorder_level < 0) {
      errors.reorder_level = ['The reorder level cannot be negative.']
    }

    if (
      data.sku &&
      state.products.some(
        (p) => p.id !== prodId && p.sku.toLowerCase() === data.sku.trim().toLowerCase(),
      )
    ) {
      errors.sku = ['The SKU has already been taken.']
    }

    if (
      data.barcode &&
      state.products.some((p) => p.id !== prodId && p.barcode === data.barcode.trim())
    ) {
      errors.barcode = ['The barcode has already been taken.']
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The given data was invalid.', errors })
    }

    const updated = {
      ...product,
      ...data,
      price: data.price !== undefined ? Math.round(Number(data.price) * 100) / 100 : product.price,
      cost_price:
        data.cost_price !== undefined
          ? Math.round(Number(data.cost_price) * 100) / 100
          : product.cost_price,
      updated_at: new Date().toISOString(),
    }

    state.setProducts((prev) => prev.map((p) => (p.id === prodId ? updated : p)))

    return { data: updated }
  },

  /**
   * Deletes a product.
   * Future: DELETE /api/products/{id}
   */
  async remove(id) {
    await delay()
    const prodId = Number(id)
    const state = useMockDb.getState()
    const product = state.products.find((p) => p.id === prodId)

    if (!product) {
      throw new ApiError(404, 'Product not found.')
    }

    // Check if sales reference this product
    const hasSales = state.sales.some((s) => s.items.some((i) => i.product_id === prodId))
    if (hasSales) {
      // Soft-deactivate if sales exist to preserve historical audit
      state.setProducts((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, is_active: false } : p)),
      )
      return { message: 'Product has sales history; marked as inactive instead of deleted.' }
    }

    state.setProducts((prev) => prev.filter((p) => p.id !== prodId))
    return { message: 'Product deleted successfully.' }
  },

  /**
   * Adjusts stock quantity and writes an audit StockMovement.
   * Future: POST /api/products/{id}/adjust-stock
   */
  async adjustStock(id, { type, quantity, notes }) {
    await delay()
    const prodId = Number(id)
    const currentUser = getCurrentUser()
    const state = useMockDb.getState()
    const product = state.products.find((p) => p.id === prodId)

    if (!product) {
      throw new ApiError(404, 'Product not found.')
    }

    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty === 0) {
      throw new ApiError(422, {
        message: 'Invalid quantity.',
        errors: { quantity: ['Quantity cannot be 0.'] },
      })
    }

    // Calculate new stock
    // restock/correction adds or sets, damage/waste deducts
    let delta = qty
    if (type === 'damage' || type === 'correction_minus') {
      delta = -Math.abs(qty)
    } else if (type === 'restock' || type === 'correction_plus') {
      delta = Math.abs(qty)
    }

    const newStock = product.stock_quantity + delta
    if (newStock < 0) {
      throw new ApiError(422, {
        message: 'Stock cannot go below zero.',
        errors: { quantity: ['Stock deduction exceeds current available inventory.'] },
      })
    }

    const now = new Date().toISOString()
    const movementId = state.nextIds.movement++

    state.setProducts((prev) =>
      prev.map((p) =>
        p.id === prodId ? { ...p, stock_quantity: newStock, updated_at: now } : p,
      ),
    )

    state.setStockMovements((prev) => [
      {
        id: movementId,
        product_id: prodId,
        type: type || 'correction',
        quantity: delta,
        stock_after: newStock,
        reference: `ADJ-${prodId}-${Date.now().toString().slice(-4)}`,
        notes: notes || 'Manual stock adjustment',
        user_id: currentUser.id,
        created_at: now,
      },
      ...prev,
    ])

    return {
      data: {
        ...product,
        stock_quantity: newStock,
      },
    }
  },

  /**
   * Retrieves products at or below reorder level.
   * Future: GET /api/products/low-stock
   */
  async lowStock() {
    await delay()
    const items = useMockDb
      .getState()
      .products.filter((p) => p.is_active && p.stock_quantity <= p.reorder_level)
    return { data: items }
  },
}

export default productService
