import { useState, useRef, useEffect, useCallback } from 'react'
import { AUTO_CAPTURE, getAutoCaptureProfile } from '@/config/ai.js'
import { createAutoCaptureMachine, frameSignatureFromRgba } from '@/lib/motion'

function safeRequestAnimationFrame(cb) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(cb)
  }
  return setTimeout(() => cb(Date.now()), 50)
}

function safeCancelAnimationFrame(id) {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id)
  } else {
    clearTimeout(id)
  }
}

/**
 * Auto-capture engine for camera viewfinders (AI Basket, AI Stock-In, phone).
 *
 * Samples the video at ~10 fps into a 64×48 canvas, scores motion with a
 * shake-tolerant measure (lib/motion.js) and drives a state machine:
 * looking → hold_still → countdown (ring) → capturing → (re-arm) …
 *
 * Re-arms by itself when processing finishes (success or error) and whenever
 * `rearmKey` changes (review closed, Scan again, phone basket done, empty result).
 * React state is only updated when what is shown changes, not on every frame.
 *
 * @param {object} params
 * @param {import('react').RefObject<HTMLVideoElement>} params.videoRef
 * @param {boolean} [params.enabled=true] - Camera ready and auto-capture allowed by the parent
 * @param {(mode: 'auto'|'manual') => void} params.onTriggerCapture
 * @param {boolean} [params.isProcessing=false] - A photo is being analyzed
 * @param {'low'|'medium'|'normal'|'high'} [params.sensitivity='medium']
 * @param {'basket'|'products'|'stockin'} [params.mode='basket'] - Preference storage key
 * @param {number|null} [params.rateLimitBackoffUntil=null]
 * @param {number} [params.rearmKey=0] - Change to re-arm (and forget the last photo)
 * @param {number} [params.rearmDelayMs] - Wait before re-arming on a rearmKey change
 * @param {boolean} [params.paused=false] - Parent pause (e.g. phone waiting for the cashier)
 */
export function useAutoCapture({
  videoRef,
  enabled = true,
  onTriggerCapture,
  isProcessing = false,
  sensitivity = 'medium',
  mode = 'basket',
  rateLimitBackoffUntil = null,
  rearmKey = 0,
  rearmDelayMs = 0,
  paused = false,
}) {
  const storageKey = mode === 'stockin' || mode === 'products' ? 'tt.autoCapture.stockin' : 'tt.autoCapture.basket'

  const [isAutoEnabled, setIsAutoEnabled] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey) ?? localStorage.getItem(`tindatrack:auto_capture_enabled:${mode}`)
        if (stored !== null) return stored === 'true'
      } catch {
        // Fallback default
      }
    }
    return enabled !== false
  })

  // What the overlay shows. Updated only when it changes.
  const [view, setView] = useState({ state: 'off', ringProgress: 0, showHint: false, abortCount: 0 })
  const [lastCaptureMode, setLastCaptureMode] = useState('auto')

  const machineRef = useRef(null)
  const canvasRef = useRef(null)
  const lastSampleRef = useRef(0)
  const rafRef = useRef(null)
  const viewRef = useRef(view)
  const onTriggerRef = useRef(onTriggerCapture)
  const pauseRef = useRef({ isProcessing, paused, rateLimitBackoffUntil })

  useEffect(() => {
    onTriggerRef.current = onTriggerCapture
  }, [onTriggerCapture])
  useEffect(() => {
    pauseRef.current = { isProcessing, paused, rateLimitBackoffUntil }
  }, [isProcessing, paused, rateLimitBackoffUntil])

  const { motionThreshold, steadyDurationMs } = getAutoCaptureProfile(sensitivity)

  const publish = useCallback((next) => {
    const cur = viewRef.current
    // ring progress in 10 % steps is plenty for a smooth fill
    const ring = Math.round((next.ringProgress || 0) * 10) / 10
    if (cur.state === next.state && cur.ringProgress === ring && cur.showHint === next.showHint && cur.abortCount === next.abortCount) {
      return
    }
    const v = { state: next.state, ringProgress: ring, showHint: next.showHint, abortCount: next.abortCount }
    viewRef.current = v
    setView(v)
  }, [])

  // (Re)build the machine when the tuning changes
  useEffect(() => {
    machineRef.current = createAutoCaptureMachine({
      motionThreshold,
      steadyMs: steadyDurationMs,
      countdownMs: AUTO_CAPTURE.COUNTDOWN_MS,
      sceneGuardMs: AUTO_CAPTURE.SCENE_GUARD_MS,
      sceneGuardThreshold: AUTO_CAPTURE.SCENE_GUARD_THRESHOLD,
      minLuminance: AUTO_CAPTURE.MIN_LUMINANCE,
      cooldownMs: AUTO_CAPTURE.AUTO_COOLDOWN_MS,
      abortHintCount: AUTO_CAPTURE.ABORT_HINT_COUNT,
    })
  }, [motionThreshold, steadyDurationMs])

  // Processing finished (success, error or cancel): ready for the next basket
  const wasProcessingRef = useRef(isProcessing)
  useEffect(() => {
    if (wasProcessingRef.current && !isProcessing) {
      machineRef.current?.rearm(Date.now())
    }
    wasProcessingRef.current = isProcessing
  }, [isProcessing])

  // Explicit re-arm from the parent: forget the last photo so a new basket always captures
  const firstRearmRef = useRef(true)
  useEffect(() => {
    if (firstRearmRef.current) {
      firstRearmRef.current = false
      return
    }
    machineRef.current?.rearm(Date.now(), { delayMs: rearmDelayMs, clearReference: true })
  }, [rearmKey, rearmDelayMs])

  const toggleAuto = useCallback(() => {
    setIsAutoEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, String(next))
        localStorage.setItem(`tindatrack:auto_capture_enabled:${mode}`, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [storageKey, mode])

  const manualTrigger = useCallback(() => {
    machineRef.current?.markCaptured(Date.now())
    setLastCaptureMode('manual')
    publish({ state: 'capturing', ringProgress: 0, showHint: false, abortCount: 0 })
    onTriggerRef.current?.('manual')
  }, [publish])

  // Sampling loop (~10 fps)
  useEffect(() => {
    if (!enabled || !isAutoEnabled) {
      publish({ state: 'off', ringProgress: 0, showHint: false, abortCount: 0 })
      return undefined
    }

    if (!canvasRef.current && typeof document !== 'undefined') {
      const c = document.createElement('canvas')
      c.width = AUTO_CAPTURE.SAMPLE_WIDTH
      c.height = AUTO_CAPTURE.SAMPLE_HEIGHT
      canvasRef.current = c
    }

    let running = true
    const loop = (timestamp) => {
      if (!running) return
      rafRef.current = safeRequestAnimationFrame(loop)

      const { isProcessing: busy, paused: held, rateLimitBackoffUntil: backoff } = pauseRef.current
      const now = Date.now()
      if (busy) {
        publish({ ...viewRef.current, state: 'analyzing', ringProgress: 0 })
        return
      }
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (held || hidden || (backoff && now < backoff)) {
        publish({ ...viewRef.current, state: 'paused', ringProgress: 0 })
        return
      }

      if (timestamp - lastSampleRef.current < AUTO_CAPTURE.SAMPLE_INTERVAL_MS) return
      lastSampleRef.current = timestamp

      const video = videoRef?.current
      const canvas = canvasRef.current
      if (!video || video.readyState < 2 || video.paused || video.ended || !canvas) return

      try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(video, 0, 0, AUTO_CAPTURE.SAMPLE_WIDTH, AUTO_CAPTURE.SAMPLE_HEIGHT)
        const { data } = ctx.getImageData(0, 0, AUTO_CAPTURE.SAMPLE_WIDTH, AUTO_CAPTURE.SAMPLE_HEIGHT)
        const frame = frameSignatureFromRgba(data, AUTO_CAPTURE.SAMPLE_WIDTH, AUTO_CAPTURE.SAMPLE_HEIGHT)

        const result = machineRef.current.step({ now, ...frame })
        publish(result)
        if (result.fire) {
          setLastCaptureMode('auto')
          onTriggerRef.current?.('auto')
        }
      } catch {
        // canvas errors: try again next frame
      }
    }

    rafRef.current = safeRequestAnimationFrame(loop)
    return () => {
      running = false
      if (rafRef.current) safeCancelAnimationFrame(rafRef.current)
    }
  }, [enabled, isAutoEnabled, videoRef, publish])

  return {
    state: view.state,
    ringProgress: view.ringProgress,
    showHint: view.showHint,
    abortCount: view.abortCount,
    // compatibility with the v2.1 overlay
    countdownRemaining: view.state === 'countdown' ? Number(((1 - view.ringProgress) * AUTO_CAPTURE.COUNTDOWN_MS / 1000).toFixed(1)) : 0,
    isSceneTooDark: view.state === 'dark',
    isSceneUnchanged: view.state === 'unchanged',
    lastCaptureMode,
    manualTrigger,
    toggleAuto,
    isAutoEnabled,
  }
}

export default useAutoCapture
