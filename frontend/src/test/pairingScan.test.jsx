import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { toast } from 'sonner'
import { classifyScan, parsePairingCode } from '@/lib/barcode'
import { BarcodeCapture } from '@/components/scanner/BarcodeCapture'
import mockBarcodeService from '@/services/mock/barcodeService'
import { useCartStore } from '@/stores/cartStore'
import { useMockDb } from '@/mocks/db'
import { renderRoute } from './renderRoute'

const PAIR_URL = 'https://tindatrack.vercel.app/scan?code=ABCD-EFGH'

/** Simulates a USB/Bluetooth wedge: fast keystrokes followed by Enter. */
function wedgeType(text) {
  act(() => {
    for (const key of text) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
}

describe('A3: classifyScan', () => {
  it('recognizes pairing QR URLs and bare pairing codes', () => {
    expect(classifyScan(PAIR_URL)).toEqual({ kind: 'pairing', code: 'ABCD-EFGH', fromUrl: true })
    expect(classifyScan('https://192.168.1.5:5173/scan/?code=abcdefgh')).toEqual({
      kind: 'pairing',
      code: 'ABCD-EFGH',
      fromUrl: true,
    })
    expect(classifyScan('abcd-efgh')).toEqual({ kind: 'pairing', code: 'ABCD-EFGH', fromUrl: false })
    expect(parsePairingCode('ABCD0EFG')).toBeNull() // 0 is not in the pairing alphabet
  })

  it('returns barcodes normalized and everything else as unknown', () => {
    expect(classifyScan('3017620422003')).toEqual({ kind: 'barcode', value: '3017620422003' })
    expect(classifyScan(' 036000291452 ')).toEqual({ kind: 'barcode', value: '0036000291452' })
    expect(classifyScan('23456789')).toEqual({ kind: 'barcode', value: '23456789' }) // digits never pair
    expect(classifyScan('https://example.com/promo')).toEqual({ kind: 'unknown' })
    expect(classifyScan('https://tindatrack.app/products?code=ABCD-EFGH')).toEqual({ kind: 'unknown' })
    expect(classifyScan('hello world')).toEqual({ kind: 'unknown' })
    expect(classifyScan('')).toEqual({ kind: 'unknown' })
  })
})

describe('A3: scanners never send a pairing URL to the barcode lookup', () => {
  let lookupSpy

  beforeEach(() => {
    localStorage.clear()
    useMockDb.getState().resetDemoData()
    useCartStore.getState().clear()
    lookupSpy = vi.spyOn(mockBarcodeService, 'lookupBarcode')
  })

  afterEach(() => {
    lookupSpy.mockRestore()
  })

  it('BarcodeCapture hands a scanned pairing QR to onPairingCode, not onCode', () => {
    const onCode = vi.fn()
    const onPairingCode = vi.fn()
    render(<BarcodeCapture onCode={onCode} onPairingCode={onPairingCode} autoFocus={false} cameraDefault="off" />)

    wedgeType(PAIR_URL)
    expect(onPairingCode).toHaveBeenCalledWith('ABCD-EFGH')
    expect(onCode).not.toHaveBeenCalled()
  })

  it('BarcodeCapture warns on a random QR and does not emit it', () => {
    const onCode = vi.fn()
    const warnSpy = vi.spyOn(toast, 'warning')
    render(<BarcodeCapture onCode={onCode} autoFocus={false} cameraDefault="off" />)

    wedgeType('https://example.com/promo')
    expect(onCode).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('POS: wedge-scanning the pairing QR shows the pairing hint and never calls lookup', async () => {
    const infoSpy = vi.spyOn(toast, 'info')
    const first = useMockDb.getState().products.find((p) => p.is_active)
    renderRoute('/pos', { role: 'owner' })
    await screen.findAllByText(first.name, {}, { timeout: 5000 })

    wedgeType(PAIR_URL)

    await waitFor(() => expect(infoSpy).toHaveBeenCalled())
    expect(String(infoSpy.mock.calls[0][0])).toMatch(/pairing|pag-pair/i)
    expect(lookupSpy).not.toHaveBeenCalled()
    expect(useCartStore.getState().items).toHaveLength(0)
    infoSpy.mockRestore()
  })

  it('POS: the USB wedge adds a real product barcode to the cart', async () => {
    const product = useMockDb
      .getState()
      .products.find(
        (p) => p.is_active && (p.stock_quantity ?? 0) > 0 && classifyScan(p.barcode).kind === 'barcode',
      )
    expect(product).toBeTruthy()
    renderRoute('/pos', { role: 'owner' })
    await screen.findAllByText(product.name, {}, { timeout: 5000 })

    wedgeType(product.barcode)

    await waitFor(() => expect(useCartStore.getState().items.map((i) => i.product_id)).toContain(product.id))
  })
})
