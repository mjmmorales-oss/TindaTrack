import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderRoute } from './renderRoute'
import { resetTestMockDb } from './server'

describe('Route Smoke Tests', () => {
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
    // Fail test if console.error was called with React error/warning or uncaught exception
    const fatalErrors = consoleErrors.filter((args) => {
      const msg = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ')
      // Ignore known benign jsdom chart dimensions warnings, but catch React errors
      return (
        msg.includes('The above error occurred') ||
        msg.includes('Cannot read properties') ||
        msg.includes('is not defined') ||
        msg.includes('React does not recognize') ||
        msg.includes('Warning: Each child in a list') ||
        msg.includes('Uncaught')
      )
    })
    if (fatalErrors.length > 0) {
      originalConsoleError('FATAL CONSOLE ERRORS:', JSON.stringify(fatalErrors))
    }
    expect(fatalErrors).toHaveLength(0)
  })

  describe('Guest / Public routes', () => {
    const guestRoutes = [
      { path: '/', expected: /Benta, stock, at utang/i },
      { path: '/login', expected: /Enter your tindahan account/i },
      { path: '/register', expected: /Register Store/i },
      { path: '/forgot-password', expected: /Forgot Password/i },
      { path: '/password-reset/test-token', expected: /Reset Password/i },
      { path: '/403', expected: /Bawal ang Aksyon|403/i },
      { path: '/non-existent-page', expected: /Hindi Nahanap|404/i },
    ]

    guestRoutes.forEach(({ path, expected }) => {
      it(`renders ${path} without error`, async () => {
        renderRoute(path, { role: 'guest' })
        expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
        const elements = await screen.findAllByText(expected, {}, { timeout: 4000 })
        expect(elements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Owner routes', () => {
    const ownerRoutes = [
      { path: '/dashboard', expected: /Magandang/i },
      { path: '/pos', expected: /Kasalukuyang Benta|Dashboard/i },
      { path: '/sales', expected: /Kasaysayan ng Benta/i },
      { path: '/sales/1', expected: /Resibo TT-/i },
      { path: '/products', expected: /Mga Paninda at Imbentaryo/i },
      { path: '/products/1', expected: /Coca-Cola|SKU:/i },
      { path: '/categories', expected: /Mga Kategorya/i },
      { path: '/inventory', expected: /Pamamahala sa Imbentaryo/i },
      { path: '/customers', expected: /Direktoryo ng Suki/i },
      { path: '/customers/1', expected: /Kasalukuyang Utang|Bumalik sa mga Suki/i },
      { path: '/utang', expected: /Talaan ng Utang/i },
      { path: '/reports', expected: /Mga Ulat at Pagsusuri/i },
      { path: '/staff', expected: /Mga Account ng Staff at Kahera/i },
      { path: '/settings', expected: /Mga Setting ng Tindahan/i },
      { path: '/account', expected: /Aking Account/i },
    ]

    ownerRoutes.forEach(({ path, expected }) => {
      it(`renders ${path} for owner`, async () => {
        renderRoute(path, { role: 'owner' })
        expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
        const elements = await screen.findAllByText(expected, {}, { timeout: 8000 })
        expect(elements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Cashier routes', () => {
    const cashierRoutes = [
      { path: '/dashboard', expected: /Magandang/i },
      { path: '/pos', expected: /Kasalukuyang Benta|Dashboard/i },
      { path: '/sales', expected: /Kasaysayan ng Benta/i },
      { path: '/sales/1', expected: /Resibo TT-/i },
      { path: '/products', expected: /Mga Paninda at Imbentaryo/i },
      { path: '/products/1', expected: /Coca-Cola|SKU:/i },
      { path: '/customers', expected: /Direktoryo ng Suki/i },
      { path: '/customers/1', expected: /Kasalukuyang Utang|Bumalik sa mga Suki/i },
      { path: '/utang', expected: /Talaan ng Utang/i },
      { path: '/account', expected: /Aking Account/i },
    ]

    cashierRoutes.forEach(({ path, expected }) => {
      it(`renders ${path} for cashier`, async () => {
        renderRoute(path, { role: 'cashier' })
        expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
        const elements = await screen.findAllByText(expected, {}, { timeout: 8000 })
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('redirects cashier from owner-only route /inventory to /403', async () => {
      renderRoute('/inventory', { role: 'cashier' })
      expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
      const elements = await screen.findAllByText(/Bawal ang Aksyon|403/i, {}, { timeout: 4000 })
      expect(elements.length).toBeGreaterThan(0)
    })
  })
})
