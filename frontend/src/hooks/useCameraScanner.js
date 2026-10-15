import { useState, useRef, useEffect, useCallback } from 'react'
import { createBarcodeDetector } from '@/lib/detector'

/**
 * Hook for managing camera stream and real-time barcode scanning.
 *
 * @param {object} options
 * @param {(code: string) => void} options.onDetected - Callback when a barcode is detected
 * @param {boolean} [options.paused=false] - Temporarily pause detection without stopping camera
 * @param {boolean} [options.enabled=true] - Whether camera should be active
 * @param {number} [options.dedupeWindowMs=1500] - Window during which duplicate reads of the same barcode are ignored
 * @returns {object}
 */
export function useCameraScanner({
  onDetected,
  paused = false,
  enabled = true,
  dedupeWindowMs = 1500,
} = {}) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [torchSupported, setTorchSupported] = useState(false)
  const [isTorchOn, setIsTorchOn] = useState(false)
  const [retryTrigger, setRetryTrigger] = useState(0)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const lastScanTimeRef = useRef(0)
  const lastScannedCodeRef = useRef('')
  const animFrameIdRef = useRef(null)
  const startTimeoutRef = useRef(null)

  // Retry function to re-attempt camera initialization
  const retry = useCallback(() => {
    setStatus('starting')
    setError(null)
    setRetryTrigger((prev) => prev + 1)
  }, [])

  // Stop camera tracks helper
  const stopStream = useCallback(() => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current)
      startTimeoutRef.current = null
    }

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current)
      animFrameIdRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore
        }
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsTorchOn(false)
    setTorchSupported(false)
  }, [])

  // Start camera and initialize detector
  useEffect(() => {
    if (!enabled) {
      stopStream()
      setStatus('idle')
      return
    }

    // Security context check (camera requires HTTPS or localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('insecure')
      setError('Camera requires HTTPS or localhost. Please use a secure connection.')
      return
    }

    if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      setError('Camera is not supported on this device or browser.')
      return
    }

    let isMounted = true
    setStatus('starting')
    setError(null)

    // 8-second camera start timeout
    startTimeoutRef.current = setTimeout(() => {
      if (!isMounted) return
      setStatus((cur) => {
        if (cur === 'starting') {
          stopStream()
          setError("Camera didn't start. Please check camera permissions or try again.")
          return 'error'
        }
        return cur
      })
    }, 8000)

    async function initCamera() {
      try {
        let detector
        try {
          // Wrap detector creation with a 6-second timeout
          detector = await Promise.race([
            createBarcodeDetector(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('wasm failed to load')), 6000),
            ),
          ])
        } catch (detectorErr) {
          throw new Error(detectorErr?.message || 'wasm failed to load')
        }

        if (!isMounted) return
        detectorRef.current = detector

        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        }

        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        } catch (mediaErr) {
          throw mediaErr
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          try {
            await videoRef.current.play()
          } catch {
            // Some browsers require user interaction; proceed if video element is ready
          }
        }

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          const caps =
            typeof videoTrack.getCapabilities === 'function'
              ? videoTrack.getCapabilities()
              : {}
          setTorchSupported(Boolean(caps?.torch))
        }

        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current)
          startTimeoutRef.current = null
        }

        if (isMounted) {
          setStatus('scanning')
        }
      } catch (err) {
        if (!isMounted) return
        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current)
          startTimeoutRef.current = null
        }

        if (
          err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.message?.includes('permission denied')
        ) {
          setStatus('denied')
          setError('Camera permission was denied. Please allow camera access in browser settings.')
        } else if (err.message?.includes('wasm failed to load')) {
          setStatus('error')
          setError('Barcode detector (WASM) failed to load.')
        } else if (
          err.name === 'NotFoundError' ||
          err.name === 'DevicesNotFoundError'
        ) {
          setStatus('unsupported')
          setError('No camera detected on this device.')
        } else {
          setStatus('error')
          setError(err.message || "Camera didn't start.")
        }
      }
    }

    initCamera()

    return () => {
      isMounted = false
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current)
        startTimeoutRef.current = null
      }
      stopStream()
    }
  }, [enabled, facingMode, retryTrigger, stopStream])

  // Continuous frame scanning loop (~200ms throttle)
  useEffect(() => {
    if (status !== 'scanning' || paused) {
      return
    }

    let isScanning = true

    const scanLoop = async () => {
      if (!isScanning) return

      const now = Date.now()
      const video = videoRef.current

      // Pause detection when tab is hidden or video not ready
      if (
        typeof document !== 'undefined' &&
        !document.hidden &&
        video &&
        video.readyState >= 2 &&
        detectorRef.current &&
        now - lastScanTimeRef.current >= 200
      ) {
        lastScanTimeRef.current = now

        try {
          const barcodes = await detectorRef.current.detect(video)
          if (barcodes && barcodes.length > 0 && isScanning) {
            const raw = barcodes[0].rawValue || barcodes[0].displayValue
            if (raw) {
              const code = String(raw).trim()
              const isDuplicate =
                code === lastScannedCodeRef.current &&
                now - (lastScanTimeRef.current || 0) < dedupeWindowMs

              if (!isDuplicate) {
                lastScannedCodeRef.current = code
                onDetected?.(code)
              }
            }
          }
        } catch {
          // Frame detection errors are expected occasionally; ignore
        }
      }

      if (isScanning) {
        animFrameIdRef.current = requestAnimationFrame(scanLoop)
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanLoop)

    return () => {
      isScanning = false
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
    }
  }, [status, paused, onDetected, dedupeWindowMs])

  // Toggle torch / flash
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported) return

    const track = streamRef.current.getVideoTracks()[0]
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const nextState = !isTorchOn
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        })
        setIsTorchOn(nextState)
      } catch {
        // Torch constraint rejected
      }
    }
  }, [torchSupported, isTorchOn])

  // Switch camera between front and back
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }, [])

  return {
    status,
    error,
    videoRef,
    torchSupported,
    isTorchOn,
    toggleTorch,
    switchCamera,
    retry,
    stop: stopStream,
  }
}

