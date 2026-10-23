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
  Check,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { captureFrame, prepareForAi } from '@/lib/imagePrep'
import { useAutoCapture } from '@/hooks/useAutoCapture'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { notify } from '@/lib/notify'
import { AI_IMAGE_OPTIONS } from '@/config/ai'

/** Live stages of an AI scan (the service reports 'uploading' → 'reading' → 'matching'). */
const ANALYZING_STAGES = ['uploading', 'reading', 'matching']

/** Filling ring for the auto-capture countdown (no numbers). */
function CaptureRing({ progress = 0, size = 24 }) {
  const r = (size - 4) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" data-testid="capture-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

/**
 * Reusable AI Camera Capture Component with Auto-Capture engine.
 * Features live viewfinder, auto-capture countdown & steady state detection,
 * grid overlay, shutter button with countdown ring, file upload fallback,
 * switch camera, torch toggle, analyzing progress indicator, and mock demo badge.
 *
 * @param {object} props
 * @param {(blob: Blob, captureMode: 'auto'|'manual'|'upload') => void} props.onCapture - Callback when photo is captured/selected
 * @param {boolean} [props.isAnalyzing=false] - Whether image is currently being processed
 * @param {string} [props.analyzingStep] - Custom step text during analysis
 * @param {() => void} [props.onCancel] - Callback to cancel capture
 * @param {string} [props.title] - Viewfinder header title
 * @param {string} [props.hint] - Instruction hint below viewfinder
 * @param {boolean} [props.autoCaptureEnabled=true] - Whether auto-capture capability is enabled
 * @param {'basket'|'products'} [props.aiMode='basket'] - AI workflow mode for preference storage
 * @param {'low'|'medium'|'high'} [props.sensitivity] - Optional sensitivity override
 * @param {'uploading'|'reading'|'matching'} [props.analyzingStage] - Live stage while analyzing
 * @param {number} [props.rearmKey] - Change to re-arm auto-capture (review closed, empty result…)
 * @param {number} [props.rearmDelayMs] - Delay before that re-arm
 * @param {boolean} [props.autoPaused=false] - Hold auto-capture (e.g. phone waiting for the cashier)
 * @param {string} [props.autoPausedMessage] - Shown while autoPaused
 */
export function AiCapture({
  onCapture,
  isAnalyzing = false,
  analyzingStep,
  onCancel,
  title,
  hint,
  autoCaptureEnabled = true,
  aiMode = 'basket',
  sensitivity,
  analyzingStage,
  rearmKey = 0,
  rearmDelayMs = 0,
  autoPaused = false,
  autoPausedMessage,
}) {
  const { t } = useTranslation(['pos', 'common'])
  const stageLabels = {
    uploading: t('pos:aiStage_uploading'),
    reading: t('pos:aiStage_reading'),
    matching: t('pos:aiStage_matching'),
  }
  const { data: settingsRes } = useSettings()
  const storeSettings = settingsRes?.data || {}

  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraStatus, setCameraStatus] = useState('starting') // 'starting' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [hasTorch, setHasTorch] = useState(false)
  const [isTorchOn, setIsTorchOn] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  // The photo that was sent, shown dimmed behind "Analyzing…"
  const [sentPhotoUrl, setSentPhotoUrl] = useState(null)
  const [failedCaptures, setFailedCaptures] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)

  const showSentPhoto = useCallback((blob) => {
    setSentPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return blob ? URL.createObjectURL(blob) : null
    })
  }, [])
  useEffect(() => () => sentPhotoUrl && URL.revokeObjectURL(sentPhotoUrl), [sentPhotoUrl])

  // Elapsed seconds while analyzing, so a 4–6 s wait doesn't feel stuck
  useEffect(() => {
    if (!isAnalyzing) return undefined
    const startedAt = Date.now()
    setElapsedMs(0)
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 100)
    return () => clearInterval(id)
  }, [isAnalyzing])

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

  // Core capture executor
  const doCapture = useCallback(async (captureMode = 'manual') => {
    if (isCapturing || isAnalyzing || cameraStatus !== 'ready') return
    setIsCapturing(true)
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 150)

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([50, 50, 100])
      } catch {
        // ignore
      }
    }

    try {
      if (videoRef.current) {
        // captureFrame returns a canvas, not a Blob — encode it before handing it off.
        const canvas = captureFrame(videoRef.current)
        const blob = await prepareForAi(canvas, AI_IMAGE_OPTIONS)
        if (!(blob instanceof Blob)) {
          throw new Error('Captured frame could not be encoded as an image.')
        }
        showSentPhoto(blob)
        onCapture?.(blob, captureMode)
      }
    } catch {
      notify.error(t('pos:aiCaptureFailed', 'Could not take the photo. Please try again.'))
      setFailedCaptures((n) => n + 1) // re-arm auto-capture
    } finally {
      setIsCapturing(false)
    }
  }, [cameraStatus, isAnalyzing, isCapturing, onCapture, showSentPhoto, t])

  // Auto-capture hook engine
  const effectiveSensitivity =
    sensitivity || storeSettings?.auto_capture_sensitivity || 'medium'

  const auto = useAutoCapture({
    videoRef,
    enabled: autoCaptureEnabled && cameraStatus === 'ready',
    onTriggerCapture: (captureMode) => doCapture(captureMode),
    isProcessing: isAnalyzing || isCapturing,
    sensitivity: effectiveSensitivity,
    mode: aiMode,
    rearmKey: rearmKey + failedCaptures,
    rearmDelayMs,
    paused: autoPaused,
  })

  // Handle file input upload
  const handleFileChange = async (e) => {
    const file = e.target?.files?.[0]
    if (!file) return

    try {
      const blob = await prepareForAi(file, AI_IMAGE_OPTIONS)
      if (!(blob instanceof Blob)) {
        throw new Error('Uploaded photo could not be encoded as an image.')
      }
      showSentPhoto(blob)
      onCapture?.(blob, 'upload')
    } catch {
      notify.error(t('pos:aiUploadFailed', 'Could not read that photo. Try a different image.'))
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

        <div className="flex items-center gap-2">
          {/* Auto-Capture Toggle Switch */}
          {autoCaptureEnabled && (
            <button
              type="button"
              onClick={auto.toggleAuto}
              title={t('pos:aiAutoCaptureTooltip', 'Takes photo automatically when camera is steady')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
                auto.isAutoEnabled
                  ? 'bg-primary/25 text-primary border-primary/50'
                  : 'bg-white/10 text-white/60 border-white/10 hover:text-white',
              )}
            >
              <span>{t('pos:aiAutoCapture', 'Auto-Capture')}</span>
              <span
                className={cn(
                  'text-[9px] px-1 py-0.2 rounded font-bold uppercase',
                  auto.isAutoEnabled
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/20 text-white/80',
                )}
              >
                {auto.isAutoEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

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

        {/* Shutter Flash Effect */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-40 pointer-events-none animate-out fade-out duration-150" />
        )}

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

            {/* Corner Targeting Guides (change color when steady/countdown) */}
            <div
              className={cn(
                'absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 rounded-tl transition-colors duration-200',
                auto.state === 'countdown'
                  ? 'border-primary ring-2 ring-primary/40'
                  : auto.state === 'hold_still'
                    ? 'border-emerald-400'
                    : 'border-white/60',
              )}
            />
            <div
              className={cn(
                'absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 rounded-tr transition-colors duration-200',
                auto.state === 'countdown'
                  ? 'border-primary ring-2 ring-primary/40'
                  : auto.state === 'hold_still'
                    ? 'border-emerald-400'
                    : 'border-white/60',
              )}
            />
            <div
              className={cn(
                'absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 rounded-bl transition-colors duration-200',
                auto.state === 'countdown'
                  ? 'border-primary ring-2 ring-primary/40'
                  : auto.state === 'hold_still'
                    ? 'border-emerald-400'
                    : 'border-white/60',
              )}
            />
            <div
              className={cn(
                'absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 rounded-br transition-colors duration-200',
                auto.state === 'countdown'
                  ? 'border-primary ring-2 ring-primary/40'
                  : auto.state === 'hold_still'
                    ? 'border-emerald-400'
                    : 'border-white/60',
              )}
            />
          </div>
        )}

        {/* Auto-Capture State: Looking → Hold still → (ring) → Capturing → Analyzing */}
        {cameraStatus === 'ready' && !isAnalyzing && auto.isAutoEnabled && (
          <>
            <div className="absolute top-14 inset-x-4 z-20 flex justify-center pointer-events-none" data-testid="auto-state">
              {auto.state === 'countdown' ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-xl border border-white/20">
                  <CaptureRing progress={auto.ringProgress} size={16} />
                  <span>{t('pos:aiAutoCapturing')}</span>
                </div>
              ) : auto.state === 'hold_still' ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-medium shadow-lg">
                  <span className="inline-block w-2 h-2 rounded-full bg-white motion-safe:animate-pulse" />
                  <span>{t('pos:aiHoldStill')}</span>
                </div>
              ) : auto.state === 'capturing' ? (
                <div className="px-3 py-1 rounded-full bg-black/75 text-white text-xs font-medium">{t('pos:aiCapturingNow')}</div>
              ) : auto.state === 'paused' && autoPaused ? (
                <div className="px-3 py-1.5 rounded-full bg-black/80 text-white text-xs font-medium text-center">
                  {autoPausedMessage || t('pos:aiAutoPaused')}
                </div>
              ) : auto.state === 'unchanged' ? (
                <div className="px-3 py-1 rounded-full bg-black/75 text-white/80 border border-white/15 text-[11px] text-center">
                  {t('pos:aiSceneUnchanged', 'Scene unchanged — introduce new items to auto-scan')}
                </div>
              ) : auto.state === 'dark' ? (
                <div className="px-3 py-1 rounded-full bg-amber-500/90 text-black text-[11px] font-medium text-center shadow">
                  {t('pos:aiSceneTooDark', 'Lighting too low for auto-capture')}
                </div>
              ) : auto.state === 'looking' || auto.state === 'cooldown' ? (
                <div className="px-3 py-1 rounded-full bg-black/60 text-white/80 text-[11px]">{t('pos:aiLooking')}</div>
              ) : null}
            </div>

            {/* After a few interrupted rings: a hint, but auto-capture keeps trying */}
            {auto.showHint && auto.state !== 'countdown' && (
              <div className="absolute bottom-3 inset-x-4 z-20 flex justify-center pointer-events-none">
                <div className="px-3 py-1.5 rounded-lg bg-black/85 text-amber-300 border border-amber-500/30 text-[11px] text-center shadow-md">
                  {t('pos:aiHoldHint')}
                </div>
              </div>
            )}
          </>
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
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 text-white p-6 text-center animate-in fade-in duration-200" data-testid="analyzing-overlay">
            {/* What was sent, dimmed (instead of a blank or the live camera) */}
            {sentPhotoUrl && (
              <img src={sentPhotoUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-40" data-testid="analyzing-photo" />
            )}
            <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center motion-safe:animate-pulse">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h4 className="font-semibold text-base tracking-wide">
                {t('pos:aiAnalyzingTitle', 'Analyzing Basket...')}{' '}
                <span className="font-mono text-sm text-white/80 tabular-nums" data-testid="analyzing-elapsed">
                  {(elapsedMs / 1000).toFixed(1)} s
                </span>
              </h4>
              <ol className="space-y-1 text-left text-xs" aria-live="polite">
                {ANALYZING_STAGES.map((stage, idx) => {
                  const current = ANALYZING_STAGES.indexOf(analyzingStage || 'reading')
                  const status = idx < current ? 'done' : idx === current ? 'active' : 'todo'
                  return (
                    <li key={stage} className={cn('flex items-center gap-2', status === 'todo' && 'text-white/50')} data-stage={stage} data-status={status}>
                      {status === 'done' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : status === 'active' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <span className="inline-block h-3.5 w-3.5 rounded-full border border-white/40" />
                      )}
                      {stageLabels[stage]}
                    </li>
                  )
                })}
              </ol>
              {analyzingStep && <p className="text-[11px] text-white/60 max-w-xs">{analyzingStep}</p>}
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
            onClick={auto.manualTrigger}
            className={cn(
              'group relative flex items-center justify-center w-18 h-18 rounded-full border-4 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-primary',
              auto.state === 'countdown'
                ? 'border-primary ring-4 ring-primary/30 scale-105'
                : 'border-white/80',
            )}
            aria-label="Capture photo for AI basket scan"
          >
            <div
              className={cn(
                'w-14 h-14 rounded-full transition-colors flex items-center justify-center',
                auto.state === 'countdown'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white group-hover:bg-primary text-neutral-900 group-hover:text-white',
              )}
            >
              {auto.state === 'countdown' ? (
                <CaptureRing progress={auto.ringProgress} size={32} />
              ) : (
                <Camera className="w-6 h-6" />
              )}
            </div>
          </button>
          <span className="text-[10px] text-white/70 font-medium mt-1">
            {auto.state === 'countdown'
              ? t('pos:aiTapNow', 'Tap for now')
              : t('pos:aiCaptureBtn', 'Capture')}
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
