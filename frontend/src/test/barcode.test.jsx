import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  normalize,
  isValidGtin,
  isInternal,
  isAcceptable,
  makeInternal,
  computeCheckDigit,
} from '@/lib/barcode'
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge'

describe('Barcode helpers (lib/barcode.js) parity with backend', () => {
  it('normalize trims spaces, strips hyphens, and converts 12-digit UPC-A to 13-digit EAN', () => {
    expect(normalize(' 301-762-0422003 ')).toBe('3017620422003')
    expect(normalize('012345678905')).toBe('0012345678905')
    expect(normalize('  012-345-678905  ')).toBe('0012345678905')
    expect(normalize('CUSTOM-CODE-1')).toBe('CUSTOMCODE1')
  })

  it('isValidGtin verifies known valid and invalid EAN-8, EAN-13, and UPC-A', () => {
    expect(isValidGtin('96385074')).toBe(true) // EAN-8
    expect(isValidGtin('3017620422003')).toBe(true) // EAN-13 (Nutella)
    expect(isValidGtin('012345678905')).toBe(true) // UPC-A 12-digit
    expect(isValidGtin('0012345678905')).toBe(true) // EAN-13 prefixed UPC-A

    // Invalid check digits
    expect(isValidGtin('96385075')).toBe(false)
    expect(isValidGtin('3017620422004')).toBe(false)
    expect(isValidGtin('012345678901')).toBe(false)

    // Invalid lengths or characters
    expect(isValidGtin('123')).toBe(false)
    expect(isValidGtin('ABC1234567890')).toBe(false)
  })

  it('isInternal identifies GS1 restricted circulation range 20 to 29', () => {
    expect(isInternal('2000000000015')).toBe(true)
    expect(isInternal('2912345678900')).toBe(true)
    expect(isInternal('3017620422003')).toBe(false)
    expect(isInternal('4800016601011')).toBe(false)
  })

  it('isAcceptable handles GTINs, internal codes, custom codes, and rejects invalid barcodes', () => {
    expect(isAcceptable('3017620422003')).toBe(true)
    expect(isAcceptable('2000000000015')).toBe(true)
    expect(isAcceptable('SKU-1001')).toBe(true)
    expect(isAcceptable('ITEM-A')).toBe(true)

    // Invalid 13-digit barcode with wrong check digit
    expect(isAcceptable('3017620422004')).toBe(false)

    // Out of bounds / invalid characters
    expect(isAcceptable('12')).toBe(false)
    expect(isAcceptable('A'.repeat(33))).toBe(false)
    expect(isAcceptable('ITEM_CODE$')).toBe(false)
  })

  it('makeInternal generates valid EAN-13 starting with 20 and matching check digit', () => {
    const code1 = makeInternal(1)
    expect(code1).toHaveLength(13)
    expect(code1.startsWith('200000000001')).toBe(true)
    expect(isValidGtin(code1)).toBe(true)
    expect(isInternal(code1)).toBe(true)

    const code99 = makeInternal(99)
    expect(code99).toHaveLength(13)
    expect(code99.startsWith('200000000099')).toBe(true)
    expect(isValidGtin(code99)).toBe(true)
  })
})

describe('useBarcodeWedge hardware scanner hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits scanned code on rapid keystrokes (<50ms) followed by Enter', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcodeWedge({ onScan }))

    const code = '3017620422003'

    act(() => {
      for (const char of code) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: char }))
        vi.advanceTimersByTime(20) // Fast 20ms burst
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith(code)
  })

  it('does not emit if keystrokes are slow (>50ms apart)', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcodeWedge({ onScan }))

    const code = '3017620422003'

    act(() => {
      for (const char of code) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: char }))
        vi.advanceTimersByTime(120) // Slow human typing
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).not.toHaveBeenCalled()
  })

  it('ignores events when focused in a textarea', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcodeWedge({ onScan }))

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)

    act(() => {
      for (const char of '3017620422003') {
        const event = new KeyboardEvent('keydown', { key: char })
        Object.defineProperty(event, 'target', { value: textarea })
        window.dispatchEvent(event)
        vi.advanceTimersByTime(20)
      }
      const enter = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(enter, 'target', { value: textarea })
      window.dispatchEvent(enter)
    })

    expect(onScan).not.toHaveBeenCalled()
    document.body.removeChild(textarea)
  })

  it('ignores events in normal inputs but accepts inputs marked data-barcode-input', () => {
    const onScan = vi.fn()
    renderHook(() => useBarcodeWedge({ onScan }))

    const regularInput = document.createElement('input')
    const barcodeInput = document.createElement('input')
    barcodeInput.setAttribute('data-barcode-input', 'true')
    document.body.appendChild(regularInput)
    document.body.appendChild(barcodeInput)

    // 1. Regular input -> ignored
    act(() => {
      for (const char of '12345678') {
        const event = new KeyboardEvent('keydown', { key: char })
        Object.defineProperty(event, 'target', { value: regularInput })
        window.dispatchEvent(event)
        vi.advanceTimersByTime(20)
      }
      const enter = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(enter, 'target', { value: regularInput })
      window.dispatchEvent(enter)
    })
    expect(onScan).not.toHaveBeenCalled()

    // 2. Barcode input -> accepted
    act(() => {
      for (const char of '98765432') {
        const event = new KeyboardEvent('keydown', { key: char })
        Object.defineProperty(event, 'target', { value: barcodeInput })
        window.dispatchEvent(event)
        vi.advanceTimersByTime(20)
      }
      const enter = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(enter, 'target', { value: barcodeInput })
      window.dispatchEvent(enter)
    })
    expect(onScan).toHaveBeenCalledWith('98765432')

    document.body.removeChild(regularInput)
    document.body.removeChild(barcodeInput)
  })
})
