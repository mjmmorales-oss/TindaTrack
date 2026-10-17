import { useState, useRef, useEffect, useCallback } from 'react'
import {
  AUTO_CAPTURE,
  getAutoCaptureProfile,
} from '@/config/ai.js'

/**
 * Reusable auto-capture engine hook for camera viewfinders (AI Basket, AI Stock-In, Phone Scanner).
 * Performs lightweight 10-fps motion detection using an offscreen 64x48 canvas,
 * waits for camera steady state, runs a visual countdown, checks scene difference,
 * and triggers capture.
 *
 * @param {object} params
 * @param {import('react').RefObject<HTMLVideoElement>} params.videoRef - Reference to the HTML5 video element
 * @param {boolean} [params.enabled=true] - Master enable toggle from parent
 * @param {(mode: 'auto'|'manual') => void} params.onTriggerCapture - Callback when photo capture should occur
 * @param {boolean} [params.isProcessing=false] - Whether scan analysis is currently in progress
 * @param {'low'|'medium'|'high'} [params.sensitivity='medium'] - Motion sensitivity profile
 * @param {'basket'|'products'} [params.mode='basket'] - AI workflow mode for storage persistence
 * @param {number|null} [params.rateLimitBackoffUntil=null] - Timestamp until which rate limit backoff applies
 */
export function useAutoCapture({
  videoRef,
  enabled = true,
  onTriggerCapture,
  isProcessing = false,
  sensitivity = 'medium',
  mode = 'basket',
  rateLimitBackoffUntil = null,
}) {
  const storageKey = mode === 'stockin' || mode === 'products'
    ? 'tt.autoCapture.stockin'
    : 'tt.autoCapture.basket'

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

  const [state, setState] = useState('off') // 'off'|'watching'|'steady'|'countdown'|'capturing'|'paused'|'cooldown'
  const [countdownRemaining, setCountdownRemaining] = useState(0)
  const [lastCaptureMode, setLastCaptureMode] = useState('auto')
  const [motionScore, setMotionScore] = useState(0)
  const [isSceneTooDark, setIsSceneTooDark] = useState(false)
  const [isSceneUnchanged, setIsSceneUnchanged] = useState(false)
  const [abortCount, setAbortCount] = useState(0)

  // Offscreen canvas ref for sampling
  const canvasRef = useRef(null)
  const prevFrameLumaRef = useRef(null)
  const lastCapturedLumaRef = useRef(null)

  // Timing refs
  const steadyStartTimeRef = useRef(null)
  const countdownStartTimeRef = useRef(null)
  const cooldownEndTimeRef = useRef(0)
  const lastSampleTimeRef = useRef(0)
  const animationFrameIdRef = useRef(null)
  const isDocHiddenRef = useRef(false)

  // Toggle user preference and save
  const toggleAuto = useCallback(() => {
    setIsAutoEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [storageKey])

  // Manual trigger bypasses countdown and fires immediately
  const manualTrigger = useCallback(() => {
    steadyStartTimeRef.current = null
    countdownStartTimeRef.current = null
    cooldownEndTimeRef.current = Date.now() + AUTO_CAPTURE.AUTO_COOLDOWN_MS
    setCountdownRemaining(0)
    setLastCaptureMode('manual')
    setState('capturing')

    if (prevFrameLumaRef.current) {
      lastCapturedLumaRef.current = new Uint8Array(prevFrameLumaRef.current)
    }

    onTriggerCapture?.('manual')
  }, [onTriggerCapture])

  // Track document visibility to pause loop
  useEffect(() => {
    const handleVisibilityChange = () => {
      isDocHiddenRef.current = document.visibilityState === 'hidden'
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Core motion detection & auto-capture loop
  useEffect(() => {
    if (!enabled || !isAutoEnabled) {
      setState('off')
      setCountdownRemaining(0)
      return
    }

    const { motionThreshold, steadyDurationMs } = getAutoCaptureProfile(sensitivity)

    // Ensure offscreen canvas exists
    if (!canvasRef.current && typeof document !== 'undefined') {
      const c = document.createElement('canvas')
      c.width = AUTO_CAPTURE.SAMPLE_WIDTH
      c.height = AUTO_CAPTURE.SAMPLE_HEIGHT
      canvasRef.current = c
    }

    let running = true

    const loop = (timestamp) => {
      if (!running) return

      const now = Date.now()

      // Check external pause conditions
      const isRateLimited = rateLimitBackoffUntil && now < rateLimitBackoffUntil
      if (isProcessing || isDocHiddenRef.current || isRateLimited) {
        setState('paused')
        steadyStartTimeRef.current = null
        countdownStartTimeRef.current = null
        setCountdownRemaining(0)
        animationFrameIdRef.current = requestAnimationFrame(loop)
        return
      }

      // Check cooldown condition
      if (now < cooldownEndTimeRef.current) {
        setState('cooldown')
        steadyStartTimeRef.current = null
        countdownStartTimeRef.current = null
        setCountdownRemaining(0)
        animationFrameIdRef.current = requestAnimationFrame(loop)
        return
      }

      const video = videoRef?.current
      // Video must be ready and playing
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        animationFrameIdRef.current = requestAnimationFrame(loop)
        return
      }

      // Throttle sampling to ~10 fps (every 100ms)
      if (timestamp - lastSampleTimeRef.current < 100) {
        animationFrameIdRef.current = requestAnimationFrame(loop)
        return
      }
      lastSampleTimeRef.current = timestamp

      const canvas = canvasRef.current
      if (!canvas) {
        animationFrameIdRef.current = requestAnimationFrame(loop)
        return
      }

      try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          animationFrameIdRef.current = requestAnimationFrame(loop)
          return
        }

        ctx.drawImage(video, 0, 0, AUTO_CAPTURE.SAMPLE_WIDTH, AUTO_CAPTURE.SAMPLE_HEIGHT)
        const frameData = ctx.getImageData(0, 0, AUTO_CAPTURE.SAMPLE_WIDTH, AUTO_CAPTURE.SAMPLE_HEIGHT).data
        const totalPixels = AUTO_CAPTURE.SAMPLE_WIDTH * AUTO_CAPTURE.SAMPLE_HEIGHT

        // Compute luminance array and average luminance
        const currentLuma = new Uint8Array(totalPixels)
        let totalLuma = 0
        for (let i = 0; i < totalPixels; i++) {
          const r = frameData[i * 4]
          const g = frameData[i * 4 + 1]
          const b = frameData[i * 4 + 2]
          // Standard ITU-R BT.601 luminance
          const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
          currentLuma[i] = luma
          totalLuma += luma
        }

        const avgLuma = totalLuma / totalPixels
        const tooDark = avgLuma < AUTO_CAPTURE.MIN_LUMINANCE
        setIsSceneTooDark(tooDark)

        if (tooDark) {
          // Reject pitch-black scene
          steadyStartTimeRef.current = null
          countdownStartTimeRef.current = null
          setCountdownRemaining(0)
          setState('watching')
          prevFrameLumaRef.current = currentLuma
          animationFrameIdRef.current = requestAnimationFrame(loop)
          return
        }

        // Compare against previous frame for motion calculation
        let diffPixels = 0
        const prevLuma = prevFrameLumaRef.current
        if (prevLuma && prevLuma.length === totalPixels) {
          for (let i = 0; i < totalPixels; i++) {
            if (Math.abs(currentLuma[i] - prevLuma[i]) > 20) {
              diffPixels++
            }
          }
        }
        prevFrameLumaRef.current = currentLuma

        const motionPercent = Number(((diffPixels / totalPixels) * 100).toFixed(1))
        setMotionScore(motionPercent)

        // Compare against last captured frame (scene duplicate guard)
        let sceneDiffPercent = 100
        const lastCapturedLuma = lastCapturedLumaRef.current
        if (lastCapturedLuma && lastCapturedLuma.length === totalPixels) {
          let sceneDiffCount = 0
          for (let i = 0; i < totalPixels; i++) {
            if (Math.abs(currentLuma[i] - lastCapturedLuma[i]) > 25) {
              sceneDiffCount++
            }
          }
          sceneDiffPercent = (sceneDiffCount / totalPixels) * 100
        }

        const unchanged = sceneDiffPercent < AUTO_CAPTURE.SCENE_DIFFERENCE_THRESHOLD
        setIsSceneUnchanged(unchanged)

        const isMoving = motionPercent > motionThreshold

        if (unchanged) {
          // Current scene is the same as already captured scene; wait for user to change item/basket
          steadyStartTimeRef.current = null
          countdownStartTimeRef.current = null
          setCountdownRemaining(0)
          setState('watching')
          animationFrameIdRef.current = requestAnimationFrame(loop)
          return
        }

        if (isMoving) {
          // If motion spikes during countdown, abort countdown and count abort
          if (countdownStartTimeRef.current) {
            countdownStartTimeRef.current = null
            setCountdownRemaining(0)
            setAbortCount((prev) => prev + 1)
          }
          steadyStartTimeRef.current = null
          setState('watching')
          animationFrameIdRef.current = requestAnimationFrame(loop)
          return
        }

        // Scene is steady and changed!
        if (!steadyStartTimeRef.current) {
          steadyStartTimeRef.current = now
          setState('watching')
        } else if (now - steadyStartTimeRef.current < steadyDurationMs) {
          setState('steady')
        } else {
          // Camera has remained steady long enough -> Start or advance countdown
          if (!countdownStartTimeRef.current) {
            countdownStartTimeRef.current = now
            setState('countdown')
            setCountdownRemaining(Number((AUTO_CAPTURE.COUNTDOWN_MS / 1000).toFixed(1)))
          } else {
            const elapsed = now - countdownStartTimeRef.current
            const remainingMs = Math.max(0, AUTO_CAPTURE.COUNTDOWN_MS - elapsed)
            const remainingSec = Number((remainingMs / 1000).toFixed(1))
            setCountdownRemaining(remainingSec)

            if (remainingMs <= 0) {
              // Countdown complete -> Fire auto-capture!
              running = false
              setState('capturing')
              setLastCaptureMode('auto')
              lastCapturedLumaRef.current = new Uint8Array(currentLuma)
              cooldownEndTimeRef.current = now + AUTO_CAPTURE.AUTO_COOLDOWN_MS
              steadyStartTimeRef.current = null
              countdownStartTimeRef.current = null
              setCountdownRemaining(0)

              onTriggerCapture?.('auto')
              return
            } else {
              setState('countdown')
            }
          }
        }
      } catch {
        // Fallback gracefully on canvas errors
      }

      animationFrameIdRef.current = requestAnimationFrame(loop)
    }

    animationFrameIdRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current)
      }
    }
  }, [
    enabled,
    isAutoEnabled,
    isProcessing,
    sensitivity,
    rateLimitBackoffUntil,
    videoRef,
    onTriggerCapture,
  ])

  return {
    state,
    countdownRemaining,
    lastCaptureMode,
    motionScore,
    isSceneTooDark,
    isSceneUnchanged,
    manualTrigger,
    toggleAuto,
    isAutoEnabled,
    abortCount,
  }
}

export default useAutoCapture
