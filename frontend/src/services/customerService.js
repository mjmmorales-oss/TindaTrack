/**
 * Future Laravel Endpoints:
 * - GET    /api/customers              -> CustomerController@index
 * - POST   /api/customers              -> CustomerController@store
 * - GET    /api/customers/{id}         -> CustomerController@show
 * - PUT    /api/customers/{id}         -> CustomerController@update
 * - DELETE /api/customers/{id}         -> CustomerController@destroy
 * - GET    /api/customers/{id}/ledger  -> CustomerController@ledger
 */

import { useMockDb } from '../mocks/db.js'
import {
  delay,
  ApiError,
  paginate,
  applySearch,
  applySort,
} from '../lib/mockApi.js'

function toMoney(n) {
  return Math.round(n * 100) / 100
}

export const customerService = {
  /**
   * Retrieves paginated customers with search and balance filters.
   * Future: GET /api/customers
   */
  async list(params = {}) {
    await delay()
    const {
      q = '',
      with_balance,
      over_limit,
      page = 1,
      per_page = 15,
      sort = 'name',
    } = params

    let items = [...useMockDb.getState().customers]

    if (with_balance === true || with_balance === 'true') {
      items = items.filter((c) => c.credit_balance > 0)
    }

    if (over_limit === true || over_limit === 'true') {
      items = items.filter((c) => c.credit_balance > c.credit_limit)
    }

    items = applySearch(items, q, ['name', 'nickname', 'contact_number', 'address'])
    items = applySort(items, sort)

    return paginate(items, page, per_page)
  },

  /**
   * Retrieves single customer by ID.
   * Future: GET /api/customers/{id}
   */
  async get(id) {
    await delay()
    const custId = Number(id)
    const customer = useMockDb.getState().customers.find((c) => c.id === custId)

    if (!customer) {
      throw new ApiError(404, 'Customer not found.')
    }

    return { data: customer }
  },

  /**
   * Creates a new customer.
   * Future: POST /api/customers
   */
  async create(data) {
    await delay()
    const errors = {}

    if (!data.name?.trim()) {
      errors.name = ['The name field is required.']
    }

    if (data.credit_limit !== undefined && data.credit_limit < 0) {
      errors.credit_limit = ['The credit limit cannot be negative.']
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The given data was invalid.', errors })
    }

    const state = useMockDb.getState()
    const nextId = state.nextIds.customer++
    const now = new Date().toISOString()

    const newCustomer = {
      id: nextId,
      name: data.name.trim(),
      nickname: data.nickname?.trim() || '',
      contact_number: data.contact_number?.trim() || '',
      address: data.address?.trim() || '',
      credit_limit: Math.max(0, toMoney(Number(data.credit_limit || 1000))),
      credit_balance: 0.0,
      notes: data.notes?.trim() || '',
      created_at: now,
    }

    state.setCustomers((prev) => [newCustomer, ...prev])
    return { data: newCustomer }
  },

  /**
   * Updates an existing customer profile or credit limit.
   * Future: PUT /api/customers/{id}
   */
  async update(id, data) {
    await delay()
    const custId = Number(id)
    const state = useMockDb.getState()
    const customer = state.customers.find((c) => c.id === custId)

    if (!customer) {
      throw new ApiError(404, 'Customer not found.')
    }

    const errors = {}
    if (data.name !== undefined && !data.name?.trim()) {
      errors.name = ['The name field cannot be empty.']
    }
    if (data.credit_limit !== undefined && data.credit_limit < 0) {
      errors.credit_limit = ['The credit limit cannot be negative.']
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The given data was invalid.', errors })
    }

    const updated = {
      ...customer,
      ...data,
      name: data.name?.trim() || customer.name,
      credit_limit:
        data.credit_limit !== undefined
          ? Math.max(0, toMoney(Number(data.credit_limit)))
          : customer.credit_limit,
    }

    state.setCustomers((prev) => prev.map((c) => (c.id === custId ? updated : c)))
    return { data: updated }
  },

  /**
   * Deletes a customer. Blocked if the customer has an outstanding balance.
   * Future: DELETE /api/customers/{id}
   */
  async remove(id) {
    await delay()
    const custId = Number(id)
    const state = useMockDb.getState()
    const customer = state.customers.find((c) => c.id === custId)

    if (!customer) {
      throw new ApiError(404, 'Customer not found.')
    }

    // Business rule: customer delete blocked if balance > 0
    if (customer.credit_balance > 0) {
      throw new ApiError(422, {
        message: 'Cannot delete a customer who still has an unpaid utang balance.',
        errors: {
          credit_balance: [
            `May natitirang utang pa na ₱${customer.credit_balance.toFixed(2)} si ${customer.name}. Kolektahin muna ang bayad bago burahin.`,
          ],
        },
      })
    }

    state.setCustomers((prev) => prev.filter((c) => c.id !== custId))
    return { message: 'Customer deleted successfully.' }
  },

  /**
   * Retrieves complete ledger history (utang sales + payments) with running balance.
   * Future: GET /api/customers/{id}/ledger
   */
  async ledger(id) {
    await delay()
    const custId = Number(id)
    const state = useMockDb.getState()
    const customer = state.customers.find((c) => c.id === custId)

    if (!customer) {
      throw new ApiError(404, 'Customer not found.')
    }

    // 1. Get all utang sales for this customer (excluding voided)
    const customerSales = state.sales.filter(
      (s) => s.customer_id === custId && s.payment_type === 'utang' && s.status === 'completed',
    )

    // 2. Get all payments for this customer
    const customerPayments = state.utangPayments.filter((p) => p.customer_id === custId)

    // 3. Combine events in chronological order (oldest first) to compute running balances
    const events = []

    customerSales.forEach((s) => {
      const netDebt = toMoney(s.total_amount - s.amount_paid)
      events.push({
        id: `sale-${s.id}`,
        type: 'sale',
        date: s.created_at,
        title: `Utang Sale (${s.sale_no})`,
        meta: `${s.items.length} items · Resibo ${s.sale_no}`,
        amount: netDebt,
        amountTone: 'utang',
        reference: s.sale_no,
        sale: s,
      })
    })

    customerPayments.forEach((p) => {
      events.push({
        id: `payment-${p.id}`,
        type: 'payment',
        date: p.payment_date,
        title: 'Pagbabayad ng Utang',
        meta: p.notes || 'Bayad sa tindahan',
        amount: -p.amount,
        amountTone: 'success',
        reference: `PAY-${p.id}`,
        payment: p,
      })
    })

    // Sort ascending by date for chronological calculation
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let running = 0
    const timeline = events.map((ev) => {
      running = toMoney(running + ev.amount)
      return {
        ...ev,
        balance: Math.max(0, running),
      }
    })

    // Sort descending for display (newest first)
    timeline.reverse()

    return {
      data: {
        customer,
        timeline,
        current_balance: customer.credit_balance,
      },
    }
  },
}

export default customerService
