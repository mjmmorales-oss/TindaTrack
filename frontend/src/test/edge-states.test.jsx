import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderRoute, renderWithProviders } from './renderRoute'
import { resetTestMockDb } from './server'
import { useMockDb } from '@/mocks/db'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'

describe('Edge States and Resilient Error Boundaries', () => {
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

  describe('Empty Database List Pages', () => {
    beforeEach(() => {
      // Empty all mock database collections
      useMockDb.setState({
        products: [],
        categories: [],
        customers: [],
        sales: [],
        staff: [],
        stockMovements: [],
        utangPayments: [],
      })
    })

    it('renders /products with empty database gracefully', async () => {
      renderRoute('/products')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const titleMatches = await screen.findAllByText(/Mga Paninda at Imbentaryo|Products & Inventory/i, {}, { timeout: 12000 })
      expect(titleMatches.length).toBeGreaterThan(0)
      const emptyMatches = await screen.findAllByText(/Walang nakatalang paninda|Walang nahanap na datos|Walang nahanap|No products registered yet|No matching products/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /categories with empty database gracefully', async () => {
      renderRoute('/categories')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const titleMatches = await screen.findAllByText(/Mga Kategorya|Product Categories|Categories/i, {}, { timeout: 12000 })
      expect(titleMatches.length).toBeGreaterThan(0)
      const emptyMatches = await screen.findAllByText(/Walang nakatalang kategorya|Walang Kategorya|Walang nahanap|No categories/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /sales with empty database gracefully', async () => {
      renderRoute('/sales')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const titleMatches = await screen.findAllByText(/Kasaysayan ng Benta|Sales History|Recent Sales/i, {}, { timeout: 12000 })
      expect(titleMatches.length).toBeGreaterThan(0)
      const emptyMatches = await screen.findAllByText(/Walang naitalang transaksyon|Walang nahanap|No sales recorded|No sales records/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /customers with empty database gracefully', async () => {
      renderRoute('/customers')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const titleMatches = await screen.findAllByText(/Direktoryo ng Suki|Customer Directory|Customers/i, {}, { timeout: 12000 })
      expect(titleMatches.length).toBeGreaterThan(0)
      const emptyMatches = await screen.findAllByText(/Walang nakatalang suki|Walang nahanap|No customers/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /utang with empty database gracefully', async () => {
      renderRoute('/utang')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const titleMatches = await screen.findAllByText(/Talaan ng Utang|Credit Ledger|Utang/i, {}, { timeout: 12000 })
      expect(titleMatches.length).toBeGreaterThan(0)
      const emptyMatches = await screen.findAllByText(/Walang May Utang|Walang nahanap|No outstanding|No debtors|No active debtors|Walang aktibong may utang/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /staff with empty database gracefully', async () => {
      renderRoute('/staff')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const titleMatches = await screen.findAllByText(/Mga Account ng Staff at Kahera|Staff & Cashier/i, {}, { timeout: 12000 })
      expect(titleMatches.length).toBeGreaterThan(0)
      const emptyMatches = await screen.findAllByText(/Walang naitalang staff|Walang nahanap|No staff/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /inventory with empty database gracefully', async () => {
      renderRoute('/inventory')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const titleMatches = await screen.findAllByText(/Pamamahala sa Imbentaryo|Inventory & Stock Management|Stock & Inventory/i, {}, { timeout: 12000 })
      expect(titleMatches.length).toBeGreaterThan(0)
    })
  })

  describe('Non-existent Entity Detail Routes (404 handling)', () => {
    it('renders friendly not-found ErrorState on /products/999999', async () => {
      renderRoute('/products/999999')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const errorMatches = await screen.findAllByText(/Hindi mahanap ang produkto|Product not found/i, {}, { timeout: 12000 })
      expect(errorMatches.length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /Subukan Muli|Bumalik|Try Again|Go Back|Back|Retry/i })).toBeInTheDocument()
    })

    it('renders friendly not-found ErrorState on /sales/999999', async () => {
      renderRoute('/sales/999999')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const errorMatches = await screen.findAllByText(/Hindi mahanap ang resibo|Sale not found|Receipt not found/i, {}, { timeout: 12000 })
      expect(errorMatches.length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /Subukan Muli|Bumalik|Try Again|Go Back|Back|Retry/i })).toBeInTheDocument()
    })

    it('renders friendly not-found ErrorState on /customers/999999', async () => {
      renderRoute('/customers/999999')
      expect(screen.queryByText(/Unexpected Error|Something went wrong|May nagkaproblema/i)).toBeNull()
      const errorMatches = await screen.findAllByText(/Hindi mahanap ang suki|Customer not found/i, {}, { timeout: 12000 })
      expect(errorMatches.length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: /Subukan Muli|Bumalik|Try Again|Go Back|Back|Retry/i })).toBeInTheDocument()
    })
  })

  describe('Service Forced Error State with Retry', () => {
    it('renders ErrorState component cleanly with title, message and retry trigger', async () => {
      let retried = false
      renderWithProviders(
        <ErrorState
          title="Nabigo ang koneksyon sa server"
          message="Hindi ma-load ang talaan sa kasalukuyan."
          onRetry={() => {
            retried = true
          }}
        />,
      )
      expect(screen.getByText(/Nabigo ang koneksyon sa server/i)).toBeInTheDocument()
      expect(screen.getByText(/Hindi ma-load ang talaan sa kasalukuyan/i)).toBeInTheDocument()
      const retryBtn = screen.getByRole('button', { name: /Subukan Muli|Retry/i })
      expect(retryBtn).toBeInTheDocument()
      retryBtn.click()
      expect(retried).toBe(true)
    })

    it('renders EmptyState component cleanly with icon and CTA', async () => {
      let actionClicked = false
      renderWithProviders(
        <EmptyState
          title="Walang paninda"
          description="Magsimula sa pagdagdag ng unang produkto."
          action={
            <Button
              onClick={() => {
                actionClicked = true
              }}
            >
              Magdagdag ng Produkto
            </Button>
          }
        />,
      )
      expect(screen.getByText(/Walang paninda/i)).toBeInTheDocument()
      const ctaBtn = screen.getByRole('button', { name: /Magdagdag ng Produkto/i })
      expect(ctaBtn).toBeInTheDocument()
      ctaBtn.click()
      expect(actionClicked).toBe(true)
    })
  })
})
