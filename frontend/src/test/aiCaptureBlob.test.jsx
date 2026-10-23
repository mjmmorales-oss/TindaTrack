import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AiCapture } from '@/components/ai/AiCapture'
import { toImageBlob, InvalidImageError } from '@/lib/imagePrep'
import mockAiService from '@/services/mock/aiService'
import mockScannerService from '@/services/mock/scannerService'

/**
 * v2.2 A1 regression: captureFrame() returns a canvas, and real browsers throw
 * "FormData.append: parameter 2 is not of type 'Blob'" when it is sent as-is.
 * These tests take the real canvas.toBlob path (not the jsdom shortcut) and
 * assert real Blob instances.
 */
describe('A1: AI camera capture always produces a real Blob', () => {
  let uaSpy

  beforeEach(() => {
    // Hide the "jsdom" UA so imagePrep uses canvas.toBlob like a real browser.
    uaSpy = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) Safari')
    HTMLCanvasElement.prototype.toBlob = function toBlob(cb, type) {
      cb(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: type || 'image/png' }))
    }
    HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())

    const fakeTrack = { stop: vi.fn(), getCapabilities: () => ({}) }
    const fakeStream = { getTracks: () => [fakeTrack], getVideoTracks: () => [fakeTrack] }
    Object.defineProperty(window.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(() => Promise.resolve(fakeStream)) },
    })
  })

  afterEach(() => {
    uaSpy.mockRestore()
    delete HTMLCanvasElement.prototype.toBlob
  })

  it('manual capture hands onCapture a Blob, never the canvas', async () => {
    const onCapture = vi.fn()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={client}>
        <AiCapture onCapture={onCapture} autoCaptureEnabled={false} />
      </QueryClientProvider>,
    )

    const video = container.querySelector('video')
    await waitFor(() => expect(typeof video.onloadedmetadata).toBe('function'))
    Object.defineProperty(video, 'videoWidth', { value: 640 })
    Object.defineProperty(video, 'videoHeight', { value: 480 })
    fireEvent(video, new Event('loadedmetadata'))

    const shutter = screen.getByRole('button', { name: /capture photo/i })
    await waitFor(() => expect(shutter).not.toBeDisabled())
    fireEvent.click(shutter)

    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1))
    const [blob, mode] = onCapture.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob).not.toBeInstanceOf(HTMLCanvasElement)
    expect(blob.type).toBe('image/jpeg')
    expect(mode).toBe('manual')
  })

  it('toImageBlob encodes a canvas and rejects non-images', async () => {
    const canvas = document.createElement('canvas')
    await expect(toImageBlob(canvas)).resolves.toBeInstanceOf(Blob)

    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    await expect(toImageBlob(file)).resolves.toBe(file)

    await expect(toImageBlob('data:image/png;base64,AAA')).rejects.toBeInstanceOf(InvalidImageError)
    await expect(toImageBlob(undefined)).rejects.toBeInstanceOf(InvalidImageError)
    await expect(toImageBlob({ size: 10 })).rejects.toBeInstanceOf(InvalidImageError)
  })

  it('basketScan / productScan / sendAiBasket throw a friendly error for a non-Blob', async () => {
    await expect(mockAiService.basketScan({})).rejects.toThrow(/photo could not be read/i)
    await expect(mockAiService.productScan('not-an-image')).rejects.toThrow(/photo could not be read/i)
    await expect(mockScannerService.sendAiBasket(null)).rejects.toThrow(/photo could not be read/i)
  })

  it('the API service converts before FormData.append (real FormData rejects canvases)', async () => {
    const { aiService: apiAi } = await import('@/services/api/aiService.js')
    const { apiClient } = await import('@/services/api/apiClient.js')
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { items: [], unmatched: [] } })

    await apiAi.basketScan(document.createElement('canvas'), { capture_mode: 'manual' })
    const formData = postSpy.mock.calls[0][1]
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('image')).toBeInstanceOf(Blob)
    expect(formData.get('capture_mode')).toBe('manual')

    await expect(apiAi.basketScan({ not: 'a blob' })).rejects.toBeInstanceOf(InvalidImageError)
    postSpy.mockRestore()
  })
})

describe('A1b: multipart uploads survive the real axios request pipeline', () => {
  it('basketScan / uploadImage send FormData with the file (not JSON)', async () => {
    const { api } = await import('@/lib/api')
    const { aiService: apiAi } = await import('@/services/api/aiService.js')
    const { productService: apiProducts } = await import('@/services/api/productService.js')

    // A stub adapter sees the request *after* axios' transformRequest ran
    const seen = []
    const originalAdapter = api.defaults.adapter
    api.defaults.adapter = async (config) => {
      seen.push(config)
      return { data: { data: { items: [], unmatched: [] } }, status: 200, statusText: 'OK', headers: {}, config }
    }

    try {
      await apiAi.basketScan(new Blob([new Uint8Array([1, 2])], { type: 'image/jpeg' }), { capture_mode: 'auto' })
      await apiProducts.uploadImage(5, new File([new Uint8Array([3])], 'p.jpg', { type: 'image/jpeg' }))
    } finally {
      api.defaults.adapter = originalAdapter
    }

    for (const config of seen) {
      expect(config.data).toBeInstanceOf(FormData)
      expect(config.data.get('image')).toBeInstanceOf(Blob)
    }
    expect(seen[0].data.get('capture_mode')).toBe('auto')
    expect(seen).toHaveLength(2)
  })
})
