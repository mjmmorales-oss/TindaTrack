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

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const lastScanTimeRef = useRef(0)
  const lastScannedCodeRef = useRef('')
  const animFrameIdRef = useRef(null)

  // Stop camera tracks helper
  const stopStream = useCallback(() => {
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
      setError('Kailangan ng HTTPS para gumana ang camera. Gamitin ang deployed link o npm run dev:lan.')
      return
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      setError('Hindi suportado ng browser na ito ang pag-access sa camera.')
      return
    }

    let isMounted = true
    setStatus('starting')
    setError(null)

    async function initCamera() {
      try {
        const detector = await createBarcodeDetector()
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

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play()
        }

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          const caps = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {}
          setTorchSupported(Boolean(caps?.torch))
        }

        setStatus('scanning')
      } catch (err) {
        if (!isMounted) return
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatus('denied')
          setError('Hindi pinahintulutan ang camera access. Pakibuksan ang camera permissions sa settings.')
        } else {
          setStatus('error')
          setError(err.message || 'Hindi mabuksan ang camera.')
        }
      }
    }

    initCamera()

    return () => {
      isMounted = false
      stopStream()
    }
  }, [enabled, facingMode, stopStream])

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
    stop: stopStream,
  }
}
