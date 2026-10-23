import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { pickVisualDevice, dtypeForDevice, isIOSWebKit, hasSceneChanged, countIndexedProducts, aggregateModelProgress } from '@/lib/visualSearch'

const cameraState = { status: 'idle', videoRef: { current: null } }
vi.mock('@/hooks/useCameraScanner', () => ({
  useCameraScanner: vi.fn((opts) => ({ ...cameraState, enabledArg: opts?.enabled })),
}))
vi.mock('@/config/visual', async (orig) => ({
  ...(await orig()),
  VISUAL_SCAN_INTERVAL_MS: 20,
  VISUAL_ASK_AI_AFTER_MS: 0,
}))

const { useCameraScanner } = await import('@/hooks/useCameraScanner')
const visualSearch = await import('@/lib/visualSearch')
const { VisualMatchPanel } = await import('@/components/scanner/VisualMatchPanel')
const mockAiService = (await import('@/services/mock/aiService')).default

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36'

describe('A5: device selection', () => {
  it('uses wasm (q8) on iOS even when navigator.gpu exists', async () => {
    const gpu = { requestAdapter: vi.fn().mockResolvedValue({}) }
    expect(await pickVisualDevice({ userAgent: IOS_UA, gpu })).toBe('wasm')
    expect(gpu.requestAdapter).not.toHaveBeenCalled()
    expect(isIOSWebKit('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true) // iPadOS
    expect(dtypeForDevice('wasm')).toBe('q8')
  })

  it('uses WebGPU only when an adapter is really returned', async () => {
    expect(await pickVisualDevice({ userAgent: CHROME_UA, gpu: { requestAdapter: async () => ({}) } })).toBe('webgpu')
    expect(await pickVisualDevice({ userAgent: CHROME_UA, gpu: { requestAdapter: async () => null } })).toBe('wasm')
    expect(await pickVisualDevice({ userAgent: CHROME_UA, gpu: { requestAdapter: async () => { throw new Error('x') } } })).toBe('wasm')
    expect(await pickVisualDevice({ userAgent: CHROME_UA, gpu: undefined })).toBe('wasm')
  })
})

describe('A5: frame skipping and index helpers', () => {
  it('only reports a change when the luma moved enough', () => {
    const a = new Uint8Array(192).fill(100)
    expect(hasSceneChanged(a, new Uint8Array(192).fill(102))).toBe(false)
    expect(hasSceneChanged(a, new Uint8Array(192).fill(140))).toBe(true)
    expect(hasSceneChanged(null, a)).toBe(true)
  })

  it('counts distinct taught products and aggregates download progress', () => {
    expect(countIndexedProducts([{ product_id: 1, vector: [1] }, { product_id: 1, vector: [1] }, { product_id: 2, vector: [1] }, { product_id: 3 }])).toBe(2)
    expect(aggregateModelProgress({ status: 'progress', file: 'a.onnx', loaded: 50, total: 100 })).toBe(50)
    expect(aggregateModelProgress({ status: 'progress', file: 'b.json', loaded: 0, total: 100 })).toBe(25)
  })
})

describe('A5: VisualMatchPanel', () => {
  let uaSpy

  beforeEach(() => {
    cameraState.status = 'idle'
    cameraState.videoRef = { current: null }
    useCameraScanner.mockClear()
    visualSearch.terminateVisualWorker()
    visualSearch.invalidateVisualIndex()
    // jsdom has no Worker: answer INIT like the real embedder worker
    globalThis.Worker = class FakeWorker {
      postMessage(msg) {
        if (msg?.type === 'INIT') {
          setTimeout(() => this.onmessage?.({ data: { type: 'READY', payload: { device: msg.payload.device } } }), 0)
        }
      }
      terminate() {}
    }
  })

  afterEach(() => {
    uaSpy?.mockRestore()
    vi.restoreAllMocks()
    visualSearch.terminateVisualWorker()
    delete globalThis.Worker
  })

  it('shows the empty state and never enables the camera when nothing is taught', async () => {
    vi.spyOn(mockAiService, 'getEmbeddings').mockResolvedValue({ data: [] })
    render(<VisualMatchPanel products={[]} onSelect={vi.fn()} />)

    expect(await screen.findByTestId('visual-empty')).toBeInTheDocument()
    expect(screen.getByText(/knows 0 products|Walang alam/i)).toBeInTheDocument()
    for (const [opts] of useCameraScanner.mock.calls) {
      expect(opts.enabled).toBe(false)
    }
  })

  it('shows the taught-product count and "Ask AI" sends a real Blob', async () => {
    // Real canvas.toBlob path, not the jsdom shortcut
    uaSpy = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(CHROME_UA)
    HTMLCanvasElement.prototype.toBlob = function toBlob(cb, type) {
      cb(new Blob([new Uint8Array([1, 2, 3])], { type }))
    }

    const product = { id: 7, name: 'Lucky Me Pancit Canton', price: 18 }
    vi.spyOn(mockAiService, 'getEmbeddings').mockResolvedValue({
      data: [{ id: 1, product_id: 7, vector: [1, 0, 0] }],
    })
    const basketSpy = vi.spyOn(mockAiService, 'basketScan').mockResolvedValue({
      items: [{ matched_product_id: 7, matched_product: product, confidence: 0.9, quantity: 2 }],
    })

    // The panel renders its own <video>; give every video a live 640×480 frame
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4)
    vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(640)
    vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(480)
    cameraState.videoRef = { current: null }
    cameraState.status = 'scanning'

    const onSelect = vi.fn()
    render(<VisualMatchPanel products={[product]} onSelect={onSelect} />)

    expect(await screen.findByText(/knows 1 product/i)).toBeInTheDocument()
    const askAi = await screen.findByRole('button', { name: /ask ai|tanungin/i })
    fireEvent.click(askAi)

    await waitFor(() => expect(basketSpy).toHaveBeenCalled())
    expect(basketSpy.mock.calls[0][0]).toBeInstanceOf(Blob)
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 7 })))
    delete HTMLCanvasElement.prototype.toBlob
  })
})
