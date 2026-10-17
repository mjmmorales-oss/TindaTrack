import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoCapture } from '@/hooks/useAutoCapture'
import { AUTO_CAPTURE, getAutoCaptureProfile } from '@/config/ai'

describe('G2: useAutoCapture hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
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
})
