import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderRoute } from './renderRoute'
import { resetTestMockDb } from './server'

describe('Role-Based Access Control and Action Visibility Tests', () => {
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

  describe('Forbidden Routes for Cashier (RoleRoute -> 403)', () => {
    const forbiddenPaths = [
      '/inventory',
      '/categories',
      '/reports',
      '/staff',
      '/settings',
    ]

    forbiddenPaths.forEach((path) => {
      it(`redirects cashier from owner-only route ${path} to /403`, async () => {
        renderRoute(path, { role: 'cashier' })
        expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
        const forbiddenTexts = await screen.findAllByText(
          /Bawal ang Aksyon|Access Denied|403|Walang Permiso/i,
          {},
          { timeout: 12000 },
        )
        expect(forbiddenTexts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Allowed Routes for Cashier', () => {
    const allowedCashierPaths = [
      { path: '/pos', text: /Kasalukuyang Benta|Dashboard|POS/i },
      { path: '/products', text: /Mga Paninda at Imbentaryo/i },
      { path: '/sales', text: /Kasaysayan ng Benta/i },
      { path: '/customers', text: /Direktoryo ng Suki/i },
      { path: '/utang', text: /Talaan ng Utang/i },
      { path: '/account', text: /Aking Account/i },
    ]

    allowedCashierPaths.forEach(({ path, text }) => {
      it(`allows cashier to view ${path}`, async () => {
        renderRoute(path, { role: 'cashier' })
        expect(screen.queryByText(/Unexpected Error/i)).toBeNull()
        const matches = await screen.findAllByText(text, {}, { timeout: 12000 })
        expect(matches.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Owner-Only Action Visibility Contrasts', () => {
    it('shows Void button on /sales/1 for owner, but hides it for cashier', async () => {
      // 1. As Cashier
      const { unmount } = renderRoute('/sales/1', { role: 'cashier' })
      expect(await screen.findByText(/Resibo TT-/i, {}, { timeout: 12000 })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /I-void ang Benta/i })).toBeNull()
      unmount()

      // 2. As Owner
      renderRoute('/sales/1', { role: 'owner' })
      expect(await screen.findByText(/Resibo TT-/i, {}, { timeout: 12000 })).toBeInTheDocument()
      expect(
        await screen.findByRole('button', { name: /I-void ang Benta/i }, {}, { timeout: 12000 }),
      ).toBeInTheDocument()
    })

    it('shows "Magdagdag ng Produkto" on /products for owner, but hides it for cashier', async () => {
      // 1. As Cashier
      const { unmount } = renderRoute('/products', { role: 'cashier' })
      expect(await screen.findByText(/Mga Paninda at Imbentaryo/i, {}, { timeout: 12000 })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Magdagdag ng Produkto/i })).toBeNull()
      unmount()

      // 2. As Owner
      renderRoute('/products', { role: 'owner' })
      expect(await screen.findByText(/Mga Paninda at Imbentaryo/i, {}, { timeout: 12000 })).toBeInTheDocument()
      expect(
        await screen.findByRole('button', { name: /Magdagdag ng Produkto/i }, {}, { timeout: 12000 }),
      ).toBeInTheDocument()
    })

    it('shows Cost Price column on /products for owner, but hides it for cashier', async () => {
      // 1. As Cashier
      const { unmount } = renderRoute('/products', { role: 'cashier' })
      await screen.findByText(/Mga Paninda at Imbentaryo/i, {}, { timeout: 12000 })
      expect(screen.queryByText(/Puhunan \(Cost\)/i)).toBeNull()
      unmount()

      // 2. As Owner
      renderRoute('/products', { role: 'owner' })
      await screen.findByText(/Mga Paninda at Imbentaryo/i, {}, { timeout: 12000 })
      const costMatches = await screen.findAllByText(/Puhunan \(Cost\)/i, {}, { timeout: 12000 })
      expect(costMatches.length).toBeGreaterThan(0)
    })
  })
})
