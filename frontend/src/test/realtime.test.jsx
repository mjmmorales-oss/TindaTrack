import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { subscribeToScanner } from '@/lib/realtime.js'
import * as scannerService from '@/services/scanner.js'

describe('subscribeToScanner polling driver', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('delivers events in chronological order and deduplicates', async () => {
    const listSpy = vi.spyOn(scannerService, 'listScannerEvents')
    listSpy
      .mockResolvedValueOnce([
        { id: 2, barcode: '4800016601028' },
        { id: 1, barcode: '4800016601011' },
      ])
      .mockResolvedValueOnce([
        { id: 2, barcode: '4800016601028' },
        { id: 3, barcode: '4800016601035' },
      ])
      .mockResolvedValue([])

    const received = []
    const unsub = subscribeToScanner('sess-123', {
      onEvent: (ev) => received.push(ev.id),
    })

    // Initial poll runs immediately
    await vi.advanceTimersByTimeAsync(10)
    expect(received).toEqual([1, 2])

    // Advance 1200ms for second poll
    await vi.advanceTimersByTimeAsync(1200)
    expect(received).toEqual([1, 2, 3])

    unsub()
  })

  it('backs off to 5000ms when document is hidden', async () => {
    const listSpy = vi.spyOn(scannerService, 'listScannerEvents').mockResolvedValue([])

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })

    const unsub = subscribeToScanner('sess-hidden', { onEvent: () => {} })

    // First call happens immediately
    await vi.advanceTimersByTimeAsync(10)
    expect(listSpy).toHaveBeenCalledTimes(1)

    // After 1200ms, should NOT have polled again because interval is 5000ms
    await vi.advanceTimersByTimeAsync(1300)
    expect(listSpy).toHaveBeenCalledTimes(1)

    // After reaching 5000ms, second poll executes
    await vi.advanceTimersByTimeAsync(3800)
    expect(listSpy).toHaveBeenCalledTimes(2)

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    unsub()
  })

  it('stops polling after 3 consecutive 401 or 404 errors', async () => {
    const listSpy = vi
      .spyOn(scannerService, 'listScannerEvents')
      .mockRejectedValue({ status: 401, message: 'Session ended' })

    const unsub = subscribeToScanner('sess-ended', { onEvent: () => {} })

    // 1st error
    await vi.advanceTimersByTimeAsync(10)
    expect(listSpy).toHaveBeenCalledTimes(1)

    // 2nd error
    await vi.advanceTimersByTimeAsync(1200)
    expect(listSpy).toHaveBeenCalledTimes(2)

    // 3rd error -> stops
    await vi.advanceTimersByTimeAsync(1200)
    expect(listSpy).toHaveBeenCalledTimes(3)

    // After more time, no more polls are executed
    await vi.advanceTimersByTimeAsync(5000)
    expect(listSpy).toHaveBeenCalledTimes(3)

    unsub()
  })

  it('unsubscribe stops all further polling immediately', async () => {
    const listSpy = vi.spyOn(scannerService, 'listScannerEvents').mockResolvedValue([])

    const unsub = subscribeToScanner('sess-cancel', { onEvent: () => {} })
    await vi.advanceTimersByTimeAsync(10)
    expect(listSpy).toHaveBeenCalledTimes(1)

    unsub()

    await vi.advanceTimersByTimeAsync(5000)
    expect(listSpy).toHaveBeenCalledTimes(1)
  })
})
