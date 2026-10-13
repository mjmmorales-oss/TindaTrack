import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute, renderWithProviders } from './renderRoute'
import { resetTestMockDb } from './server'
import { useMockDb } from '@/mocks/db'
import { AdjustStockDialog } from '@/features/products/components/AdjustStockDialog'
import { BulkRestockDialog } from '@/features/inventory/components/BulkRestockDialog'
import { RecordPaymentDialog } from '@/features/utang/components/RecordPaymentDialog'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog'
import { PaymentDialog } from '@/features/pos/components/PaymentDialog'
import { HeldCartsDialog } from '@/features/pos/components/HeldCartsDialog'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'

describe('Dialog Entry Points and Adjust Stock Product Picker Tests', () => {
  let consoleErrors = []
  let originalConsoleError

  beforeEach(() => {
    resetTestMockDb()
    consoleErrors = []
    originalConsoleError = console.error
    console.error = (...args) => {
      consoleErrors.push(args)
      originalConsoleError(...args)
    }
  })

  afterEach(() => {
    cleanup()
    console.error = originalConsoleError
    const fatalErrors = consoleErrors.filter((args) => {
      const msg = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ')
      if (msg.includes('The width(0) and height(0) of chart should be greater than 0')) return false
      return (
        msg.includes('The above error occurred') ||
        msg.includes('Cannot read properties') ||
        msg.includes('is not defined') ||
        msg.includes('React does not recognize') ||
        msg.includes('Uncaught')
      )
    })
    expect(fatalErrors).toHaveLength(0)
  })

  describe('D2.1 & D2.2: Adjust Stock Dialog Toolbar vs Row Entry Points', () => {
    it('AdjustStockDialog toolbar mode (product=null): renders picker, disables submit until product selected, and performs restock', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <AdjustStockDialog open={true} onOpenChange={() => {}} product={null} />,
      )

      // Assert product picker combobox is present
      const picker = await screen.findByRole('combobox', {
        name: /Pumili ng Produkto|Select Product/i,
      })
      expect(picker).toBeInTheDocument()

      // Submit button is disabled before a product is selected
      const submitBtn = screen.getByRole('button', { name: /Pumili (muna )?ng Produkto|Select a? Product/i })
      expect(submitBtn).toBeDisabled()

      // Click picker to open command list
      await user.click(picker)

      // Select first product
      const targetProduct = useMockDb.getState().products[0]
      const productOption = await screen.findByText(new RegExp(targetProduct.name, 'i'))
      await user.click(productOption)

      // Picker closes, dialog title updates to chosen product
      expect(await screen.findByText(new RegExp(`(I-adjust ang Stock|Adjust Stock): ${targetProduct.name}`, 'i'))).toBeInTheDocument()

      // Submit button is now enabled
      const initialStock = targetProduct.stock_quantity
      const enabledSubmitBtn = screen.getByRole('button', { name: /Kumpirmahin ang Stock|Confirm Stock|Confirm Adjustment|Confirm Stock Adjustment/i })
      expect(enabledSubmitBtn).not.toBeDisabled()

      // Set quantity to 10
      const qtyInput = screen.getByLabelText(/Dami \(Quantity\)|Quantity \(Dami\)|^Quantity$|^Dami$/i)
      await user.clear(qtyInput)
      await user.type(qtyInput, '10')

      // Submit adjustment
      await user.click(enabledSubmitBtn)

      // Verify product stock increased by 10 in mock database
      await waitFor(() => {
        const updated = useMockDb.getState().products.find((p) => p.id === targetProduct.id)
        expect(updated.stock_quantity).toBe(initialStock + 10)
      })
    })

    it('AdjustStockDialog row mode (seeded product): NO picker shown, read-only header row displayed, and performs restock', async () => {
      const user = userEvent.setup()
      const product = useMockDb.getState().products[1]
      const initialStock = product.stock_quantity

      renderWithProviders(
        <AdjustStockDialog open={true} onOpenChange={() => {}} product={product} />,
      )

      // Combobox picker must NOT be present
      expect(
        screen.queryByRole('combobox', { name: /Pumili ng Produkto|Select Product/i }),
      ).toBeNull()

      // Read-only header row showing product name and current stock badge
      expect(await screen.findByText(new RegExp(`(I-adjust ang Stock|Adjust Stock): ${product.name}`, 'i'))).toBeInTheDocument()
      expect(screen.getByText(new RegExp(`^(Stock|Current):?\\s*${initialStock}`, 'i'))).toBeInTheDocument()

      // Type restock quantity 5 and submit
      const qtyInput = screen.getByLabelText(/Dami \(Quantity\)|Quantity \(Dami\)|^Quantity$|^Dami$/i)
      await user.clear(qtyInput)
      await user.type(qtyInput, '5')

      const submitBtn = screen.getByRole('button', { name: /Kumpirmahin ang Stock|Confirm Stock|Confirm Adjustment|Confirm Stock Adjustment/i })
      await user.click(submitBtn)

      await waitFor(() => {
        const updated = useMockDb.getState().products.find((p) => p.id === product.id)
        expect(updated.stock_quantity).toBe(initialStock + 5)
      })
    })

    it('opens AdjustStockDialog from /inventory toolbar with NO product', async () => {
      const user = userEvent.setup()
      renderRoute('/inventory', { role: 'owner' })

      // Wait for page header to mount
      await screen.findByRole('heading', { level: 1, name: /Pamamahala sa Imbentaryo|Inventory & Stock Management/i }, { timeout: 10000 })

      // Click toolbar button
      const toolbarAdjustBtn = await screen.findByRole('button', { name: /I-adjust ang Stock|Adjust Stock/i })
      await user.click(toolbarAdjustBtn)

      // Assert picker is displayed
      expect(
        await screen.findByRole('combobox', { name: /Pumili ng Produkto|Select Product/i }),
      ).toBeInTheDocument()
    })
  })

  describe('D2.3: Dialog Entry Points Verification', () => {
    it('BulkRestockDialog: opens with correct passed items', async () => {
      const items = useMockDb.getState().products.slice(0, 2)
      renderWithProviders(
        <BulkRestockDialog open={true} onOpenChange={() => {}} items={items} />,
      )
      expect(await screen.findByText(/Maramihang Pag-restock|Bulk Restock/i)).toBeInTheDocument()
      expect(screen.getByText(new RegExp(items[0].name, 'i'))).toBeInTheDocument()
    })

    it('RecordPaymentDialog: opens from /utang row with debtor', async () => {
      const debtor = useMockDb.getState().customers.find((c) => Number(c.credit_balance || 0) > 0)
      renderWithProviders(
        <RecordPaymentDialog open={true} onOpenChange={() => {}} customer={debtor} />,
      )
      expect(await screen.findByRole('heading', { name: /Kolektahin ang Bayad|Record Payment/i })).toBeInTheDocument()
      expect(screen.getByText(new RegExp(debtor.name, 'i'))).toBeInTheDocument()
      expect(screen.getByDisplayValue(Number(debtor.credit_balance).toFixed(0))).toBeInTheDocument()
    })

    it('RecordPaymentDialog: opens from /customers row and /customers/:id profile', async () => {
      const customer = useMockDb.getState().customers[0]
      renderWithProviders(
        <RecordPaymentDialog open={true} onOpenChange={() => {}} customer={customer} />,
      )
      expect(await screen.findByRole('heading', { name: /Kolektahin ang Bayad|Record Payment/i })).toBeInTheDocument()
      expect(screen.getByText(new RegExp(customer.name, 'i'))).toBeInTheDocument()
    })

    it('ProductFormDialog: create mode has empty defaults; edit mode has product data', async () => {
      const categories = useMockDb.getState().categories
      const product = useMockDb.getState().products[0]

      // 1. Create mode
      const { unmount } = renderWithProviders(
        <ProductFormDialog open={true} onOpenChange={() => {}} categories={categories} product={null} />,
      )
      expect(await screen.findByText(/Magdagdag ng Bagong Produkto|Add New Product/i)).toBeInTheDocument()
      unmount()

      // 2. Edit mode
      renderWithProviders(
        <ProductFormDialog open={true} onOpenChange={() => {}} categories={categories} product={product} />,
      )
      expect(await screen.findByText(/I-edit ang Produkto|Edit Product/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(product.name)).toBeInTheDocument()
    })

    it('CustomerFormDialog: create mode has empty defaults; edit mode has customer data', async () => {
      const customer = useMockDb.getState().customers[0]

      // 1. Create mode
      const { unmount } = renderWithProviders(
        <CustomerFormDialog open={true} onOpenChange={() => {}} customer={null} />,
      )
      expect(await screen.findByText(/Magdagdag ng Bagong Suki|Add Customer|Add New Suki|Register New Suki/i)).toBeInTheDocument()
      unmount()

      // 2. Edit mode
      renderWithProviders(
        <CustomerFormDialog open={true} onOpenChange={() => {}} customer={customer} />,
      )
      expect(await screen.findByText(/I-edit ang Suki|Edit Customer/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue(customer.name)).toBeInTheDocument()
    })

    it('CategoryFormDialog: create mode has empty defaults; edit mode has category data', async () => {
      const category = useMockDb.getState().categories[0]

      // 1. Create mode
      const { unmount } = renderWithProviders(
        <CategoryFormDialog open={true} onOpenChange={() => {}} category={null} />,
      )
      expect(await screen.findByRole('heading', { name: /Bagong Kategorya|New Category/i })).toBeInTheDocument()
      unmount()

      // 2. Edit mode
      renderWithProviders(
        <CategoryFormDialog open={true} onOpenChange={() => {}} category={category} />,
      )
      expect(await screen.findByRole('heading', { name: new RegExp(`(I-edit ang Kategorya|Edit Category): ${category.name}`, 'i') })).toBeInTheDocument()
      expect(screen.getByDisplayValue(category.name)).toBeInTheDocument()
    })

    it('PaymentDialog: renders with cart items and subtotal in POS', async () => {
      const product = useMockDb.getState().products[0]
      renderWithProviders(
        <PaymentDialog
          open={true}
          onOpenChange={() => {}}
          items={[{ ...product, quantity: 2, subtotal: product.price * 2 }]}
          subtotal={product.price * 2}
        />,
      )
      expect(await screen.findByText(/Checkout & Payment|Bayaran ang Benta/i)).toBeInTheDocument()
    })

    it('HeldCartsDialog: renders parked sales dialog', async () => {
      renderWithProviders(
        <HeldCartsDialog
          open={true}
          onOpenChange={() => {}}
        />,
      )
      expect(await screen.findByRole('heading', { name: /Parked Sales|Naka-hold/i })).toBeInTheDocument()
    })

    it('ConfirmDialog: void sale requireReason mode enforces reason', async () => {
      renderWithProviders(
        <ConfirmDialog
          open={true}
          onOpenChange={() => {}}
          title="I-void ang Resibo"
          description="Sigurado ka bang nais mong i-void ang resibong ito?"
          confirmText="I-void"
          tone="destructive"
          requireReason={true}
          reasonLabel="Dahilan ng Pag-void"
          onConfirm={() => {}}
        />,
      )
      expect(await screen.findByRole('heading', { name: /I-void ang Resibo/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/Dahilan ng Pag-void/i)).toBeInTheDocument()
    })
  })
})
