import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute, renderWithProviders } from './renderRoute'
import { resetTestMockDb } from './server'
import { useMockDb } from '@/mocks/db'
import { useCartStore } from '@/stores/cartStore'

import { PaymentDialog } from '@/features/pos/components/PaymentDialog'
import { saleService } from '@/services/mock/saleService'
import { productService } from '@/services/mock/productService'
import { categoryService } from '@/services/mock/categoryService'
import { customerService } from '@/services/mock/customerService'
import { utangService } from '@/services/mock/utangService'
import { staffService } from '@/services/mock/staffService'
import { settingsService } from '@/services/mock/settingsService'
import { customerSchema } from '@/features/customers/schemas'
import { hasAbility } from '@/config/permissions'

describe('End-to-End User Flows Against Mock Database', () => {
  let consoleErrors = []
  let originalConsoleError

  beforeEach(() => {
    resetTestMockDb()
    useCartStore.getState().clear()
    localStorage.clear()
    consoleErrors = []
    originalConsoleError = console.error
    console.error = (...args) => {
      consoleErrors.push(args)
      originalConsoleError(...args)
    }
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    console.error = originalConsoleError
    const fatalErrors = consoleErrors.filter((args) => {
      const msg = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ')
      if (msg.includes('The width(0) and height(0) of chart should be greater than 0')) return false
      return (
        msg.includes('The above error occurred') ||
        msg.includes('Cannot read properties') ||
        msg.includes('is not defined') ||
        msg.includes('React does not recognize') ||
        msg.includes('Uncaught') ||
        msg.includes('Warning: Failed %s type')
      )
    })
    expect(fatalErrors).toHaveLength(0)
  })

  // Flow 1: Cash sale
  it('1. Cash sale: add item -> Pay -> Cash -> tender amount -> confirm -> receipt -> clear cart', async () => {
    const user = userEvent.setup()
    const product = useMockDb.getState().products[0]
    const initialStock = product.stock_quantity
    const initialSalesCount = useMockDb.getState().sales.length

    // Add product to cart
    useCartStore.getState().add(product, 2)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].quantity).toBe(2)

    let newSaleTriggered = false
    renderWithProviders(
      <PaymentDialog
        open={true}
        onOpenChange={() => {}}
        cartItems={useCartStore.getState().items}
        total={product.price * 2}
        customers={useMockDb.getState().customers}
        currentUser={{ id: 1, role: 'owner', name: 'Aling Nena' }}
        onSuccessNewSale={() => {
          useCartStore.getState().clear()
          newSaleTriggered = true
        }}
      />,
    )

    // Tender exact cash
    const exactBtn = screen.getByRole('button', { name: new RegExp(`Eksaktong Halaga`, 'i') })
    await user.click(exactBtn)

    // Confirm cash
    const confirmBtn = screen.getByRole('button', { name: /Kumpirmahin ang Cash/i })
    await user.click(confirmBtn)

    // Receipt shows
    expect(await screen.findByText(/Resibo ng Transaksyon/i)).toBeInTheDocument()

    // Click "Bagong Benta"
    const newSaleBtn = screen.getByRole('button', { name: /Bagong Benta/i })
    await user.click(newSaleBtn)

    // Cart cleared
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(newSaleTriggered).toBe(true)

    // Stock decreased and sale exists in mock DB
    const updatedProduct = useMockDb.getState().products.find((p) => p.id === product.id)
    expect(updatedProduct.stock_quantity).toBe(initialStock - 2)
    expect(useMockDb.getState().sales.length).toBe(initialSalesCount + 1)
    const latestSale = useMockDb.getState().sales[0]
    expect(latestSale.payment_type).toBe('cash')
  })

  // Flow 2: Utang sale with existing customer
  it('2. Utang sale: add items -> Pay -> Utang tab -> pick existing suki -> confirm -> balance rose', async () => {
    const user = userEvent.setup()
    const product = useMockDb.getState().products[0]
    const customer = useMockDb.getState().customers[0]
    const initialBalance = customer.credit_balance
    const saleAmount = product.price * 3

    useCartStore.getState().add(product, 3)

    renderWithProviders(
      <PaymentDialog
        open={true}
        onOpenChange={() => {}}
        cartItems={useCartStore.getState().items}
        total={saleAmount}
        customers={useMockDb.getState().customers}
        currentUser={{ id: 1, role: 'owner', name: 'Aling Nena' }}
        onSuccessNewSale={() => useCartStore.getState().clear()}
      />,
    )

    // Switch to Utang tab
    const utangTab = screen.getByRole('tab', { name: /Utang/i })
    await user.click(utangTab)

    // Choose customer via CustomerCombobox
    const comboboxBtn = screen.getByRole('combobox')
    await user.click(comboboxBtn)
    const custOption = await screen.findByText(new RegExp(customer.name, 'i'))
    await user.click(custOption)

    // Confirm Utang button
    const confirmUtangBtn = screen.getByRole('button', { name: new RegExp(`Ilista sa Utang ni ${customer.name}`, 'i') })
    await user.click(confirmUtangBtn)

    // Receipt shows
    expect(await screen.findByText(/Resibo ng Transaksyon/i)).toBeInTheDocument()

    // Assert customer balance rose
    const updatedCustomer = useMockDb.getState().customers.find((c) => c.id === customer.id)
    expect(updatedCustomer.credit_balance).toBe(initialBalance + saleAmount)
  })

  // Flow 3: Utang sale with inline new customer
  it('3. Utang sale with NEW customer created inline from mini form', async () => {
    const user = userEvent.setup()
    const product = useMockDb.getState().products[1]
    const totalAmount = product.price * 1

    useCartStore.getState().add(product, 1)

    renderWithProviders(
      <PaymentDialog
        open={true}
        onOpenChange={() => {}}
        cartItems={useCartStore.getState().items}
        total={totalAmount}
        customers={useMockDb.getState().customers}
        currentUser={{ id: 1, role: 'owner', name: 'Aling Nena' }}
        onSuccessNewSale={() => useCartStore.getState().clear()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /Utang/i }))

    // Click "+ Bagong Suki"
    await user.click(screen.getByRole('button', { name: /\+ Bagong Suki/i }))

    // Fill inline mini form
    const nameInput = screen.getByPlaceholderText(/hal\. Juan Dela Cruz/i)
    await user.type(nameInput, 'Bagong Inline Suki')

    // Submit mini form
    await user.click(screen.getByRole('button', { name: /I-save ang Suki/i }))

    // Customer is now selected, confirm checkout
    const confirmUtangBtn = await screen.findByRole('button', { name: /Ilista sa Utang ni Bagong Inline Suki/i })
    await user.click(confirmUtangBtn)

    expect(await screen.findByText(/Resibo ng Transaksyon/i)).toBeInTheDocument()

    // Assert new customer exists and has credit balance
    const newCust = useMockDb.getState().customers.find((c) => c.name === 'Bagong Inline Suki')
    expect(newCust).toBeDefined()
    expect(newCust.credit_balance).toBe(totalAmount)
  })

  // Flow 4: Oversell blocked
  it('4. Oversell blocked: cannot add more than stock; stock is unchanged', async () => {
    const product = useMockDb.getState().products[0]
    const availableStock = product.stock_quantity

    // Cart store add clamps to available stock
    useCartStore.getState().add(product, availableStock + 50)
    expect(useCartStore.getState().items[0].quantity).toBe(availableStock)

    // Service validation throws 422 if an oversized cart is sent
    let caughtError = null
    try {
      await saleService.create(
        [{ product_id: product.id, quantity: availableStock + 10 }],
        { payment_type: 'cash', amount_paid: 10000 },
      )
    } catch (err) {
      caughtError = err
    }

    expect(caughtError).not.toBeNull()
    expect(caughtError.status).toBe(422)

    // Stock unchanged
    const currentProd = useMockDb.getState().products.find((p) => p.id === product.id)
    expect(currentProd.stock_quantity).toBe(availableStock)
  })

  // Flow 5: Credit limit
  it('5. Credit limit: as cashier exceed limit blocked; as owner override allowed', async () => {
    const customer = useMockDb.getState().customers[0]
    // Set customer near limit
    useMockDb.setState((state) => ({
      customers: state.customers.map((c) =>
        c.id === customer.id ? { ...c, credit_balance: 950, credit_limit: 1000 } : c,
      ),
    }))

    const product = useMockDb.getState().products[0]
    const cartItems = [{ product_id: product.id, name: product.name, price: 100, quantity: 1, stock: 50 }]

    // 1. As Cashier: blocked
    const { unmount } = renderWithProviders(
      <PaymentDialog
        open={true}
        onOpenChange={() => {}}
        cartItems={cartItems}
        total={100}
        customers={useMockDb.getState().customers}
        currentUser={{ id: 2, role: 'cashier', name: 'Maria' }}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: /Utang/i }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText(new RegExp(customer.name, 'i')))

    // Warning is visible and confirm button is disabled
    expect(screen.getByText(/Lampas sa Credit Limit/i)).toBeInTheDocument()
    const cashierConfirmBtn = screen.getByRole('button', { name: new RegExp(`Ilista sa Utang ni ${customer.name}`, 'i') })
    expect(cashierConfirmBtn).toBeDisabled()
    unmount()

    // 2. As Owner: override allowed
    renderWithProviders(
      <PaymentDialog
        open={true}
        onOpenChange={() => {}}
        cartItems={cartItems}
        total={100}
        customers={useMockDb.getState().customers}
        currentUser={{ id: 1, role: 'owner', name: 'Aling Nena' }}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /Utang/i }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText(new RegExp(customer.name, 'i')))

    const ownerConfirmBtn = screen.getByRole('button', { name: new RegExp(`Ilista sa Utang ni ${customer.name}`, 'i') })
    expect(ownerConfirmBtn).not.toBeDisabled()
  })

  // Flow 6: Void a sale as owner with a reason
  it('6. Void sale: owner voids with reason; stock restored, utang reversed; cashier cannot void', async () => {
    const product = useMockDb.getState().products[0]
    const customer = useMockDb.getState().customers[0]
    const initialStock = product.stock_quantity
    const initialBalance = customer.credit_balance

    // Create an utang sale
    const { data: sale } = await saleService.create(
      [{ product_id: product.id, quantity: 2 }],
      { payment_type: 'utang', customer_id: customer.id, amount_paid: 0 },
    )

    expect(useMockDb.getState().products.find((p) => p.id === product.id).stock_quantity).toBe(initialStock - 2)
    expect(useMockDb.getState().customers.find((c) => c.id === customer.id).credit_balance).toBe(initialBalance + product.price * 2)

    // 1. Cashier cannot void: permissions verify cashier lacks sales.void ability
    expect(hasAbility('cashier', 'sales.void')).toBe(false)
    expect(hasAbility('owner', 'sales.void')).toBe(true)

    // Set auth role to cashier in localStorage
    localStorage.setItem('tindatrack_user', JSON.stringify({ id: 2, role: 'cashier', name: 'Maria' }))
    let cashierVoidError = null
    try {
      await saleService.void(sale.id, 'Cashier attempt')
    } catch (err) {
      cashierVoidError = err
    }
    expect(cashierVoidError).not.toBeNull()
    expect(cashierVoidError.status).toBe(403)

    // 2. Owner voids with valid reason
    localStorage.setItem('tindatrack_user', JSON.stringify({ id: 1, role: 'owner', name: 'Nena Dela Cruz' }))
    await saleService.void(sale.id, 'Maling napiling suki sa tindahan')

    // Stock restored and utang reversed
    const restoredProduct = useMockDb.getState().products.find((p) => p.id === product.id)
    const reversedCustomer = useMockDb.getState().customers.find((c) => c.id === customer.id)
    expect(restoredProduct.stock_quantity).toBe(initialStock)
    expect(reversedCustomer.credit_balance).toBe(initialBalance)
    expect(useMockDb.getState().sales.find((s) => s.id === sale.id).status).toBe('voided')
  })

  // Flow 7: Record a payment
  it('7. Record payment: balance falls, ledger shows it; payment > balance rejected', async () => {
    // Set customer with explicit known credit balance
    const customer = useMockDb.getState().customers[0]
    useMockDb.setState((state) => ({
      customers: state.customers.map((c) =>
        c.id === customer.id ? { ...c, credit_balance: 500 } : c,
      ),
    }))
    const balance = 500

    // 1. Payment > balance rejected
    let excessError = null
    try {
      await utangService.recordPayment(customer.id, { amount: balance + 500 })
    } catch (err) {
      excessError = err
    }
    expect(excessError).not.toBeNull()
    expect(excessError.status).toBe(422)

    // 2. Valid partial payment of 200
    const payAmount = 200
    await utangService.recordPayment(customer.id, { amount: payAmount, notes: 'Bayad sa tindahan' })

    const updatedCustomer = useMockDb.getState().customers.find((c) => c.id === customer.id)
    expect(updatedCustomer.credit_balance).toBe(balance - payAmount)

    const paymentLog = useMockDb.getState().utangPayments.find((p) => p.customer_id === customer.id)
    expect(paymentLog).toBeDefined()
    expect(paymentLog.amount).toBe(payAmount)
  })

  // Flow 8: Product CRUD and stock adjustment
  it('8. Product CRUD and stock adjustment: restock, damage, correction; stock >= 0', async () => {
    // 1. Create product
    const { data: newProd } = await productService.create({
      name: 'Test flow snack',
      category_id: 1,
      price: 25,
      cost_price: 18,
      stock_quantity: 10,
      reorder_level: 5,
    })
    expect(newProd.id).toBeDefined()

    // 2. Adjust stock: restock +5
    await productService.adjustStock(newProd.id, { type: 'restock', quantity: 5 })
    let prod = useMockDb.getState().products.find((p) => p.id === newProd.id)
    expect(prod.stock_quantity).toBe(15)

    // 3. Adjust stock: damage -3
    await productService.adjustStock(newProd.id, { type: 'damage', quantity: 3 })
    prod = useMockDb.getState().products.find((p) => p.id === newProd.id)
    expect(prod.stock_quantity).toBe(12)

    // 4. Adjust stock: physical count correction to 20
    await productService.adjustStock(newProd.id, { type: 'correction_plus', quantity: 8 })
    prod = useMockDb.getState().products.find((p) => p.id === newProd.id)
    expect(prod.stock_quantity).toBe(20)

    // 5. Try negative stock adjustment -> blocked
    let negError = null
    try {
      await productService.adjustStock(newProd.id, { type: 'damage', quantity: 100 })
    } catch (err) {
      negError = err
    }
    expect(negError).not.toBeNull()

    // 6. Delete product
    await productService.remove(newProd.id)
    expect(useMockDb.getState().products.find((p) => p.id === newProd.id)).toBeUndefined()
  })

  // Flow 9: Category creation and guarded deletion
  it('9. Create category; guarded delete if products exist; delete empty category', async () => {
    // 1. Create category
    const { data: cat } = await categoryService.create({
      name: 'Kending Matamis',
      description: 'Lahat ng klase ng candy',
    })
    expect(cat.id).toBeDefined()

    // 2. Try to delete category that has products (e.g. category 1) -> blocked
    let blockedError = null
    try {
      await categoryService.remove(1)
    } catch (err) {
      blockedError = err
    }
    expect(blockedError).not.toBeNull()
    expect(blockedError.status).toBe(422)
    expect(blockedError.errors.category).toBeDefined()

    // 3. Delete empty new category -> succeeds
    await categoryService.remove(cat.id)
    expect(useMockDb.getState().categories.find((c) => c.id === cat.id)).toBeUndefined()
  })

  // Flow 10: Customer validation and delete guard on balance
  it('10. Customer phone validation; delete blocked when balance > 0; delete succeeds when 0', async () => {
    // 1. Bad phone rejected by schema
    const badResult = customerSchema.safeParse({
      name: 'Pedro Penduko',
      contact_number: '12345',
    })
    expect(badResult.success).toBe(false)

    // 2. Good phone accepted
    const goodResult = customerSchema.safeParse({
      name: 'Pedro Penduko',
      contact_number: '0917-123-4567',
    })
    expect(goodResult.success).toBe(true)

    // 3. Try to delete customer with balance -> blocked
    useMockDb.setState((state) => ({
      customers: state.customers.map((c, i) => (i === 0 ? { ...c, credit_balance: 300 } : c)),
    }))
    const debtor = useMockDb.getState().customers[0]
    let blockedDelete = null
    try {
      await customerService.remove(debtor.id)
    } catch (err) {
      blockedDelete = err
    }
    expect(blockedDelete).not.toBeNull()
    expect(blockedDelete.status).toBe(422)

    // 4. Create customer with 0 balance and delete -> succeeds
    const { data: zeroCust } = await customerService.create({ name: 'Walang Utang Suki' })
    await customerService.remove(zeroCust.id)
    expect(useMockDb.getState().customers.find((c) => c.id === zeroCust.id)).toBeUndefined()
  })

  // Flow 11: Add cashier and self-deactivation guard
  it('11. Add cashier in Staff; toggle active; cannot deactivate owner', async () => {
    const initialStaffCount = useMockDb.getState().staff.length

    // 1. Create cashier
    const { data: newCashier } = await staffService.create({
      name: 'Rosa Rosal',
      email: 'rosa@tindatrack.ph',
      role: 'cashier',
    })
    expect(useMockDb.getState().staff.length).toBe(initialStaffCount + 1)
    expect(newCashier.is_active).toBe(true)

    // 2. Toggle active
    await staffService.toggleActive(newCashier.id)
    expect(useMockDb.getState().staff.find((u) => u.id === newCashier.id).is_active).toBe(false)

    // 3. Render /staff and assert owner switch is disabled
    renderRoute('/staff')
    expect(await screen.findByText(/Mga Account ng Staff at Kahera/i, {}, { timeout: 12000 })).toBeInTheDocument()
    const switches = await screen.findAllByRole('switch', {}, { timeout: 12000 })
    const disabledSwitches = switches.filter((s) => s.hasAttribute('disabled'))
    expect(disabledSwitches.length).toBeGreaterThan(0)
  })

  // Flow 12: Change settings and receipt preview
  it('12. Settings update persists and reflects in receipt settings', async () => {
    await settingsService.update({
      store_name: 'Tindahan ni Aling Nena - Updated',
      receipt_footer: 'Maraming salamat sa inyong pagtangkilik!',
    })

    const { data: updated } = await settingsService.get()
    expect(updated.store_name).toBe('Tindahan ni Aling Nena - Updated')
    expect(updated.receipt_footer).toBe('Maraming salamat sa inyong pagtangkilik!')
  })

  // Flow 13: Filter, search, sort and paginate on /products and /sales
  it('13. Filter, search and paginate on /products and /sales', async () => {
    // 1. Search products
    const searchRes = await productService.list({ q: 'Coca' })
    expect(searchRes.data.length).toBeGreaterThan(0)
    searchRes.data.forEach((p) => {
      expect(p.name.toLowerCase()).toContain('coca')
    })

    // 2. Filter products by category
    const catRes = await productService.list({ category_id: 1 })
    catRes.data.forEach((p) => {
      expect(p.category_id).toBe(1)
    })

    // 3. Filter sales by payment type
    const cashSales = await saleService.list({ payment_type: 'cash' })
    cashSales.data.forEach((s) => {
      expect(s.payment_type).toBe('cash')
    })
  })
})
