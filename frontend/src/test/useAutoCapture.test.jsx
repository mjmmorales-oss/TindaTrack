import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoCapture } from '@/hooks/useAutoCapture'
import { AUTO_CAPTURE, getAutoCaptureProfile } from '@/config/ai'
import { createAutoCaptureMachine, frameSignatureFromRgba, motionScore } from '@/lib/motion'

/**
 * v2.3 S2: auto-capture that fires on a hand-held phone.
 * Synthetic 64×48 frames: a textured "basket" scene + sensor noise, exposure
 * drift, or real movement (shifting the scene / a different basket).
 */
const W = AUTO_CAPTURE.SAMPLE_WIDTH
const H = AUTO_CAPTURE.SAMPLE_HEIGHT

let seed = 1
const rand = () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

/**
 * @param {{ shift?: number, noise?: number, exposure?: number, scene?: number, value?: number }} opts
 */
function frame({ shift = 0, noise = 0, exposure = 0, scene = 0, value } = {}) {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const base =
        value ?? 128 + 60 * Math.sin((x + shift) / (3 + scene)) * Math.cos((y + scene * 7) / (4 + scene))
      const v = base + exposure + (noise ? (rand() * 2 - 1) * noise : 0)
      const i = (y * W + x) * 4
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return data
}

const sig = (rgba) => frameSignatureFromRgba(rgba, W, H)

function machine(overrides = {}) {
  const { motionThreshold, steadyDurationMs } = getAutoCaptureProfile('medium')
  return createAutoCaptureMachine({
    motionThreshold,
    steadyMs: steadyDurationMs,
    countdownMs: AUTO_CAPTURE.COUNTDOWN_MS,
    sceneGuardMs: AUTO_CAPTURE.SCENE_GUARD_MS,
    sceneGuardThreshold: AUTO_CAPTURE.SCENE_GUARD_THRESHOLD,
    minLuminance: AUTO_CAPTURE.MIN_LUMINANCE,
    cooldownMs: 0,
    abortHintCount: AUTO_CAPTURE.ABORT_HINT_COUNT,
    ...overrides,
  })
}

/** Runs `ms` of 10 fps frames through the machine. Returns the fire times. */
function run(m, clock, ms, makeFrame) {
  const fires = []
  const states = []
  for (let t = 0; t < ms; t += 100) {
    clock.now += 100
    const r = m.step({ now: clock.now, ...sig(makeFrame(clock.now)) })
    states.push(r.state)
    if (r.fire) fires.push(clock.now)
  }
  return { fires, states }
}

describe('S2: shake-tolerant motion score', () => {
  it('noise and exposure drift score far below the threshold; movement far above', () => {
    seed = 7
    const s = (rgba) => sig(rgba).signature
    const still = s(frame())
    expect(motionScore(still, s(frame({ noise: 14 })))).toBeLessThan(2)
    expect(motionScore(still, s(frame({ exposure: 25 })))).toBeLessThan(0.5) // mean-subtracted
    expect(motionScore(still, s(frame({ shift: 6 })))).toBeGreaterThan(AUTO_CAPTURE.MOTION_THRESHOLD)
    expect(motionScore(still, s(frame({ scene: 2 })))).toBeGreaterThan(AUTO_CAPTURE.MOTION_THRESHOLD)
  })

  it('profiles: low is careful, high captures most readily; steady 800 ms and a 1 s ring by default', () => {
    expect(getAutoCaptureProfile('medium')).toEqual({ motionThreshold: 6, steadyDurationMs: 800 })
    expect(getAutoCaptureProfile('low').motionThreshold).toBeLessThan(getAutoCaptureProfile('high').motionThreshold)
    expect(AUTO_CAPTURE.COUNTDOWN_MS).toBe(1000)
  })
})

describe('S2: auto-capture state machine', () => {
  it('slight noise + exposure drift counts as steady and captures exactly once', () => {
    seed = 3
    const m = machine()
    const clock = { now: 0 }
    const { fires, states } = run(m, clock, 4000, (t) => frame({ noise: 12, exposure: Math.sin(t / 300) * 20 }))

    expect(fires).toHaveLength(1)
    expect(fires[0]).toBeLessThanOrEqual(100 + 800 + 1000 + 200) // looking → hold still → ring → fire
    expect(states).toContain('hold_still')
    expect(states).toContain('countdown')
    expect(states.at(-1)).toBe('capturing') // waits for re-arm, no second photo
  })

  it('real movement cancels the ring and never captures', () => {
    const m = machine()
    const clock = { now: 0 }
    const { fires, states } = run(m, clock, 3000, (t) => frame({ shift: Math.floor(t / 100) * 5 }))
    expect(fires).toHaveLength(0)
    expect(states.every((s) => s === 'looking')).toBe(true)
  })

  it('no permanent give-up: after 3 aborted rings it shows a hint but still captures', () => {
    const m = machine()
    const clock = { now: 0 }
    let last
    for (let abort = 0; abort < 3; abort++) {
      run(m, clock, 1500, () => frame()) // steady → ring starts
      last = m.step({ now: (clock.now += 100), ...sig(frame({ scene: 2 })) }) // bump: big change
    }
    expect(last.abortCount).toBe(3)
    expect(last.showHint).toBe(true)

    const { fires } = run(m, clock, 3000, () => frame({ scene: 3 }))
    expect(fires).toHaveLength(1)
  })

  it('same scene is blocked only for 3 s after a capture; a cleared reference captures at once', () => {
    const m = machine()
    const clock = { now: 0 }
    expect(run(m, clock, 2500, () => frame()).fires).toHaveLength(1)

    // Re-armed (request finished) but the very same basket is still there
    m.rearm(clock.now)
    const blocked = run(m, clock, 1500, () => frame())
    expect(blocked.fires).toHaveLength(0)
    expect(blocked.states).toContain('unchanged')

    // …after the 3 s window it's allowed again
    expect(run(m, clock, 3000, () => frame()).fires).toHaveLength(1)

    // Review closed / Scan again: a new basket on the same counter (very similar) captures at once
    m.rearm(clock.now, { delayMs: 0, clearReference: true })
    expect(run(m, clock, 2500, () => frame({ noise: 3 })).fires).toHaveLength(1)
  })

  it('an empty-result re-arm waits its delay (2 s) before capturing', () => {
    const m = machine()
    const clock = { now: 0 }
    run(m, clock, 2500, () => frame())
    m.rearm(clock.now, { delayMs: AUTO_CAPTURE.EMPTY_REARM_MS, clearReference: true })
    const early = run(m, clock, 1900, () => frame({ scene: 1 }))
    expect(early.fires).toHaveLength(0)
    expect(early.states).toContain('cooldown')
    expect(run(m, clock, 2500, () => frame({ scene: 1 })).fires).toHaveLength(1)
  })

  it('pitch-black frames never capture', () => {
    const m = machine()
    const { fires, states } = run(m, { now: 0 }, 3000, () => frame({ value: 10 }))
    expect(fires).toHaveLength(0)
    expect(states.every((s) => s === 'dark')).toBe(true)
  })
})

describe('S2: useAutoCapture hook', () => {
  let nextFrame

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    seed = 11
    nextFrame = () => frame({ noise: 10 })
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: nextFrame() })),
    }))
    window.requestAnimationFrame = vi.fn((cb) => setTimeout(() => cb(Date.now()), 50))
    window.cancelAnimationFrame = vi.fn((id) => clearTimeout(id))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const video = { current: { readyState: 4, paused: false, ended: false } }

  it('captures once on a steady hand-held scene, then re-arms after processing finishes', () => {
    const onTrigger = vi.fn()
    let renders = 0
    const { rerender } = renderHook(
      ({ busy }) => {
        renders++
        return useAutoCapture({ videoRef: video, enabled: true, onTriggerCapture: onTrigger, isProcessing: busy })
      },
      { initialProps: { busy: false } },
    )

    act(() => vi.advanceTimersByTime(3000))
    expect(onTrigger).toHaveBeenCalledTimes(1)
    expect(onTrigger).toHaveBeenCalledWith('auto')
    // ~30 sampled frames, but state only changes a handful of times (not 10 renders/s)
    expect(renders).toBeLessThan(25)

    // Analyzing… then done (or failed): ready again; a new basket captures
    rerender({ busy: true })
    act(() => vi.advanceTimersByTime(500))
    rerender({ busy: false })
    nextFrame = () => frame({ noise: 10, scene: 2 })
    act(() => vi.advanceTimersByTime(4500))
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })

  it('a rearmKey change (review closed) captures the same counter again', () => {
    const onTrigger = vi.fn()
    const { rerender } = renderHook(
      ({ key }) => useAutoCapture({ videoRef: video, enabled: true, onTriggerCapture: onTrigger, rearmKey: key }),
      { initialProps: { key: 0 } },
    )
    act(() => vi.advanceTimersByTime(3000))
    expect(onTrigger).toHaveBeenCalledTimes(1)

    rerender({ key: 1 })
    act(() => vi.advanceTimersByTime(3000))
    expect(onTrigger).toHaveBeenCalledTimes(2)
  })

  it('paused (phone waiting for the cashier) never captures', () => {
    const onTrigger = vi.fn()
    const { result } = renderHook(() =>
      useAutoCapture({ videoRef: video, enabled: true, onTriggerCapture: onTrigger, paused: true }),
    )
    act(() => vi.advanceTimersByTime(4000))
    expect(onTrigger).not.toHaveBeenCalled()
    expect(result.current.state).toBe('paused')
  })

  it('manual capture fires immediately; the ON/OFF chip persists per mode', () => {
    const onTrigger = vi.fn()
    const { result } = renderHook(() =>
      useAutoCapture({ videoRef: { current: null }, enabled: true, mode: 'products', onTriggerCapture: onTrigger }),
    )
    act(() => result.current.manualTrigger())
    expect(onTrigger).toHaveBeenCalledWith('manual')
    expect(result.current.state).toBe('capturing')

    act(() => result.current.toggleAuto())
    expect(result.current.isAutoEnabled).toBe(false)
    expect(localStorage.getItem('tindatrack:auto_capture_enabled:products')).toBe('false')
    expect(result.current.state).toBe('off')
  })
})
