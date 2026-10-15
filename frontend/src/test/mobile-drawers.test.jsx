import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, act, cleanup, renderHook } from '@testing-library/react'
import { renderWithProviders } from './renderRoute'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { useOverlayStore } from '@/stores/overlayStore'
import * as useIsMobileModule from '@/hooks/useIsMobile'

describe('U3: Mobile Drawers, Sheets, and Keyboard Polish', () => {
  beforeEach(() => {
    useOverlayStore.getState().reset()
    document.documentElement.dataset.keyboard = 'closed'
    document.documentElement.style.removeProperty('--vvh')
    document.documentElement.style.removeProperty('--keyboard-inset')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    document.documentElement.dataset.keyboard = 'closed'
  })

  describe('useVisualViewport hook', () => {
    it('sets CSS variables and toggles data-keyboard when keyboard opens and closes', async () => {
      let resizeCb = null
      const mockVisualViewport = {
        height: 800,
        offsetTop: 0,
        addEventListener: vi.fn((event, cb) => {
          if (event === 'resize') resizeCb = cb
        }),
        removeEventListener: vi.fn(),
      }

      window.innerHeight = 800
      window.visualViewport = mockVisualViewport

      // Mock requestAnimationFrame to execute synchronously
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
        fn()
        return 1
      })

      const { result } = renderHook(() => useVisualViewport())

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('800px')
      expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('0px')
      expect(document.documentElement.dataset.keyboard).toBe('closed')
      expect(result.current.isKeyboardOpen).toBe(false)

      // Simulate keyboard open: height shrinks from 800 to 500 (inset = 300px > 120px)
      mockVisualViewport.height = 500
      act(() => {
        resizeCb?.()
      })

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('500px')
      expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('300px')
      expect(document.documentElement.dataset.keyboard).toBe('open')
      expect(result.current.isKeyboardOpen).toBe(true)

      // Simulate keyboard close: height returns to 800
      mockVisualViewport.height = 800
      act(() => {
        resizeCb?.()
      })

      expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('800px')
      expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('0px')
      expect(document.documentElement.dataset.keyboard).toBe('closed')
      expect(result.current.isKeyboardOpen).toBe(false)
    })
  })

  describe('ResponsiveDialog on mobile', () => {
    it('renders mobile drawer with scroll container and sticky footer classes', () => {
      vi.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(true)

      renderWithProviders(
        <ResponsiveDialog
          open={true}
          onOpenChange={() => {}}
          title="Test Mobile Dialog"
          footer={<button>Submit</button>}
        >
          <div>Drawer body content</div>
        </ResponsiveDialog>,
      )

      expect(screen.getByText('Test Mobile Dialog')).toBeInTheDocument()
      expect(screen.getByText('Drawer body content')).toBeInTheDocument()
      expect(screen.getByText('Submit')).toBeInTheDocument()

      // The body container has overscroll-contain and overflow-y-auto
      const body = screen.getByText('Drawer body content').parentElement
      expect(body).toHaveClass('overflow-y-auto')
      expect(body).toHaveClass('overscroll-contain')

      // The footer has sticky positioning at the bottom
      const footer = screen.getByText('Submit').parentElement
      expect(footer).toHaveClass('sticky')
      expect(footer).toHaveClass('bottom-0')

      // Modal count registered in overlayStore
      expect(useOverlayStore.getState().activeModalCount).toBeGreaterThan(0)
    })
  })

  describe('MobileBottomNav visibility', () => {
    it('is visible when keyboard is closed', () => {
      document.documentElement.dataset.keyboard = 'closed'
      renderWithProviders(<MobileBottomNav />)

      const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
      expect(nav).toBeInTheDocument()
      expect(nav).not.toHaveClass('hidden')
    })

    it('is hidden when data-keyboard="open"', () => {
      document.documentElement.dataset.keyboard = 'open'
      renderWithProviders(<MobileBottomNav />)

      const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
      expect(nav).toHaveClass('hidden')
    })

    it('hides dynamically when visualViewport shrinks on keyboard open', async () => {
      let resizeCb = null
      const mockVisualViewport = {
        height: 800,
        offsetTop: 0,
        addEventListener: vi.fn((event, cb) => {
          if (event === 'resize') resizeCb = cb
        }),
        removeEventListener: vi.fn(),
      }
      window.innerHeight = 800
      window.visualViewport = mockVisualViewport

      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
        fn()
        return 1
      })

      renderWithProviders(<MobileBottomNav />)
      const nav = screen.getByRole('navigation', { name: /mobile navigation/i })
      expect(nav).not.toHaveClass('hidden')

      // Keyboard opens: height drops to 450 (inset = 350px > 120px)
      mockVisualViewport.height = 450
      await act(async () => {
        resizeCb?.()
      })

      expect(nav).toHaveClass('hidden')
    })
  })
})
