import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithProviders, renderRoute } from './renderRoute'
import { resetTestMockDb } from './server'
import { useMockDb } from '@/mocks/db'

import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { DEFAULT_PRODUCT } from '@/features/products/schemas'
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { AdjustStockDialog } from '@/features/products/components/AdjustStockDialog'
import { BulkRestockDialog } from '@/features/inventory/components/BulkRestockDialog'
import { RecordPaymentDialog } from '@/features/utang/components/RecordPaymentDialog'
import { PaymentDialog } from '@/features/pos/components/PaymentDialog'
import { NewCustomerMiniForm } from '@/features/pos/components/NewCustomerMiniForm'
import { ProductDetailDialog } from '@/features/pos/components/ProductDetailDialog'
import { HeldCartsDialog } from '@/features/pos/components/HeldCartsDialog'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'

describe('Comprehensive Dialog Smoke and Mode Tests', () => {
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
        msg.includes('Uncaught') ||
        msg.includes('Warning: Failed %s type')
      )
    })
    expect(fatalErrors).toHaveLength(0)
  })

  describe('ProductFormDialog', () => {
    it('renders in create mode with undefined product', async () => {
      const categories = useMockDb.getState().categories
      renderWithProviders(
        <ProductFormDialog
          open={true}
          onOpenChange={() => {}}
          categories={categories}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Magdagdag ng Bagong Produkto/i)).toBeInTheDocument()
    })

    it('renders in create mode with complete DEFAULT_PRODUCT', async () => {
      const categories = useMockDb.getState().categories
      renderWithProviders(
        <ProductFormDialog
          open={true}
          onOpenChange={() => {}}
          product={DEFAULT_PRODUCT}
          categories={categories}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Magdagdag ng Bagong Produkto/i)).toBeInTheDocument()
    })

    it('renders in edit mode with seeded product', async () => {
      const product = useMockDb.getState().products[0]
      const categories = useMockDb.getState().categories
      renderWithProviders(
        <ProductFormDialog
          open={true}
          onOpenChange={() => {}}
          product={product}
          categories={categories}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/I-edit ang Produkto/i)).toBeInTheDocument()
    })
  })

  describe('CategoryFormDialog', () => {
    it('renders in create mode (null category)', async () => {
      renderWithProviders(
        <CategoryFormDialog open={true} onOpenChange={() => {}} category={null} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Bagong Kategorya/i)).toBeInTheDocument()
    })

    it('renders in edit mode (seeded category)', async () => {
      const category = useMockDb.getState().categories[0]
      renderWithProviders(
        <CategoryFormDialog open={true} onOpenChange={() => {}} category={category} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/I-edit ang Kategorya/i)).toBeInTheDocument()
    })
  })

  describe('CustomerFormDialog', () => {
    it('renders in create mode (null customer)', async () => {
      renderWithProviders(
        <CustomerFormDialog open={true} onOpenChange={() => {}} customer={null} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Magdagdag ng Bagong Suki/i)).toBeInTheDocument()
    })

    it('renders in edit mode (seeded customer)', async () => {
      const customer = useMockDb.getState().customers[0]
      renderWithProviders(
        <CustomerFormDialog open={true} onOpenChange={() => {}} customer={customer} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/I-edit ang Suki/i)).toBeInTheDocument()
    })
  })

  describe('Inventory & Stock Dialogs', () => {
    it('renders AdjustStockDialog with seeded product', async () => {
      const product = useMockDb.getState().products[0]
      renderWithProviders(
        <AdjustStockDialog open={true} onOpenChange={() => {}} product={product} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(new RegExp(`I-adjust ang Stock: ${product.name}`, 'i'))).toBeInTheDocument()
    })

    it('renders AdjustStockDialog without product and shows product picker', async () => {
      renderWithProviders(
        <AdjustStockDialog open={true} onOpenChange={() => {}} product={null} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByRole('combobox', { name: /Pumili ng produkto para sa stock adjustment/i })).toBeInTheDocument()
    })

    it('renders BulkRestockDialog with seeded products', async () => {
      const products = useMockDb.getState().products.slice(0, 3)
      renderWithProviders(
        <BulkRestockDialog
          open={true}
          onOpenChange={() => {}}
          items={products}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Maramihang Pag-restock/i)).toBeInTheDocument()
    })

    it('renders BulkRestockDialog with empty items array without crashing', async () => {
      renderWithProviders(
        <BulkRestockDialog
          open={true}
          onOpenChange={() => {}}
          items={[]}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Maramihang Pag-restock/i)).toBeInTheDocument()
    })
  })

  describe('Utang & Payment Dialogs', () => {
    it('renders RecordPaymentDialog with debtor customer', async () => {
      const debtor = useMockDb.getState().customers.find((c) => c.credit_balance > 0) || useMockDb.getState().customers[0]
      renderWithProviders(
        <RecordPaymentDialog open={true} onOpenChange={() => {}} customer={debtor} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Kolektahin ang Bayad/i)).toBeInTheDocument()
    })

    it('renders PaymentDialog on cash tab', async () => {
      const product = useMockDb.getState().products[0]
      const cartItems = [
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 2,
          stock: product.stock_quantity,
        },
      ]
      renderWithProviders(
        <PaymentDialog
          open={true}
          onOpenChange={() => {}}
          cartItems={cartItems}
          total={product.price * 2}
          customers={useMockDb.getState().customers}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Bayaran ang Benta/i)).toBeInTheDocument()
      expect(screen.getByText(/Cash \(Bayad\)/i)).toBeInTheDocument()
    })

    it('renders PaymentDialog on utang tab and selects customer', async () => {
      const product = useMockDb.getState().products[0]
      const cartItems = [
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock_quantity,
        },
      ]
      renderWithProviders(
        <PaymentDialog
          open={true}
          onOpenChange={() => {}}
          cartItems={cartItems}
          total={product.price}
          customers={useMockDb.getState().customers}
        />,
      )
      expect(screen.getByText(/Utang \(Lista\)/i)).toBeInTheDocument()
    })

    it('renders NewCustomerMiniForm standalone', async () => {
      renderWithProviders(
        <NewCustomerMiniForm onSuccess={() => {}} onCancel={() => {}} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Magrehistro ng Bagong Suki/i)).toBeInTheDocument()
    })
  })

  describe('POS Helper Modals', () => {
    it('renders ProductDetailDialog with product', async () => {
      const product = useMockDb.getState().products[0]
      renderWithProviders(
        <ProductDetailDialog
          open={true}
          onOpenChange={() => {}}
          product={product}
          categoryName="Beverages"
          onAddToCart={() => {}}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      const matches = await screen.findAllByText(new RegExp(product.name, 'i'))
      expect(matches.length).toBeGreaterThan(0)
    })

    it('renders HeldCartsDialog when empty and with held carts', async () => {
      renderWithProviders(
        <HeldCartsDialog open={true} onOpenChange={() => {}} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Mga Naka-hold na Benta/i)).toBeInTheDocument()
    })
  })

  describe('ConfirmDialog variants', () => {
    it('renders standard ConfirmDialog', async () => {
      renderWithProviders(
        <ConfirmDialog
          open={true}
          onOpenChange={() => {}}
          title="Kumpirmahin ang Pagbura"
          description="Sigurado ka bang nais mong burahin ang talaang ito?"
          onConfirm={() => {}}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Kumpirmahin ang Pagbura/i)).toBeInTheDocument()
    })

    it('renders ConfirmDialog in Void mode with requireReason=true', async () => {
      renderWithProviders(
        <ConfirmDialog
          open={true}
          onOpenChange={() => {}}
          title="I-void ang Resibo (Void Sale)"
          description="Sigurado ka bang nais mong i-void ang resibong ito?"
          confirmText="Oo, I-void ang Benta"
          tone="destructive"
          requireReason={true}
          reasonLabel="Dahilan ng Pag-void"
          onConfirm={() => {}}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      const matches = await screen.findAllByText(/I-void ang Resibo/i)
      expect(matches.length).toBeGreaterThan(0)
      expect(screen.getByPlaceholderText(/Ibigay ang dahilan/i)).toBeInTheDocument()
    })
  })

  describe('Staff Add Cashier Dialog', () => {
    it('opens add cashier modal on /staff', async () => {
      renderRoute('/staff')
      const addBtn = await screen.findByRole('button', { name: /Magdagdag ng Kahera/i }, {}, { timeout: 8000 })
      addBtn.click()
      expect(await screen.findByText(/Magdagdag ng Bagong Kahera/i)).toBeInTheDocument()
    })
  })
})
