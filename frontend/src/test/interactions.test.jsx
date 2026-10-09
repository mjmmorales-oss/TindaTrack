import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute, renderWithProviders } from './renderRoute'
import { resetTestMockDb } from './server'
import { useMockDb } from '@/mocks/db'

import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { AdjustStockDialog } from '@/features/products/components/AdjustStockDialog'
import { RecordPaymentDialog } from '@/features/utang/components/RecordPaymentDialog'
import { PaymentDialog } from '@/features/pos/components/PaymentDialog'

describe('Interaction and Dialog Smoke Tests', () => {
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
      return (
        msg.includes('The above error occurred') ||
        msg.includes('Cannot read properties') ||
        msg.includes('is not defined') ||
        msg.includes('React does not recognize') ||
        msg.includes('Uncaught')
      )
    })
    if (fatalErrors.length > 0) {
      originalConsoleError('FATAL CONSOLE ERRORS:', JSON.stringify(fatalErrors))
    }
    expect(fatalErrors).toHaveLength(0)
  })

  describe('Entity Dialogs', () => {
    it('renders ProductFormDialog in Add mode', async () => {
      renderWithProviders(
        <ProductFormDialog
          open={true}
          onOpenChange={() => {}}
          categories={[{ id: 1, name: 'Beverages' }]}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Magdagdag ng Bagong Produkto/i)).toBeInTheDocument()
    })

    it('renders ProductFormDialog in Edit mode', async () => {
      const product = useMockDb.getState().products[0]
      renderWithProviders(
        <ProductFormDialog
          open={true}
          onOpenChange={() => {}}
          product={product}
          categories={[{ id: 1, name: 'Beverages' }]}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/I-edit ang Produkto/i)).toBeInTheDocument()
    })

    it('renders CategoryFormDialog in Add and Edit modes', async () => {
      renderWithProviders(
        <CategoryFormDialog open={true} onOpenChange={() => {}} category={null} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Bagong Kategorya/i)).toBeInTheDocument()
    })

    it('renders CustomerFormDialog in Add and Edit modes', async () => {
      renderWithProviders(
        <CustomerFormDialog open={true} onOpenChange={() => {}} customer={null} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Magdagdag ng Bagong Suki/i)).toBeInTheDocument()

      const customer = useMockDb.getState().customers[0]
      renderWithProviders(
        <CustomerFormDialog open={true} onOpenChange={() => {}} customer={customer} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/I-edit ang Suki/i)).toBeInTheDocument()
    })

    it('renders AdjustStockDialog', async () => {
      const product = useMockDb.getState().products[0]
      renderWithProviders(
        <AdjustStockDialog open={true} onOpenChange={() => {}} product={product} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/I-adjust ang Stock/i)).toBeInTheDocument()
    })

    it('renders RecordPaymentDialog', async () => {
      const customer = useMockDb.getState().customers.find((c) => c.credit_balance > 0) || useMockDb.getState().customers[0]
      renderWithProviders(
        <RecordPaymentDialog open={true} onOpenChange={() => {}} customer={customer} />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Kolektahin ang Bayad/i)).toBeInTheDocument()
    })

    it('renders PaymentDialog on cash and utang tabs', async () => {
      const user = userEvent.setup()
      const customers = useMockDb.getState().customers
      const cartItems = [
        {
          id: 1,
          name: 'Coke Mismo',
          price: 20,
          quantity: 2,
          stock: 10,
        },
      ]

      renderWithProviders(
        <PaymentDialog
          open={true}
          onOpenChange={() => {}}
          cartItems={cartItems}
          total={40}
          customers={customers}
        />,
      )
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Cash \(Bayad\)/i)).toBeInTheDocument()

      // Switch to Utang tab
      const utangTab = screen.getByRole('tab', { name: /Utang/i })
      await user.click(utangTab)
      expect(await screen.findByText(/Pangalan ng Suki/i)).toBeInTheDocument()
    })

    it('opens Add Cashier dialog on /staff', async () => {
      const user = userEvent.setup()
      renderRoute('/staff', { role: 'owner' })
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      await screen.findByText(/Mga Account ng Staff at Kahera/i, {}, { timeout: 4000 })

      const addButton = await screen.findByRole('button', { name: /Magdagdag ng Kahera/i }, { timeout: 4000 })
      await user.click(addButton)

      expect(await screen.findByText(/Magdagdag ng Bagong Kahera/i)).toBeInTheDocument()
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
    })
  })

  describe('Tab Navigation', () => {
    it(
      'opens all tabs on /inventory',
      async () => {
        const user = userEvent.setup()
        renderRoute('/inventory', { role: 'owner' })
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      await screen.findByText(/Pamamahala sa Imbentaryo/i, {}, { timeout: 4000 })

      const tabs = [
        { name: /Paubos na Paninda/i, textMatch: /Mga Panindang Paubos at Ubos Na/i },
        { name: /Audit Log/i, textMatch: /Petsa at Oras|Kasaysayan/i },
        { name: /Pangkalahatang Tanaw/i, textMatch: /Halaga sa Benta|Dami ng Produkto/i },
      ]

      for (const tab of tabs) {
        const tabTrigger = screen.getByRole('tab', { name: tab.name })
        await user.click(tabTrigger)
        const matched = await screen.findAllByText(tab.textMatch, {}, { timeout: 4000 })
        expect(matched.length).toBeGreaterThan(0)
        expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      }
    }, 15000)

    it('opens all tabs on /settings', async () => {
      const user = userEvent.setup()
      renderRoute('/settings', { role: 'owner' })
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      await screen.findByText(/Mga Setting ng Tindahan/i, {}, { timeout: 4000 })

      const tabs = [
        { name: /Resibo & Preview/i, textMatch: /Format ng POS Resibo/i },
        { name: /Mga Default sa Stock/i, textMatch: /Mga Default ng Imbentaryo/i },
        { name: /Datos & Reset/i, textMatch: /Pamamahala ng Datos/i },
        { name: /Impormasyon ng Tindahan/i, textMatch: /Profile ng Sari-Sari Store/i },
      ]

      for (const tab of tabs) {
        const tabTrigger = screen.getByRole('tab', { name: tab.name })
        await user.click(tabTrigger)
        const matched = await screen.findAllByText(tab.textMatch, {}, { timeout: 4000 })
        expect(matched.length).toBeGreaterThan(0)
        expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      }
    })

    it('opens all tabs on /customers/1', async () => {
      const user = userEvent.setup()
      renderRoute('/customers/1', { role: 'owner' })
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      const ledgerTab = await screen.findByRole('tab', { name: /Ledger ng Utang/i })
      expect(ledgerTab).toBeInTheDocument()

      const purchasesTab = await screen.findByRole('tab', { name: /Kasaysayan ng Bili/i })
      await user.click(purchasesTab)
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()

      await user.click(ledgerTab)
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
    })
  })
})
