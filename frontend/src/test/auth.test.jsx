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
})
