import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderRoute } from './renderRoute'
import { useMockDb } from '@/mocks/db'
import mockScannerService from '@/services/mock/scannerService'
import { DESKTOP_POS_QUERY } from '@/lib/device'

function setDesktop(isDesktop) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === DESKTOP_POS_QUERY ? isDesktop : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function wedgeType(text) {
  act(() => {
    for (const key of text) window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
}

describe('B2: "Use phone as scanner" only on a desktop/tablet POS', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    useMockDb.getState().resetDemoData()
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('is shown with (pointer: fine) and ≥1024px', async () => {
    setDesktop(true)
    renderRoute('/pos', { role: 'owner' })
    expect(await screen.findByRole('button', { name: /use phone as scanner/i }, { timeout: 15000 })).toBeInTheDocument()
  })

  it('is hidden on a phone, where Scan and AI Basket stay', async () => {
    setDesktop(false)
    renderRoute('/pos', { role: 'owner' })
    expect(await screen.findByRole('button', { name: /^(scan|i-scan)$/i }, { timeout: 15000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ai basket/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /use phone as scanner|connect phone/i })).not.toBeInTheDocument()
  })
})

describe('B3: /scan pairs from the laptop QR without leaving the app', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('"Scan pairing QR" reads the QR and calls pair with the classified code', async () => {
    const pairSpy = vi.spyOn(mockScannerService, 'pairScanner').mockResolvedValue({
      data: { store_name: 'Tindahan ni Aling Nena', user_name: 'Nena', session: { id: 's1', mode: 'pos' } },
    })

    renderRoute('/scan')
    expect(await screen.findByTestId('pairing-status', {}, { timeout: 10000 })).toHaveTextContent(/not paired|hindi pa/i)

    fireEvent.click(screen.getByRole('button', { name: /scan pairing qr|i-scan ang pairing qr/i }))
    wedgeType('https://192.168.1.5:5173/scan?code=ABCD-EFGH')

    await waitFor(() => expect(pairSpy).toHaveBeenCalled())
    expect(pairSpy.mock.calls[0][0]).toMatchObject({ pairing_code: 'ABCD-EFGH' })
    expect(await screen.findByText(/connected ✓|nakakonekta ✓/i)).toBeInTheDocument()
    pairSpy.mockRestore()
  })
})
