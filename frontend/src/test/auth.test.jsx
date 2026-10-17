import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from './renderRoute'

let mockShowDemo = false

vi.mock('@/config/app', () => ({
  get SHOW_DEMO_ACCOUNTS() {
    return mockShowDemo
  },
}))

describe('Demo Credentials Visibility', () => {
  afterEach(() => {
    cleanup()
  })

  it('hides demo credentials buttons and uses generic placeholders when SHOW_DEMO_ACCOUNTS is false', async () => {
    mockShowDemo = false

    const { LoginPage } = await import('@/features/auth/pages/LoginPage')

    renderWithProviders(<LoginPage />, { role: null })

    // Verify card and submit button rendered
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()

    // Verify demo credentials are NOT rendered
    expect(screen.queryByText(/Demo Credentials/i)).toBeNull()
    expect(screen.queryByText(/owner@tindatrack\.test/i)).toBeNull()
    expect(screen.queryByText(/cashier@tindatrack\.test/i)).toBeNull()

    // Email input has generic placeholder
    const emailInput = screen.getByLabelText(/email address/i)
    expect(emailInput).toHaveAttribute('placeholder', 'you@email.com')
  })

  it('renders demo credentials panel when SHOW_DEMO_ACCOUNTS is true', async () => {
    mockShowDemo = true

    const { LoginPage } = await import('@/features/auth/pages/LoginPage')

    renderWithProviders(<LoginPage />, { role: null })

    expect(await screen.findByText(/Demo Credentials:/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Owner Demo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cashier Demo/i })).toBeInTheDocument()
  })

  describe('SEC-05: Cart and Scanner Session Purge on Logout', () => {
    it('purges persisted cart store, pos cart storage, and scanner session on logout', async () => {
      const { render } = await import('@testing-library/react')
      const { useCartStore } = await import('@/stores/cartStore')
      const { AuthProvider, AuthContext } = await import('@/context/AuthContext')
      const { useContext } = await import('react')
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')

      // Pre-populate cart store and localStorage
      useCartStore.getState().add({ id: 1, name: 'Sardines', price: 25, stock: 10 }, 2)
      useCartStore.getState().holdCurrentCart()
      useCartStore.getState().add({ id: 2, name: 'Noodles', price: 15, stock: 10 }, 1)

      expect(useCartStore.getState().items.length).toBe(1)
      expect(useCartStore.getState().heldCarts.length).toBe(1)

      localStorage.setItem('tindatrack-cart-v1', '{"state":{"items":[1]}}')
      localStorage.setItem('tt_pos_cart', '{"items":[1]}')
      localStorage.setItem('tt-scanner-event', '{"type":"scan"}')
      localStorage.setItem('tt_ai_review_queue', '{"items":[]}')
      sessionStorage.setItem('tt_pos_scanner_session', '{"id":"scan_123"}')
      sessionStorage.setItem('tt_scanner_token', 'tok_abc')
      sessionStorage.setItem('tt_scanner_info', '{"code":"123"}')
      sessionStorage.setItem('tt_ai_review_queue', '{"items":[]}')

      let authContextVal = null
      function TestConsumer() {
        authContextVal = useContext(AuthContext)
        return (
          <button
            onClick={() => {
              authContextVal.logout()
            }}
          >
            Logout
          </button>
        )
      }

      render(
        <QueryClientProvider client={new QueryClient()}>
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        </QueryClientProvider>,
      )

      const { act } = await import('@testing-library/react')
      await act(async () => {
        await authContextVal.logout()
      })

      // Cart store must be completely wiped
      expect(useCartStore.getState().items.length).toBe(0)
      expect(useCartStore.getState().heldCarts.length).toBe(0)

      // Storage keys must be cleared / empty
      const rawCart = localStorage.getItem('tindatrack-cart-v1')
      expect(!rawCart || JSON.parse(rawCart)?.state?.items?.length === 0).toBe(true)
      expect(localStorage.getItem('tt_pos_cart')).toBeNull()
      expect(localStorage.getItem('tt-scanner-event')).toBeNull()
      expect(localStorage.getItem('tt_ai_review_queue')).toBeNull()
      expect(sessionStorage.getItem('tt_pos_scanner_session')).toBeNull()
      expect(sessionStorage.getItem('tt_scanner_token')).toBeNull()
      expect(sessionStorage.getItem('tt_scanner_info')).toBeNull()
      expect(sessionStorage.getItem('tt_ai_review_queue')).toBeNull()
    })
  })

  describe('UI-03: useHotkey input typing suppression', () => {
    it('does not trigger hotkey callback when user is typing in an input element', async () => {
      const { renderHook } = await import('@testing-library/react')
      const { useHotkey } = await import('@/hooks/useHotkey')

      const callback = vi.fn()
      renderHook(() => useHotkey('k', callback))

      const input = document.createElement('input')
      document.body.appendChild(input)

      // Event target is an input
      const eventInInput = new KeyboardEvent('keydown', {
        key: 'k',
        bubbles: true,
      })
      Object.defineProperty(eventInInput, 'target', { value: input })

      window.dispatchEvent(eventInInput)
      expect(callback).not.toHaveBeenCalled()

      // Event target outside input
      const eventOutside = new KeyboardEvent('keydown', {
        key: 'k',
        bubbles: true,
      })
      Object.defineProperty(eventOutside, 'target', { value: document.body })

      window.dispatchEvent(eventOutside)
      expect(callback).toHaveBeenCalledTimes(1)

      document.body.removeChild(input)
    })
  })
})
