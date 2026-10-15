import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  Flashlight,
  FlashlightOff,
  FlipHorizontal,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Keyboard,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCameraScanner } from '@/hooks/useCameraScanner'
import { beep, vibrate } from '@/lib/feedback'
import { cn } from '@/lib/utils'

/**
 * Camera-based barcode scanner with viewfinder overlay, hardware torch/camera toggles,
 * and built-in manual barcode entry fallback.
 *
 * @param {object} props
 * @param {(code: string) => void} props.onDetected - Callback invoked when a valid barcode is scanned
 * @param {boolean} [props.paused=false] - Whether video detection is paused
 * @param {string} [props.className] - Optional container classes
 */
export function CameraScanner({
  onDetected,
  paused = false,
  className,
  showManualFallback = true,
}) {
  const { t } = useTranslation(['scanner', 'common'])
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)

  const handleScanSuccess = (code) => {
    beep()
    vibrate()
    onDetected?.(code)
  }

  const {
    status,
    error,
    videoRef,
    torchSupported,
    isTorchOn,
    toggleTorch,
    switchCamera,
    retry,
  } = useCameraScanner({
    onDetected: handleScanSuccess,
    paused,
  })

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const clean = manualCode.trim()
    if (!clean) return
    beep()
    vibrate()
    onDetected?.(clean)
    setManualCode('')
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-white',
        className,
      )}
    >
      {/* Video Viewport */}
      <div className="relative aspect-square w-full max-w-md overflow-hidden bg-black sm:aspect-4/3">
        <video
          ref={videoRef}
          className={cn(
            'h-full w-full object-cover',
            status !== 'scanning' && 'opacity-0',
          )}
          autoPlay
          muted
          playsInline
        />

        {/* Viewfinder Overlay (Shown when scanning) */}
        {status === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="relative aspect-square w-full max-w-[260px] rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 h-6 w-6 rounded-tl-lg border-t-4 border-l-4 border-emerald-400" />
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-tr-lg border-t-4 border-r-4 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-br-lg border-b-4 border-r-4 border-emerald-400" />

              {/* Animated Laser Beam */}
              {!paused && (
                <div className="animate-scan-line absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399]" />
              )}
            </div>
          </div>
        )}

        {/* State Badges / Loaders */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm font-medium text-slate-300">
              {t('scanner:startingCamera', 'Starting camera...')}
            </p>
          </div>
        )}

        {status === 'insecure' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-400" />
            <h4 className="font-semibold text-slate-100">
              {t('scanner:insecureTitle', 'HTTPS Required')}
            </h4>
            <p className="text-xs text-slate-300">
              {error || t('scanner:insecureDesc', 'Camera requires HTTPS or localhost. Please use a secure connection.')}
            </p>
          </div>
        )}

        {status === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center">
            <Camera className="h-10 w-10 text-rose-400" />
            <h4 className="font-semibold text-slate-100">
              {t('scanner:deniedTitle', 'Camera Access Blocked')}
            </h4>
            <p className="text-xs text-slate-300">
              {error || t('scanner:deniedDesc', 'Please allow camera permissions in your browser settings to scan barcodes.')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retry}
              className="mt-1 h-8 gap-1.5 border-slate-700 bg-slate-900 text-xs text-white hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('common:retry', 'Retry')}
            </Button>
          </div>
        )}

        {status === 'unsupported' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-400" />
            <h4 className="font-semibold text-slate-100">
              {t('scanner:unsupportedTitle', 'Not Supported')}
            </h4>
            <p className="text-xs text-slate-300">
              {error || t('scanner:unsupportedDesc', 'Video camera capture is not supported on this browser.')}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-rose-400" />
            <h4 className="font-semibold text-slate-100">
              {t('scanner:errorTitle', "Camera didn't start")}
            </h4>
            <p className="text-xs text-slate-300">
              {error || t('scanner:defaultError', "Camera didn't start within 8 seconds.")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retry}
              className="mt-1 h-8 gap-1.5 border-slate-700 bg-slate-900 text-xs text-white hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('common:retry', 'Retry')}
            </Button>
          </div>
        )}

        {/* Viewport Floating Controls */}
        {status === 'scanning' && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {torchSupported && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={toggleTorch}
                className="h-9 w-9 rounded-full bg-slate-900/80 text-white backdrop-blur-md hover:bg-slate-800"
                aria-label={
                  isTorchOn
                    ? t('scanner:turnOffTorch', 'Turn off flashlight')
                    : t('scanner:turnOnTorch', 'Turn on flashlight')
                }
              >
                {isTorchOn ? (
                  <FlashlightOff className="h-4 w-4 text-amber-400" />
                ) : (
                  <Flashlight className="h-4 w-4" />
                )}
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={switchCamera}
              className="h-9 w-9 rounded-full bg-slate-900/80 text-white backdrop-blur-md hover:bg-slate-800"
              aria-label={t('scanner:switchCamera', 'Switch camera')}
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Manual Entry Fallback Section */}
      {showManualFallback && (
        <div className="w-full border-t border-slate-800/80 bg-slate-900/90 p-4">
          {!showManual ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowManual(true)}
              className="w-full text-xs text-slate-400 hover:text-white"
            >
              <Keyboard className="mr-1.5 h-3.5 w-3.5" />
              {t('scanner:manualEntryBtn', 'Type barcode manually')}
            </Button>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={t('scanner:typeBarcodePlaceholder', 'Type barcode here...')}
                  className="h-9 bg-slate-950 text-white placeholder:text-slate-500"
                  data-barcode-input
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!manualCode.trim()}
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  aria-label={t('common:submit', 'Submit')}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-[11px] text-slate-400">
                {t('scanner:pressEnterHelper', 'Press Enter or the arrow button to submit.')}
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

