/**
 * Future Laravel Endpoints:
 * - GET    /api/sales                  -> SaleController@index
 * - POST   /api/sales                  -> SaleController@store
 * - GET    /api/sales/{id}             -> SaleController@show
 * - POST   /api/sales/{id}/void        -> SaleController@void
 */

import { useMockDb } from '../../mocks/db.js'
import {
  delay,
  ApiError,
  paginate,
  applySearch,
  applySort,
} from '../../lib/mockApi.js'
import { getCurrentUser, getCurrentUserRole } from '../../lib/authBridge.js'

function toMoney(n) {
  return Math.round(n * 100) / 100
}

export const saleService = {
  /**
   * Retrieves paginated sales history with optional date range, payment, and cashier filters.
   * Future: GET /api/sales
   */
  async list(params = {}) {
    await delay()
    const {
      q = '',
      from,
      to,
      payment_type,
      status,
      user_id,
      customer_id,
      page = 1,
      per_page = 15,
      sort = '-created_at',
    } = params

    let items = [...useMockDb.getState().sales]

    // Cashier sees only own sales
    const role = getCurrentUserRole()
    const currentUser = getCurrentUser()
    if (role === 'cashier' && currentUser) {
      items = items.filter((s) => s.user_id === currentUser.id)
    }

    if (payment_type) {
      items = items.filter((s) => s.payment_type === payment_type)
    }

    if (status) {
      items = items.filter((s) => s.status === status)
    }

    if (user_id) {
      items = items.filter((s) => String(s.user_id) === String(user_id))
    }

    if (customer_id) {
      items = items.filter((s) => String(s.customer_id) === String(customer_id))
    }

    if (from) {
      const fromTime = new Date(from).getTime()
      items = items.filter((s) => new Date(s.created_at).getTime() >= fromTime)
    }

    if (to) {
      const toTime = new Date(to).getTime()
      items = items.filter((s) => new Date(s.created_at).getTime() <= toTime)
    }

    items = applySearch(items, q, ['sale_no'])
    items = applySort(items, sort)

    // Compute summary metrics for current filtered results before pagination
    const completedItems = items.filter((s) => s.status === 'completed')
    const totalAmount = toMoney(
      completedItems.reduce((acc, s) => acc + (s.total_amount ?? s.total ?? 0), 0),
    )
    const totalCount = items.length
    const averageSale =
      completedItems.length > 0 ? toMoney(totalAmount / completedItems.length) : 0

    const { staff, customers } = useMockDb.getState()
    const staffMap = new Map(staff.map((u) => [u.id, u]))
    const customerMap = new Map(customers.map((c) => [c.id, c]))

    const enrichedItems = items.map((s) => {
      const cashier = staffMap.get(s.user_id)
      const customer = s.customer_id ? customerMap.get(s.customer_id) : null
      return {
        ...s,
        cashier: cashier ? { id: cashier.id, name: cashier.name, role: cashier.role } : null,
        customer: customer
          ? {
              id: customer.id,
              name: customer.name,
              nickname: customer.nickname,
              contact_number: customer.contact_number,
            }
          : null,
      }
    })

    const paginated = paginate(enrichedItems, page, per_page)

    return {
      ...paginated,
      summary: {
        total_amount: totalAmount,
        total_count: totalCount,
        average_sale: averageSale,
      },
    }
  },

  /**
   * Retrieves single sale with items, cashier details, and customer info.
   * Future: GET /api/sales/{id}
   */
  async get(id) {
    await delay()
    const sale = useMockDb.getState().sales.find((s) => s.id === Number(id))
    if (!sale) {
      throw new ApiError(404, 'Sale not found.')
    }

    const { staff, customers } = useMockDb.getState()
    const cashier = staff.find((u) => u.id === sale.user_id)
    const customer = sale.customer_id
      ? customers.find((c) => c.id === sale.customer_id)
      : null

    return {
      data: {
        ...sale,
        cashier: cashier ? { id: cashier.id, name: cashier.name, role: cashier.role } : null,
        customer: customer
          ? {
              id: customer.id,
              name: customer.name,
              nickname: customer.nickname,
              contact_number: customer.contact_number,
              credit_balance: customer.credit_balance,
            }
          : null,
      },
    }
  },

  /**
   * Processes a new POS checkout sale with stock deduction and optional utang logging.
   * Future: POST /api/sales
   *
   * @param {Array<{ product_id: number, quantity: number }>} cartItems
   * @param {{
   *   payment_type: 'cash' | 'utang',
   *   amount_paid: number,
   *   customer_id?: number,
   *   notes?: string
   * }} payment
   */
  async create(cartItems = [], payment = {}) {
    await delay()
    const currentUser = getCurrentUser()
    const state = useMockDb.getState()

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new ApiError(422, {
        message: 'Cart cannot be empty.',
        errors: { cart: ['Maglagay ng kahit isang produkto sa cart.'] },
      })
    }

    const errors = {}

    // 1. Stock check & active checks
    const preparedItems = []
    let computedTotal = 0

    for (let idx = 0; idx < cartItems.length; idx++) {
      const item = cartItems[idx]
      const prod = state.products.find((p) => p.id === Number(item.product_id))

      if (!prod) {
        errors[`cart.${idx}.product_id`] = ['Product does not exist.']
        continue
      }

      if (!prod.is_active) {
        errors[`cart.${idx}.is_active`] = [
          `Ang "${prod.name}" ay hindi na aktibo at hindi maaaring ibenta.`,
        ]
        continue
      }

      const qty = parseInt(item.quantity, 10)
      if (isNaN(qty) || qty <= 0) {
        errors[`cart.${idx}.quantity`] = ['Quantity must be at least 1.']
        continue
      }

      if (qty > prod.stock_quantity) {
        errors[`cart.${idx}.stock`] = [
          `Kulang ang stock para sa "${prod.name}". Mayroon na lamang ${prod.stock_quantity} pcs.`,
        ]
        continue
      }

      const subtotal = toMoney(prod.price * qty)
      computedTotal = toMoney(computedTotal + subtotal)

      preparedItems.push({
        id: idx + 1,
        product_id: prod.id,
        product_name: prod.name,
        quantity: qty,
        unit_price: prod.price,
        unit_cost: prod.cost_price,
        subtotal,
      })
    }

    // 2. Payment verification
    const paymentType = payment.payment_type || 'cash'
    let amountPaid = Number(payment.amount_paid || 0)
    let changeAmount = 0
    let targetCustomerId = null

    if (paymentType === 'cash') {
      if (isNaN(amountPaid) || amountPaid < computedTotal) {
        errors.amount_paid = [
          `Kulang ang perang ibinayad. Kailangan ng hindi bababa sa ₱${computedTotal.toFixed(2)}.`,
        ]
      } else {
        changeAmount = toMoney(amountPaid - computedTotal)
      }
    } else if (paymentType === 'utang') {
      if (!payment.customer_id) {
        errors.customer_id = ['Pumili ng suki para sa pagpapalista ng utang.']
      } else {
        const customer = state.customers.find((c) => c.id === Number(payment.customer_id))
        if (!customer) {
          errors.customer_id = ['Hindi nahanap ang kustomer.']
        } else {
          targetCustomerId = customer.id
          if (amountPaid < 0) amountPaid = 0
          changeAmount = 0
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(422, { message: 'The checkout data was invalid.', errors })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const datePrefix = `${yyyy}${mm}${dd}`

    // Find daily sequence restarting daily
    const todaysSales = state.sales.filter((s) => s.sale_no.startsWith(`TT-${datePrefix}`))
    const dailySeq = todaysSales.length + 1
    const saleNo = `TT-${datePrefix}-${String(dailySeq).padStart(4, '0')}`

    const saleId = state.nextIds.sale++

    const finalSale = {
      id: saleId,
      sale_no: saleNo,
      user_id: currentUser.id,
      customer_id: targetCustomerId,
      total_amount: computedTotal,
      payment_type: paymentType,
      amount_paid: amountPaid,
      change_amount: changeAmount,
      status: 'completed',
      created_at: nowIso,
      items: preparedItems.map((pi) => ({ ...pi, sale_id: saleId })),
    }

    // 3. Deduct stock & create StockMovement
    const updatedProducts = [...state.products]
    const newMovements = []

    for (const item of preparedItems) {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.product_id)
      if (prodIndex !== -1) {
        const currentStock = updatedProducts[prodIndex].stock_quantity
        const newStock = Math.max(0, currentStock - item.quantity)
        updatedProducts[prodIndex] = {
          ...updatedProducts[prodIndex],
          stock_quantity: newStock,
          updated_at: nowIso,
        }

        newMovements.push({
          id: state.nextIds.movement++,
          product_id: item.product_id,
          type: 'sale',
          quantity: -item.quantity,
          stock_after: newStock,
          reference: saleNo,
          notes: `POS sale ${saleNo}`,
          user_id: currentUser.id,
          created_at: nowIso,
        })
      }
    }

    state.setProducts(updatedProducts)
    state.setStockMovements((prev) => [...newMovements, ...prev])

    // 4. Update customer credit balance if utang
    if (paymentType === 'utang' && targetCustomerId) {
      const debtIncrease = toMoney(computedTotal - amountPaid)
      state.setCustomers((prev) =>
        prev.map((c) =>
          c.id === targetCustomerId
            ? { ...c, credit_balance: toMoney(c.credit_balance + debtIncrease) }
            : c,
        ),
      )
    }

    // 5. Append sale to database
    state.setSales((prev) => [finalSale, ...prev])

    return { data: finalSale }
  },

  /**
   * Voids an existing sale, reversing stock deductions and reversing customer utang.
   * Future: POST /api/sales/{id}/void
   */
  async void(id, reason = '') {
    await delay()
    const currentUser = getCurrentUser()
    const userRole = getCurrentUserRole()

    // Business rule: only owner can void
    if (userRole !== 'owner') {
      throw new ApiError(403, {
        message: 'Tanging Store Owner lamang ang may permiso na mag-void ng resibo.',
      })
    }

    if (!reason?.trim() || reason.trim().length < 4) {
      throw new ApiError(422, {
        message: 'A void reason is required.',
        errors: {
          reason: ['Kailangan ng hindi bababa sa 4 na karakter para sa dahilan ng pag-void.'],
        },
      })
    }

    const saleId = Number(id)
    const state = useMockDb.getState()
    const sale = state.sales.find((s) => s.id === saleId)

    if (!sale) {
      throw new ApiError(404, 'Sale not found.')
    }

    if (sale.status === 'voided') {
      throw new ApiError(422, {
        message: 'This sale has already been voided.',
        errors: { status: ['Nai-void na ang transaksyong ito dati.'] },
      })
    }

    const nowIso = new Date().toISOString()

    // 1. Restore product stock and log movements
    const updatedProducts = [...state.products]
    const voidMovements = []

    for (const item of sale.items) {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.product_id)
      if (prodIndex !== -1) {
        const restoredStock = updatedProducts[prodIndex].stock_quantity + item.quantity
        updatedProducts[prodIndex] = {
          ...updatedProducts[prodIndex],
          stock_quantity: restoredStock,
          updated_at: nowIso,
        }

        voidMovements.push({
          id: state.nextIds.movement++,
          product_id: item.product_id,
          type: 'void',
          quantity: item.quantity,
          stock_after: restoredStock,
          reference: sale.sale_no,
          notes: `Voided sale: ${reason.trim()}`,
          user_id: currentUser.id,
          created_at: nowIso,
        })
      }
    }

    state.setProducts(updatedProducts)
    state.setStockMovements((prev) => [...voidMovements, ...prev])

    // 2. Reverse customer utang balance if utang sale
    if (sale.payment_type === 'utang' && sale.customer_id) {
      const debtReversal = toMoney(sale.total_amount - sale.amount_paid)
      state.setCustomers((prev) =>
        prev.map((c) =>
          c.id === sale.customer_id
            ? { ...c, credit_balance: Math.max(0, toMoney(c.credit_balance - debtReversal)) }
            : c,
        ),
      )
    }

    // 3. Mark sale as voided
    const voidedSale = {
      ...sale,
      status: 'voided',
      void_reason: reason.trim(),
      voided_by: currentUser.id,
      voided_at: nowIso,
    }

    state.setSales((prev) => prev.map((s) => (s.id === saleId ? voidedSale : s)))

    return { data: voidedSale }
  },
}

export default saleService
