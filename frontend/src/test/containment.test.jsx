import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen, cleanup, waitFor } from '@testing-library/react'
import { renderRoute } from './renderRoute'
import { resetTestMockDb } from './server'

describe('Layout Containment and Responsive Shell Guard Tests', () => {
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

  const tablePages = [
    { route: '/products', name: 'Products' },
    { route: '/sales', name: 'Sales' },
    { route: '/customers', name: 'Customers' },
    { route: '/utang', name: 'Utang' },
    { route: '/inventory', name: 'Inventory' },
    { route: '/reports', name: 'Reports' },
    { route: '/staff', name: 'Staff' },
  ]

  tablePages.forEach(({ route, name }) => {
    it(`enforces layout containment and PageHeader on ${name} (${route})`, async () => {
      const { container } = renderRoute(route, { role: 'owner' })

      // 1. PageHeader title is present and non-empty
      const h1 = await screen.findByRole('heading', { level: 1 }, { timeout: 10000 })
      expect(h1).toBeInTheDocument()
      expect(h1.textContent?.trim().length).toBeGreaterThan(0)

      // 2. Wait for loading skeleton to resolve into DataTable / Table scroll container
      await waitFor(
        () => {
          const scrollContainers = container.querySelectorAll(
            '[data-slot="table-container"], .overflow-x-auto',
          )
          expect(scrollContainers.length).toBeGreaterThan(0)
        },
        { timeout: 10000 },
      )

      // 3. Page root has no fixed width > 320px without breakpoint prefix
      const fixedWidthRegex = /(?:^|\s)(?:min-)?w-\[(\d+)px\]/g
      const allElements = container.querySelectorAll('*')

      allElements.forEach((el) => {
        const classStr = el.getAttribute('class') || ''
        let match
        while ((match = fixedWidthRegex.exec(classStr)) !== null) {
          const pxVal = parseInt(match[1], 10)
          // Any unprefixed width over 320px breaks narrow mobile screens
          expect(pxVal).toBeLessThanOrEqual(320)
        }
      })
    })
  })

  it('ensures /scan does not render the app sidebar or landing header', async () => {
    const { container } = renderRoute('/scan')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Use this phone as a scanner|Gamitin ang phone/i })).toBeInTheDocument()
    })

    const sidebar = container.querySelector('[data-slot="sidebar"]')
    expect(sidebar).toBeNull()

    const landingHeader = container.querySelector('header.landing-header')
    expect(landingHeader).toBeNull()
  })
})
