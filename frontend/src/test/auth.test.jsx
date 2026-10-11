import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from './renderRoute'

describe('Demo Credentials Visibility', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
  })

  it('hides demo credentials buttons and uses generic placeholders when SHOW_DEMO_ACCOUNTS is false', async () => {
    vi.doMock('@/config/app', () => ({
      SHOW_DEMO_ACCOUNTS: false,
    }))

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
})
