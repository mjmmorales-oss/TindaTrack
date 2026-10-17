import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoCapture } from '@/hooks/useAutoCapture'
import { AUTO_CAPTURE, getAutoCaptureProfile } from '@/config/ai'

describe('G2 & G8: useAutoCapture hook', () => {
  let mockPixelValue = 120

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    mockPixelValue = 120

    // Mock Canvas 2D Context
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => {
        const total = AUTO_CAPTURE.SAMPLE_WIDTH * AUTO_CAPTURE.SAMPLE_HEIGHT * 4
        const data = new Uint8ClampedArray(total)
        for (let i = 0; i < total; i += 4) {
          data[i] = mockPixelValue
          data[i + 1] = mockPixelValue
          data[i + 2] = mockPixelValue
          data[i + 3] = 255
        }
        return { data }
      }),
    }))

    // Mock RAF with fake timers
    window.requestAnimationFrame = vi.fn((cb) => {
      return setTimeout(() => cb(Date.now()), 50)
    })
    window.cancelAnimationFrame = vi.fn((id) => {
      clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('respects sensitivity profiles', () => {
    expect(getAutoCaptureProfile('low')).toEqual({
      motionThreshold: 6.0,
      steadyDurationMs: 1500,
    })
    expect(getAutoCaptureProfile('medium')).toEqual({
      motionThreshold: 4.5,
      steadyDurationMs: 1200,
    })
    expect(getAutoCaptureProfile('high')).toEqual({
      motionThreshold: 3.0,
      steadyDurationMs: 900,
    })
  })

  it('initializes in off state when enabled is false or toggled off', () => {
    const videoRef = { current: null }
    const onTrigger = vi.fn()

    const { result } = renderHook(() =>
      useAutoCapture({
        videoRef,
        enabled: false,
        onTriggerCapture: onTrigger,
      }),
    )

    expect(result.current.state).toBe('off')
    expect(result.current.countdownRemaining).toBe(0)
  })

  it('persists isAutoEnabled toggle in localStorage per mode', () => {
    const videoRef = { current: null }
    const onTrigger = vi.fn()

    const { result } = renderHook(() =>
      useAutoCapture({
        videoRef,
        enabled: true,
        mode: 'products',
        onTriggerCapture: onTrigger,
      }),
    )

    expect(result.current.isAutoEnabled).toBe(true)

    act(() => {
      result.current.toggleAuto()
    })

    expect(result.current.isAutoEnabled).toBe(false)
    expect(localStorage.getItem('tindatrack:auto_capture_enabled:products')).toBe('false')

    act(() => {
      result.current.toggleAuto()
    })

    expect(result.current.isAutoEnabled).toBe(true)
    expect(localStorage.getItem('tindatrack:auto_capture_enabled:products')).toBe('true')
  })

  it('triggers manual capture immediately and resets countdown', () => {
    const videoRef = { current: null }
    const onTrigger = vi.fn()

    const { result } = renderHook(() =>
      useAutoCapture({
        videoRef,
        enabled: true,
        onTriggerCapture: onTrigger,
      }),
    )

    act(() => {
      result.current.manualTrigger()
    })

    expect(onTrigger).toHaveBeenCalledWith('manual')
    expect(result.current.lastCaptureMode).toBe('manual')
    expect(result.current.state).toBe('capturing')
  })

  it('rejects blank or pitch-black frames and never starts countdown', () => {
    mockPixelValue = 10 // luma = 10 < MIN_LUMINANCE (35)
    const videoRef = {
      current: {
        readyState: 4,
        paused: false,
        ended: false,
      },
    }
    const onTrigger = vi.fn()

    const { result } = renderHook(() =>
      useAutoCapture({
        videoRef,
        enabled: true,
        onTriggerCapture: onTrigger,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.isSceneTooDark).toBe(true)
    expect(result.current.state).toBe('watching')
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('pauses motion detection when tab is hidden or isProcessing is true', () => {
    const videoRef = {
      current: {
        readyState: 4,
        paused: false,
        ended: false,
      },
    }
    const onTrigger = vi.fn()

    const { result, rerender } = renderHook(
      ({ isProcessing }) =>
        useAutoCapture({
          videoRef,
          enabled: true,
          isProcessing,
          onTriggerCapture: onTrigger,
        }),
      { initialProps: { isProcessing: false } },
    )

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Rerender with isProcessing = true
    rerender({ isProcessing: true })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.state).toBe('paused')
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('pauses when rate limit backoff is active', () => {
    const videoRef = {
      current: {
        readyState: 4,
        paused: false,
        ended: false,
      },
    }
    const onTrigger = vi.fn()
    const rateLimitBackoffUntil = Date.now() + 5000

    const { result } = renderHook(() =>
      useAutoCapture({
        videoRef,
        enabled: true,
        rateLimitBackoffUntil,
        onTriggerCapture: onTrigger,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.state).toBe('paused')
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('progresses to steady, runs countdown, and fires onCapture exactly once', () => {
    mockPixelValue = 120
    const videoRef = {
      current: {
        readyState: 4,
        paused: false,
        ended: false,
      },
    }
    const onTrigger = vi.fn()

    const { result } = renderHook(() =>
      useAutoCapture({
        videoRef,
        enabled: true,
        sensitivity: 'high', // 900ms steady duration
        onTriggerCapture: onTrigger,
      }),
    )

    // Advance 500ms -> should be in watching/steady transition
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(['watching', 'steady']).toContain(result.current.state)

    // Advance beyond steady duration (900ms) -> enters countdown
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(result.current.state).toBe('countdown')

    // Advance full countdown (1500ms) -> triggers capture
    act(() => {
      vi.advanceTimersByTime(1600)
    })

    expect(onTrigger).toHaveBeenCalledTimes(1)
    expect(onTrigger).toHaveBeenCalledWith('auto')
    expect(result.current.state).toBe('capturing')
  })

  it('aborts countdown when movement is detected during countdown', () => {
    mockPixelValue = 120
    const videoRef = {
      current: {
        readyState: 4,
        paused: false,
        ended: false,
      },
    }
    const onTrigger = vi.fn()

    const { result } = renderHook(() =>
      useAutoCapture({
        videoRef,
        enabled: true,
        sensitivity: 'high',
        onTriggerCapture: onTrigger,
      }),
    )

    // Advance into countdown
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(result.current.state).toBe('countdown')

    // Cause sudden motion
    act(() => {
      mockPixelValue = 220 // large change in luminance = motion
      vi.advanceTimersByTime(100)
    })

    // Countdown should be aborted
    expect(result.current.state).toBe('watching')
    expect(result.current.abortCount).toBeGreaterThanOrEqual(1)
    expect(onTrigger).not.toHaveBeenCalled()
  })
})
