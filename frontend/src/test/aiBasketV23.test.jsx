import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BasketReviewSheet } from '@/features/pos/components/BasketReviewSheet'
import { usePendingBasket, PENDING_BASKET_KEY } from '@/features/pos/hooks/usePendingBasket'
import { mergeIntoDraft, toReviewDraft } from '@/features/pos/lib/basketReview'
import { AiCapture } from '@/components/ai/AiCapture'
import { AI_IMAGE_OPTIONS } from '@/config/ai'
import { makePreviewDataUrl, BASKET_PREVIEW_OPTIONS } from '@/lib/imagePrep'
import { normalizeBasketResult } from '@/lib/aiContract'
import mockScannerService from '@/services/mock/scannerService'
import mockAiService from '@/services/mock/aiService'

/** v2.3 S1/S3/S4: review that never vanishes, live stages, images. */
const product = (id, name, extra = {}) => ({ id, name, price: 20, stock_quantity: 10, image_url: `/demo-products/p${id}.svg`, ...extra })

const scan = (items, extra = {}) =>
  normalizeBasketResult({
    scan_id: 's1',
    items: items.map(([p, qty]) => ({ product_id: p.id, product: p, quantity: qty, confidence: 0.9, box_2d: [1, 1, 50, 50] })),
    unmatched: [],
    client_timings: { upload_ms: 400, total_ms: 4200 },
    ...extra,
  })

function withClient(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('S1: one image setting and live stages', () => {
  it('every AI upload path uses AI_IMAGE_OPTIONS (1024 px, q 0.8, 600 KB)', () => {
    expect(AI_IMAGE_OPTIONS).toEqual({ maxDim: 1024, maxBytes: 600 * 1024, initialQuality: 0.8 })
    const root = path.resolve(__dirname, '..')
    for (const file of ['components/ai/AiCapture.jsx', 'components/scanner/VisualMatchPanel.jsx', 'features/ai-lab/components/NewTestCaseDialog.jsx']) {
      const src = fs.readFileSync(path.join(root, file), 'utf8')
      expect(src, file).toContain('AI_IMAGE_OPTIONS')
      expect(src, file).not.toMatch(/maxDim:\s*1600|maxDim:\s*1024/)
    }
  })

  it('the analyzing overlay shows the stages and an elapsed counter', () => {
    Object.defineProperty(window.navigator, 'mediaDevices', { configurable: true, value: undefined })
    withClient(<AiCapture onCapture={vi.fn()} isAnalyzing analyzingStage="reading" autoCaptureEnabled={false} />)
    const overlay = screen.getByTestId('analyzing-overlay')
    expect(overlay.querySelector('[data-stage="uploading"]').dataset.status).toBe('done')
    expect(overlay.querySelector('[data-stage="reading"]').dataset.status).toBe('active')
    expect(overlay.querySelector('[data-stage="matching"]').dataset.status).toBe('todo')
    expect(screen.getByTestId('analyzing-elapsed')).toHaveTextContent(/\d+\.\d s/)
  })

  it('the review shows "Analyzed in X.X s"', () => {
    withClient(<BasketReviewSheet open scanResult={scan([[product(1, 'Coke'), 1]])} onOpenChange={vi.fn()} />)
    expect(screen.getByTestId('analyzed-in')).toHaveTextContent(/4\.2/)
  })

  it('the mock and API scans report the same timing shape', async () => {
    const res = await mockAiService.basketScan(new Blob([new Uint8Array([1])], { type: 'image/jpeg' }))
    expect(res.client_timings).toEqual(expect.objectContaining({ upload_ms: expect.any(Number), total_ms: expect.any(Number) }))
    expect(res.timings).toEqual(expect.objectContaining({ gemini_ms: expect.any(Number) }))
  })
})

describe('S4: images in the review', () => {
  it('rows render the product image (ProductThumb imageUrl), not initials', () => {
    const { container } = withClient(
      <BasketReviewSheet open scanResult={scan([[product(1, 'Coke Mismo'), 2]])} onOpenChange={vi.fn()} />,
    )
    const img = [...container.ownerDocument.querySelectorAll('img')].find((i) => i.getAttribute('src')?.includes('p1.svg'))
    expect(img).toBeTruthy()
  })

  it('without any photo the left pane collapses; a phone preview fills it', () => {
    const { unmount } = withClient(<BasketReviewSheet open scanResult={scan([[product(1, 'Coke'), 1]])} onOpenChange={vi.fn()} />)
    expect(screen.queryByTestId('review-photo-pane')).not.toBeInTheDocument()
    unmount()

    withClient(
      <BasketReviewSheet
        open
        scanResult={scan([[product(1, 'Coke'), 1]], { preview_data_url: 'data:image/jpeg;base64,AAAA' })}
        onOpenChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('review-photo-pane').querySelector('img').getAttribute('src')).toBe('data:image/jpeg;base64,AAAA')
  })

  it('the phone preview is a small JPEG under the 60 KB / server 100 KB limit', async () => {
    const ua = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)')
    HTMLCanvasElement.prototype.toBlob = (cb, type) => cb(new Blob([new Uint8Array(20 * 1024)], { type }))
    const url = await makePreviewDataUrl(document.createElement('canvas'))
    expect(url).toMatch(/^data:image\/jpeg;base64,/)
    expect(atob(url.split(',')[1]).length).toBeLessThanOrEqual(BASKET_PREVIEW_OPTIONS.maxBytes)
    delete HTMLCanvasElement.prototype.toBlob
    ua.mockRestore()
  })
})

describe('S3: the review never vanishes', () => {
  beforeEach(() => sessionStorage.clear())

  it('Add merges quantities by product; new products are appended', () => {
    const coke = product(1, 'Coke')
    const chips = product(2, 'Chips')
    const draft = toReviewDraft(scan([[coke, 2]]))
    draft.confirmedItems[0].quantity = 3 // the cashier's edit
    const merged = mergeIntoDraft(draft, scan([[coke, 1], [chips, 4]]))
    expect(merged.confirmedItems.map((r) => [r.matched_product_id, r.quantity])).toEqual([[1, 4], [2, 4]])
  })

  it('a basket arriving while a review is open goes to the banner, not over the edits', () => {
    const { result } = renderHook(() => usePendingBasket())
    act(() => result.current.receive(scan([[product(1, 'Coke'), 2]]), null, 'phone'))
    const firstKey = result.current.pending.key
    act(() => result.current.receive(scan([[product(2, 'Chips'), 1]]), null, 'phone'))

    expect(result.current.pending.key).toBe(firstKey)
    expect(result.current.incoming).not.toBeNull()

    act(() => result.current.resolveIncoming('add'))
    expect(result.current.pending.draft.confirmedItems.map((r) => r.matched_product_id)).toEqual([1, 2])
    expect(result.current.incoming).toBeNull()
  })

  it('the sheet shows the banner and its buttons resolve it', () => {
    const onResolve = vi.fn()
    withClient(
      <BasketReviewSheet
        open
        scanResult={scan([[product(1, 'Coke'), 1]])}
        incoming={{ result: scan([[product(2, 'Chips'), 3]]) }}
        onResolveIncoming={onResolve}
        onOpenChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('incoming-basket-banner')).toHaveTextContent(/3/)
    fireEvent.click(screen.getByRole('button', { name: /add to this list|idagdag sa listahang/i }))
    expect(onResolve).toHaveBeenCalledWith('add')
  })

  it('a pointer-down outside does not close; Esc with items asks first', async () => {
    const onOpenChange = vi.fn()
    const onDiscard = vi.fn()
    withClient(
      <BasketReviewSheet open scanResult={scan([[product(1, 'Coke'), 1]])} onOpenChange={onOpenChange} onDiscard={onDiscard} />,
    )

    fireEvent.pointerDown(document.body)
    fireEvent.mouseDown(document.body)
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onDiscard).not.toHaveBeenCalled()

    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' })
    expect(await screen.findByText(/discard this scan|itapon ang scan/i)).toBeInTheDocument()
    expect(onDiscard).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /^(discard|itapon)$/i }))
    await waitFor(() => expect(onDiscard).toHaveBeenCalledTimes(1))
  })

  it('the pending basket (with edits) survives an unmount/remount via sessionStorage', () => {
    const first = renderHook(() => usePendingBasket())
    act(() => first.result.current.receive(scan([[product(1, 'Coke'), 2]]), 'data:image/jpeg;base64,AAAA', 'laptop'))
    act(() => first.result.current.setDraft({ ...first.result.current.pending.draft, confirmedItems: [{ ...first.result.current.pending.draft.confirmedItems[0], quantity: 5 }] }))
    first.unmount()

    expect(sessionStorage.getItem(PENDING_BASKET_KEY)).toBeTruthy()
    const second = renderHook(() => usePendingBasket())
    expect(second.result.current.pending.draft.confirmedItems[0].quantity).toBe(5)
    expect(second.result.current.pending.imageSrc).toBe('data:image/jpeg;base64,AAAA')

    act(() => second.result.current.finish())
    expect(sessionStorage.getItem(PENDING_BASKET_KEY)).toBeNull()
  })

  it('finishing a phone basket reports basket_done', () => {
    const onFinished = vi.fn()
    const { result } = renderHook(() => usePendingBasket({ onFinished }))
    act(() => result.current.receive(scan([[product(1, 'Coke'), 1]]), null, 'phone'))
    act(() => result.current.finish())
    expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ source: 'phone' }))
  })
})

describe('S3: the phone sends once per basket', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => vi.restoreAllMocks())

  async function pairMockPhone() {
    const session = await mockScannerService.createScannerSession({ mode: 'pos' })
    const s = session.data ?? session
    await mockScannerService.pairScanner({ pairing_code: s.pairing_code, device_label: 'Test' })
    return s
  }

  it('after a basket the phone stays paused (basket_pending) until the POS says basket_done', async () => {
    const s = await pairMockPhone()
    const res = await mockScannerService.sendAiBasket(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }))
    expect(res.empty).toBe(false)

    expect((await mockScannerService.scannerHeartbeat()).basket_pending).toBe(true)
    await mockScannerService.basketDone(s.id)
    expect((await mockScannerService.scannerHeartbeat()).basket_pending).toBe(false)
  })

  it('an empty result is never sent to the POS', async () => {
    const s = await pairMockPhone()
    vi.spyOn(mockAiService, 'basketScan').mockResolvedValue(normalizeBasketResult({ items: [], unmatched: [] }))
    const before = (await mockScannerService.listScannerEvents(s.id, 0)) || []

    const res = await mockScannerService.sendAiBasket(new Blob([new Uint8Array([1])], { type: 'image/jpeg' }))
    expect(res.empty).toBe(true)
    const after = (await mockScannerService.listScannerEvents(s.id, 0)) || []
    expect((after.data ?? after).length).toBe((before.data ?? before).length)
    expect((await mockScannerService.scannerHeartbeat()).basket_pending).toBe(false)
  })
})
