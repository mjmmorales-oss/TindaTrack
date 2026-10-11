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
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Mga Paninda at Imbentaryo/i, {}, { timeout: 12000 })).toBeInTheDocument()
      const emptyMatches = await screen.findAllByText(/Walang nakatalang paninda|Walang nahanap na datos|Walang nahanap/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /categories with empty database gracefully', async () => {
      renderRoute('/categories')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Mga Kategorya/i, {}, { timeout: 12000 })).toBeInTheDocument()
      const emptyMatches = await screen.findAllByText(/Walang nakatalang kategorya|Walang Kategorya|Walang nahanap/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /sales with empty database gracefully', async () => {
      renderRoute('/sales')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Kasaysayan ng Benta/i, {}, { timeout: 12000 })).toBeInTheDocument()
      const emptyMatches = await screen.findAllByText(/Walang naitalang transaksyon|Walang nahanap/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /customers with empty database gracefully', async () => {
      renderRoute('/customers')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Direktoryo ng Suki/i, {}, { timeout: 12000 })).toBeInTheDocument()
      const emptyMatches = await screen.findAllByText(/Walang nakatalang suki|Walang nahanap/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /utang with empty database gracefully', async () => {
      renderRoute('/utang')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Talaan ng Utang/i, {}, { timeout: 12000 })).toBeInTheDocument()
      const emptyMatches = await screen.findAllByText(/Walang May Utang|Walang nahanap/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /staff with empty database gracefully', async () => {
      renderRoute('/staff')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Mga Account ng Staff at Kahera/i, {}, { timeout: 12000 })).toBeInTheDocument()
      const emptyMatches = await screen.findAllByText(/Walang naitalang staff|Walang nahanap/i, {}, { timeout: 12000 })
      expect(emptyMatches.length).toBeGreaterThan(0)
    })

    it('renders /inventory with empty database gracefully', async () => {
      renderRoute('/inventory')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Pamamahala sa Imbentaryo/i, {}, { timeout: 12000 })).toBeInTheDocument()
    })
  })

  describe('Non-existent Entity Detail Routes (404 handling)', () => {
    it('renders friendly not-found ErrorState on /products/999999', async () => {
      renderRoute('/products/999999')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Hindi mahanap ang produkto/i, {}, { timeout: 12000 })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Subukan Muli|Bumalik/i })).toBeInTheDocument()
    })

    it('renders friendly not-found ErrorState on /sales/999999', async () => {
      renderRoute('/sales/999999')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Hindi mahanap ang resibo/i, {}, { timeout: 12000 })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Subukan Muli/i })).toBeInTheDocument()
    })

    it('renders friendly not-found ErrorState on /customers/999999', async () => {
      renderRoute('/customers/999999')
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      expect(await screen.findByText(/Hindi mahanap ang suki/i, {}, { timeout: 12000 })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Subukan Muli/i })).toBeInTheDocument()
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
      const retryBtn = screen.getByRole('button', { name: /Subukan Muli/i })
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
