import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  RefreshCw,
  Upload,
  Zap,
  ZapOff,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { captureFrame, prepareForAi } from '@/lib/imagePrep'

/**
 * Reusable AI Camera Capture Component.
 * Features live viewfinder, grid overlay, shutter button, file upload fallback,
 * switch camera, torch toggle, analyzing progress indicator, and mock demo badge.
 *
 * @param {object} props
 * @param {(blob: Blob) => void} props.onCapture - Callback when photo is captured/selected
 * @param {boolean} [props.isAnalyzing=false] - Whether image is currently being processed
 * @param {string} [props.analyzingStep] - Custom step text during analysis
 * @param {() => void} [props.onCancel] - Callback to cancel capture
 * @param {string} [props.title] - Viewfinder header title
 * @param {string} [props.hint] - Instruction hint below viewfinder
 */
export function AiCapture({
  onCapture,
  isAnalyzing = false,
  analyzingStep,
  onCancel,
  title,
  hint,
}) {
  const { t } = useTranslation(['pos', 'common'])
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraStatus, setCameraStatus] = useState('starting') // 'starting' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [hasTorch, setHasTorch] = useState(false)
  const [isTorchOn, setIsTorchOn] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)

  const isMockMode =
    import.meta.env.MODE === 'test' ||
    import.meta.env.VITE_DATA_SOURCE === 'mock'

  // Stop current camera stream
  const stopStream = useCallback(() => {
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
    setHasTorch(false)
  }, [])

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopStream()
    setCameraStatus('starting')
    setErrorMessage(null)

    if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setCameraStatus('error')
      setErrorMessage(t('pos:aiCameraNotSupported', 'Camera access is not supported on this browser.'))
      return
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {})
          setCameraStatus('ready')
        }
      }

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack?.getCapabilities) {
        const capabilities = videoTrack.getCapabilities()
        setHasTorch(Boolean(capabilities.torch))
      }
    } catch (err) {
      setCameraStatus('error')
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(t('pos:aiCameraPermissionDenied', 'Camera permission was denied. Please allow camera access or upload an image.'))
      } else {
        setErrorMessage(err.message || t('pos:aiCameraError', 'Unable to start camera preview.'))
      }
    }
  }, [facingMode, stopStream, t])

  useEffect(() => {
    startCamera()
    return () => {
      stopStream()
    }
  }, [startCamera, stopStream])

  // Toggle torch/flash
  const toggleTorch = async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0]
    if (!videoTrack || !hasTorch) return

    try {
      const nextState = !isTorchOn
      await videoTrack.applyConstraints({
        advanced: [{ torch: nextState }],
      })
      setIsTorchOn(nextState)
    } catch {
      // Ignore unsupported torch operations
    }
  }

  // Toggle facing mode (front/back)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  // Handle capture button click
  const handleShutter = async () => {
    if (isCapturing || isAnalyzing || cameraStatus !== 'ready') return
    setIsCapturing(true)
    try {
      if (videoRef.current) {
        const blob = await captureFrame(videoRef.current, {
          mimeType: 'image/jpeg',
          quality: 0.9,
          maxWidth: 1600,
          maxHeight: 1600,
        })
        onCapture?.(blob)
      }
    } catch (err) {
      console.error('Frame capture failed:', err)
    } finally {
      setIsCapturing(false)
    }
  }

  // Handle file input upload
  const handleFileChange = async (e) => {
    const file = e.target?.files?.[0]
    if (!file) return

    try {
      const prep = await prepareForAi(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        maxBytes: 4 * 1024 * 1024,
      })
      onCapture?.(prep.blob)
    } catch (err) {
      console.error('Image prep failed:', err)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="relative flex flex-col items-center w-full max-w-lg mx-auto overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-2xl">
      {/* Top Header Toolbar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 text-primary border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <span className="text-sm font-semibold tracking-wide">
            {title || t('pos:aiScanTitle', 'AI Basket Scan')}
          </span>
          {isMockMode && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Demo AI
            </span>
          )}
        </div>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            onClick={onCancel}
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Main Viewfinder Frame */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[1/1] max-h-[65vh] bg-black flex items-center justify-center overflow-hidden">
        {/* Live Camera Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraStatus === 'ready' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Framing Grid Overlay (Rule of Thirds) */}
        {cameraStatus === 'ready' && !isAnalyzing && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 p-4">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div />

            {/* Corner Targeting Guides */}
            <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
            <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
            <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
            <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
          </div>
        )}

        {/* Loading Spinner during camera start */}
        {cameraStatus === 'starting' && !isAnalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900 text-white/80 p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              {t('pos:aiStartingCamera', 'Starting camera preview...')}
            </p>
          </div>
        )}

        {/* Error / Fallback View */}
        {cameraStatus === 'error' && !isAnalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900/95 text-white/90 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm max-w-xs">{errorMessage}</p>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                onClick={startCamera}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                {t('common:retry', 'Retry')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                {t('pos:aiUploadPhoto', 'Upload Photo')}
              </Button>
            </div>
          </div>
        )}

        {/* AI Analyzing Backdrop Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-md text-white p-6 text-center animate-in fade-in duration-200">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-primary animate-bounce" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-base tracking-wide">
                {t('pos:aiAnalyzingTitle', 'Analyzing Basket...')}
              </h4>
              <p className="text-xs text-white/70 max-w-xs">
                {analyzingStep ||
                  t('pos:aiAnalyzingDesc', 'Gemini AI is identifying items, quantities, and matching prices...')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Viewfinder Hint */}
      <div className="py-2 px-4 text-center text-xs text-white/60">
        {hint ||
          t('pos:aiCaptureHint', 'Frame all sari-sari items clearly inside the viewfinder, then tap Capture.')}
      </div>

      {/* Bottom Shutter Controls */}
      <div className="w-full flex items-center justify-around px-6 py-4 bg-neutral-900 border-t border-white/10">
        {/* Upload from Gallery Button */}
        <div className="flex flex-col items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-11 h-11 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            disabled={isAnalyzing}
            onClick={() => fileInputRef.current?.click()}
            title={t('pos:aiUploadPhoto', 'Upload Photo')}
            aria-label="Upload photo from device"
          >
            <Upload className="w-5 h-5" />
          </Button>
          <span className="text-[10px] text-white/50 mt-1">{t('common:upload', 'Upload')}</span>
        </div>

        {/* Main Circular Shutter Button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            disabled={cameraStatus !== 'ready' || isAnalyzing || isCapturing}
            onClick={handleShutter}
            className="group relative flex items-center justify-center w-18 h-18 rounded-full border-4 border-white/80 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-primary"
            aria-label="Capture photo for AI basket scan"
          >
            <div className="w-14 h-14 rounded-full bg-white group-hover:bg-primary transition-colors flex items-center justify-center">
              <Camera className="w-6 h-6 text-neutral-900 group-hover:text-white transition-colors" />
            </div>
          </button>
          <span className="text-[10px] text-white/70 font-medium mt-1">
            {t('pos:aiCaptureBtn', 'Capture')}
          </span>
        </div>

        {/* Camera Tools (Torch / Flip) */}
        <div className="flex flex-col items-center gap-1">
          {hasTorch ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-11 h-11 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              disabled={isAnalyzing || cameraStatus !== 'ready'}
              onClick={toggleTorch}
              aria-label={isTorchOn ? 'Turn off flash' : 'Turn on flash'}
            >
              {isTorchOn ? <Zap className="w-5 h-5 text-amber-400" /> : <ZapOff className="w-5 h-5" />}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-11 h-11 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              disabled={isAnalyzing || cameraStatus !== 'ready'}
              onClick={toggleFacingMode}
              aria-label="Switch camera"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          )}
          <span className="text-[10px] text-white/50">{hasTorch ? 'Flash' : 'Flip'}</span>
        </div>
      </div>
    </div>
  )
}

export default AiCapture
