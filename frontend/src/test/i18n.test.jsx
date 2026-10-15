import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { formatDate, getActiveLocale } from '@/lib/format'
import { translateErrorMessage } from '@/lib/errors'
import { BarcodeCapture } from '@/components/scanner/BarcodeCapture'
import { CameraScanner } from '@/components/scanner/CameraScanner'
import { PairPhoneDialog } from '@/components/scanner/PairPhoneDialog'
import { PrintLabelsDialog } from '@/components/scanner/PrintLabelsDialog'
import { AddByBarcodeDialog } from '@/features/products/components/AddByBarcodeDialog'
import { renderWithProviders, renderRoute } from './renderRoute'
import { useMockDb } from '@/mocks/db'

function TestComponent() {
  const { t } = useTranslation()
  return (
    <div>
      <span data-testid="cart-title">{t('pos:cartTitle')}</span>
      <span data-testid="save-btn">{t('common:save')}</span>
      <span data-testid="fallback-test">{t('pos:nonExistentKey', 'Fallback Default')}</span>
    </div>
  )
}

describe('i18n Infrastructure (H3)', () => {
  beforeEach(async () => {
    localStorage.clear()
    await act(async () => {
      await i18n.changeLanguage('en')
    })
  })

  it('defaults to English language and configures document lang attribute', () => {
    expect(i18n.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(getActiveLocale()).toBe('en-PH')
  })

  it('renders English text by default', () => {
    render(<TestComponent />)
    expect(screen.getByTestId('cart-title')).toHaveTextContent('Cart')
    expect(screen.getByTestId('save-btn')).toHaveTextContent('Save')
    expect(screen.getByTestId('fallback-test')).toHaveTextContent('Fallback Default')
  })

  it('switching to fil re-renders Filipino/Taglish text instantly', async () => {
    render(<TestComponent />)
    expect(screen.getByTestId('cart-title')).toHaveTextContent('Cart')

    await act(async () => {
      await i18n.changeLanguage('fil')
    })

    expect(screen.getByTestId('cart-title')).toHaveTextContent('Talaan ng Bibilhin (Cart)')
    expect(screen.getByTestId('save-btn')).toHaveTextContent('I-save')
    expect(document.documentElement.lang).toBe('fil')
    expect(getActiveLocale()).toBe('fil-PH')
  })

  it('persists chosen language to localStorage', async () => {
    await act(async () => {
      await i18n.changeLanguage('fil')
    })

    expect(localStorage.getItem('tt_lang')).toBe('fil')

    await act(async () => {
      await i18n.changeLanguage('en')
    })

    expect(localStorage.getItem('tt_lang')).toBe('en')
  })

  it('falls back to default language for missing keys in secondary language', () => {
    // Add a key only to en
    i18n.addResource('en', 'pos', 'uniqueEnglishOnlyKey', 'English Unique Value')

    act(() => {
      i18n.changeLanguage('fil')
    })

    expect(i18n.t('pos:uniqueEnglishOnlyKey')).toBe('English Unique Value')
  })

  it('formats dates localized according to the active language', async () => {
    const testDate = new Date('2026-10-07T10:00:00Z')

    await act(async () => {
      await i18n.changeLanguage('en')
    })
    const enFormatted = formatDate(testDate)
    expect(enFormatted).toContain('Oct')

    await act(async () => {
      await i18n.changeLanguage('fil')
    })
    const filFormatted = formatDate(testDate)
    expect(filFormatted).toContain('Okt')
  })

  it('translates validation error keys through centralized helper', async () => {
    await act(async () => {
      await i18n.changeLanguage('en')
    })
    expect(translateErrorMessage('validation:required')).toBe('This field is required.')

    await act(async () => {
      await i18n.changeLanguage('fil')
    })
    expect(translateErrorMessage('validation:required')).toBe('Kailangan ang impormasyong ito.')
  })
})

describe('U5: Zero Filipino Marker Words in English UI', () => {
  const MARKER_WORDS = [
    'ang', 'ng', 'nang', 'mga', 'sa', 'ay', 'po', 'hindi', 'walang',
    'pindutin', 'i-scan', 'i-type', 'sinisimulan', 'ikonekta', 'bayaran', 'paninda',
  ]
  const MARKER_PREFIXES = ['naka-', 'mag-', 'pag-', 'i-scan', 'i-type']

  const markerRegex = new RegExp(
    `(${[...MARKER_WORDS.map((w) => `\\b${w}\\b`), ...MARKER_PREFIXES.map((p) => `\\b${p}`)].join('|')})`,
    'i',
  )

  const ALLOW_LIST = [
    'utang',
    'sari-sari',
    'puhunan',
    'tindahan',
    'tindahan ni aling nena',
    'mura at sariwa araw-araw',
    'purok 3, brgy. san isidro',
    '0917-123-4567',
    'juan (kahera)',
    'change (sukli)',
    'sale (benta)',
    'nena dela cruz',
    'juan dela cruz',
    'bea santos',
    'salamat po! balik po kayo!',
  ]

  function assertNoFilipinoMarkers(rootElement) {
    let text = rootElement.textContent || ''
    const elementsWithAttributes = rootElement.querySelectorAll('[placeholder], [aria-label], [title]')
    elementsWithAttributes.forEach((el) => {
      if (el.getAttribute('placeholder')) text += ' ' + el.getAttribute('placeholder')
      if (el.getAttribute('aria-label')) text += ' ' + el.getAttribute('aria-label')
      if (el.getAttribute('title')) text += ' ' + el.getAttribute('title')
    })

    let sanitized = text
    for (const allowed of ALLOW_LIST) {
      sanitized = sanitized.split(new RegExp(allowed, 'gi')).join(' ')
    }

    const match = markerRegex.exec(sanitized)
    if (match) {
      throw new Error(
        `Found Filipino marker "${match[0]}" in English UI: "${sanitized.slice(
          Math.max(0, match.index - 30),
          match.index + 50,
        )}"`,
      )
    }
  }

  beforeEach(async () => {
    localStorage.clear()
    useMockDb.getState().resetDemoData()
    await act(async () => {
      await i18n.changeLanguage('en')
    })
  })

  it('renders BarcodeCapture with zero Filipino markers in English mode', () => {
    const { container } = renderWithProviders(<BarcodeCapture onCode={vi.fn()} autoFocus={false} />)
    assertNoFilipinoMarkers(container)
  })

  it('renders CameraScanner with zero Filipino markers in English mode', () => {
    const { container } = renderWithProviders(<CameraScanner onDetected={vi.fn()} />)
    assertNoFilipinoMarkers(container)
  })

  it('renders PairPhoneDialog with zero Filipino markers in English mode', async () => {
    const { container } = renderWithProviders(
      <PairPhoneDialog open={true} onOpenChange={vi.fn()} mode="pos" />,
    )
    assertNoFilipinoMarkers(container)
    assertNoFilipinoMarkers(document.body)
  })

  it('renders PrintLabelsDialog with zero Filipino markers in English mode', () => {
    const { container } = renderWithProviders(
      <PrintLabelsDialog
        open={true}
        onOpenChange={vi.fn()}
        product={{ name: 'Demo Item', barcode: '2000000000018', price: 15 }}
      />,
    )
    assertNoFilipinoMarkers(container)
    assertNoFilipinoMarkers(document.body)
  })

  it('renders /scan page with zero Filipino markers in English mode', async () => {
    const { container } = renderRoute('/scan')
    assertNoFilipinoMarkers(container)
  })

  it('renders /scan?code=ABCD-1234 with zero Filipino markers in English mode', async () => {
    const { container } = renderRoute('/scan?code=ABCD-1234')
    assertNoFilipinoMarkers(container)
  })

  it('renders AddByBarcodeDialog with zero Filipino markers in English mode', async () => {
    const { container } = renderWithProviders(
      <AddByBarcodeDialog
        open={true}
        onOpenChange={vi.fn()}
        categories={[{ id: 1, name: 'Canned Goods' }]}
        initialBarcode="3017620422003"
      />,
      { role: 'owner' },
    )
    assertNoFilipinoMarkers(container)
    assertNoFilipinoMarkers(document.body)
  })
})

