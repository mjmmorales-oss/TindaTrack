import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { formatDate, getActiveLocale } from '@/lib/format'
import { translateErrorMessage } from '@/lib/errors'

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
