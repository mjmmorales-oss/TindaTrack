import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, cleanup, renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from './renderRoute'
import { useAiConsent } from '@/hooks/useAiConsent'
import { FirstUseAiConsentDialog } from '@/components/ai/FirstUseAiConsentDialog'
import { hasAbility } from '@/config/permissions'

describe('AI First-Use Privacy Consent & Safety (Task A8)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.body.removeAttribute('data-scroll-locked')
    document.body.style.pointerEvents = 'auto'
  })

  it('initializes with hasConsent false when localStorage is empty', () => {
    const { result } = renderHook(() => useAiConsent())
    expect(result.current.hasConsent).toBe(false)
    expect(result.current.isConsentOpen).toBe(false)
  })

  it('opens consent dialog on withConsent and executes callback after acceptance', () => {
    const { result } = renderHook(() => useAiConsent())
    const pendingAction = vi.fn()

    // 1. Trigger protected action
    act(() => {
      result.current.withConsent(pendingAction)
    })

    expect(result.current.isConsentOpen).toBe(true)
    expect(pendingAction).not.toHaveBeenCalled()
    expect(result.current.hasConsent).toBe(false)

    // 2. Accept consent
    act(() => {
      result.current.acceptConsent()
    })

    expect(result.current.hasConsent).toBe(true)
    expect(result.current.isConsentOpen).toBe(false)
    expect(pendingAction).toHaveBeenCalledTimes(1)
  })

  it('immediately runs action without opening dialog if consent was already stored', () => {
    localStorage.setItem('tt_ai_consent_default', 'true')
    const { result } = renderHook(() => useAiConsent())
    const immediateAction = vi.fn()

    expect(result.current.hasConsent).toBe(true)

    act(() => {
      result.current.withConsent(immediateAction)
    })

    expect(result.current.isConsentOpen).toBe(false)
    expect(immediateAction).toHaveBeenCalledTimes(1)
  })

  it('cancels pending action on declineConsent', () => {
    const { result } = renderHook(() => useAiConsent())
    const cancelledAction = vi.fn()

    act(() => {
      result.current.withConsent(cancelledAction)
    })

    expect(result.current.isConsentOpen).toBe(true)

    act(() => {
      result.current.declineConsent()
    })

    expect(result.current.isConsentOpen).toBe(false)
    expect(cancelledAction).not.toHaveBeenCalled()
    expect(result.current.hasConsent).toBe(false)
  })

  it('renders FirstUseAiConsentDialog with exact required disclosure text', () => {
    const onAccept = vi.fn()
    const onDecline = vi.fn()

    renderWithProviders(
      <FirstUseAiConsentDialog
        open={true}
        onOpenChange={vi.fn()}
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    )

    // Verify title and required disclosure copy
    expect(
      screen.getByText(/AI Privacy & Image Usage Notice/i),
    ).toBeInTheDocument()

    const requiredText =
      "Photos are sent to Google Gemini for analysis. Do not include people's faces. Free-tier data may be used by Google to improve its models. Results are suggestions; always review before adding."
    expect(screen.getByText(requiredText)).toBeInTheDocument()

    // Verify buttons
    expect(
      screen.getByRole('button', { name: /I Understand & Accept/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Not Now/i }),
    ).toBeInTheDocument()
  })

  it('calls onAccept and onDecline handlers in FirstUseAiConsentDialog', async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn()
    const onDecline = vi.fn()

    const { rerender } = renderWithProviders(
      <FirstUseAiConsentDialog
        open={true}
        onOpenChange={vi.fn()}
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    )

    const acceptBtn = screen.getByRole('button', {
      name: /I Understand & Accept/i,
    })
    await user.click(acceptBtn)
    expect(onAccept).toHaveBeenCalledTimes(1)

    rerender(
      <FirstUseAiConsentDialog
        open={true}
        onOpenChange={vi.fn()}
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    )

    const declineBtn = screen.getByRole('button', { name: /Not Now/i })
    await user.click(declineBtn)
    expect(onDecline).toHaveBeenCalledTimes(1)
  })

  it('enforces cashier safety boundaries: allows POS AI & visual search, prohibits management/lab/settings', () => {
    // Cashier allowed capabilities
    expect(hasAbility('cashier', 'pos.use')).toBe(true)
    expect(hasAbility('cashier', 'products.view')).toBe(true)

    // Cashier restricted capabilities
    expect(hasAbility('cashier', 'products.manage')).toBe(false)
    expect(hasAbility('cashier', 'ai.lab')).toBe(false)
    expect(hasAbility('cashier', 'ai.manage')).toBe(false)
    expect(hasAbility('cashier', 'settings.manage')).toBe(false)

    // Owner full access
    expect(hasAbility('owner', 'pos.use')).toBe(true)
    expect(hasAbility('owner', 'products.manage')).toBe(true)
    expect(hasAbility('owner', 'ai.lab')).toBe(true)
    expect(hasAbility('owner', 'ai.manage')).toBe(true)
    expect(hasAbility('owner', 'settings.manage')).toBe(true)
  })
})
