import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  CameraOff,
  ScanBarcode,
  ArrowRight,
  AlertCircle,
  Eye,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CameraScanner } from '@/components/scanner/CameraScanner'
import { AiCapture } from '@/components/ai/AiCapture'
import { FirstUseAiConsentDialog } from '@/components/ai/FirstUseAiConsentDialog'
import { useAiConsent } from '@/hooks/useAiConsent'
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge'
import { VisualMatchPanel } from '@/components/scanner/VisualMatchPanel'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { Barcode, classifyScan } from '@/lib/barcode'
import { handlePairingScan, notifyNotProductBarcode } from '@/lib/pairingScan'
import { beep, vibrate } from '@/lib/feedback'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { aiService } from '@/services/aiService'

const CAMERA_STORAGE_KEY = 'tt_barcode_camera_enabled'

/**
 * Universal, unified BarcodeCapture component supporting:
 * 1. Barcode scanning (USB wedge, manual typing, camera barcode detector)
 * 2. Visual search (on-device Transformers.js embedding & top-3 matches)
 * 3. AI Basket scan (fast photo analysis)
 *
 * @param {object} props
 * @param {(code: string, meta: { source: string, product?: object }) => void} props.onCode - Triggered on valid code
 * @param {(product: object, meta: { source: string }) => void} [props.onProductSelect] - Triggered when a product is selected
 * @param {(result: object) => void} [props.onBasketScanned] - Triggered on AI basket analysis
 * @param {boolean} [props.autoFocus=true] - Whether to autofocus the typed input
 * @param {'auto'|'on'|'off'} [props.cameraDefault='auto'] - Initial camera state policy
 * @param {boolean} [props.disabled=false] - Disable inputs and scanner
 * @param {string} [props.className] - Container CSS classes
 * @param {boolean} [props.continuous=false] - Whether scanner stays active for multiple scans
 * @param {string} [props.placeholder] - Custom input placeholder
 * @param {'barcode'|'visual'|'ai_basket'} [props.defaultMode='barcode'] - Starting tab
 * @param {boolean} [props.hideAiBasket=false] - Hide the AI Basket tab
 * @param {(code: string) => void} [props.onPairingCode] - Receives a scanned pairing code
 *   (QR URL or bare XXXX-XXXX). Without it, pairing QRs show the default pair/explain toast.
 */
export function BarcodeCapture({
  onCode,
  onProductSelect,
  onBasketScanned,
  autoFocus = true,
  cameraDefault = 'auto',
  disabled = false,
  className,
  continuous = false,
  placeholder,
  defaultMode = 'barcode',
  hideAiBasket = false,
  onPairingCode,
}) {
  const { t } = useTranslation(['scanner', 'products', 'common'])
  const { data: settingsRes } = useSettings()
  const settings = settingsRes?.data || {}

  const visualSearchEnabled = settings.visual_search_enabled !== false
  const aiBasketEnabled = settings.ai_enabled !== false
  const showAiBasket = aiBasketEnabled && !hideAiBasket

  const [mode, setMode] = useState(() => (defaultMode === 'ai_basket' && hideAiBasket ? 'barcode' : defaultMode))
  const [value, setValue] = useState('')
  const [validationError, setValidationError] = useState('')
  const [isBasketAnalyzing, setIsBasketAnalyzing] = useState(false)

  // AI First-Use Privacy Consent
  const {
    isConsentOpen,
    setIsConsentOpen,
    withConsent,
    acceptConsent,
    declineConsent,
  } = useAiConsent()

  const handleTabChange = (newMode) => {
    if (newMode === 'ai_basket') {
      withConsent(() => setMode('ai_basket'))
      return
    }
    setMode(newMode)
  }

  // Determine initial camera state for barcode tab
  const [isCameraOpen, setIsCameraOpen] = useState(() => {
    if (cameraDefault === 'on') return true
    if (cameraDefault === 'off') return false

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(CAMERA_STORAGE_KEY)
        if (stored !== null) return stored === 'true'
      } catch {
        // Ignore
      }
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(pointer: coarse)').matches
      } catch {
        // Fallback
      }
    }
    return false
  })

  // Catalog products query for visual search matching
  const { data: productsRes } = useProducts({ per_page: 250 })
  const allProducts = productsRes?.data || []

  const inputRef = useRef(null)
  const lastCodeRef = useRef('')
  const lastTimeRef = useRef(0)
  const debounceTimerRef = useRef(null)

  // Emit accepted code with deduplication (1500ms)
  const handleAcceptedCode = useCallback(
    (rawCode, source) => {
      if (disabled) return false
      const trimmed = String(rawCode || '').trim()
      if (!trimmed) return false

      const normalized = Barcode.normalize(trimmed)
      const now = Date.now()

      if (
        normalized === lastCodeRef.current &&
        now - lastTimeRef.current < 1500
      ) {
        return false
      }

      lastCodeRef.current = normalized
      lastTimeRef.current = now

      // Pairing QRs and random QR/text never reach onCode (and so never hit the lookup)
      if (source !== 'visual') {
        const scan = classifyScan(trimmed)
        if (scan.kind === 'pairing' && (scan.fromUrl || onPairingCode)) {
          vibrate()
          if (onPairingCode) {
            onPairingCode(scan.code)
          } else {
            handlePairingScan(scan.code)
          }
          setValue('')
          return false
        }
        if (scan.kind === 'unknown') {
          notifyNotProductBarcode()
          setValue('')
          return false
        }
      }

      beep()
      vibrate()

      onCode?.(normalized, { source })
      setValidationError('')
      setValue('')

      return true
    },
    [disabled, onCode, onPairingCode],
  )

  // Keyboard wedge listener (active focused or not)
  useBarcodeWedge({
    onScan: (scanned) => {
      if (disabled) return
      handleAcceptedCode(scanned, 'wedge')
    },
    enabled: !disabled && mode === 'barcode',
  })

  // Autofocus input on mount or when camera closes in barcode mode
  useEffect(() => {
    if (autoFocus && !disabled && mode === 'barcode' && !isCameraOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoFocus, disabled, mode, isCameraOpen])

  // Camera toggle handler
  const toggleCamera = () => {
    setIsCameraOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(CAMERA_STORAGE_KEY, String(next))
      } catch {
        // Ignore
      }
      if (!next && autoFocus) {
        setTimeout(() => inputRef.current?.focus(), 80)
      }
      return next
    })
  }

  // Barcode input change & validation
  const handleInputChange = (e) => {
    const val = e.target.value
    setValue(val)
    setValidationError('')

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const trimmed = val.trim()
    if (!trimmed) return

    const normalized = Barcode.normalize(trimmed)
    const isDigitsOnly = /^\d+$/.test(normalized)
    const len = normalized.length

    if (isDigitsOnly && [8, 12, 13, 14].includes(len) && !Barcode.isInternal(normalized)) {
      const expectedCheck = Barcode.computeCheckDigit(normalized.slice(0, -1))
      const actualCheck = parseInt(normalized.slice(-1), 10)

      if (expectedCheck !== actualCheck) {
        setValidationError(
          t('scanner:invalidCheckDigit', 'Invalid check digit (expected {{expected}}, got {{actual}})', {
            expected: expectedCheck,
            actual: actualCheck,
          }),
        )
        return
      }
    }

    if (Barcode.isValidGtin(normalized)) {
      debounceTimerRef.current = setTimeout(() => {
        handleAcceptedCode(normalized, 'typed')
        setValue('')
      }, 400)
    }
  }

  // Barcode submit
  const handleSubmit = (e) => {
    e.preventDefault()
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const trimmed = (value || inputRef.current?.value || '').trim()
    if (!trimmed) return

    const normalized = Barcode.normalize(trimmed)
    if (Barcode.isAcceptable(normalized)) {
      handleAcceptedCode(normalized, 'typed')
      setValue('')
    } else {
      setValidationError(t('scanner:invalidCodeFormat', 'Invalid barcode format (must be 4-32 characters).'))
    }
  }

  // Visual Match picked a product (from a match or "Ask AI")
  const handleVisualSelect = (product) => {
    if (onProductSelect) {
      onProductSelect(product, { source: 'visual' })
    } else {
      handleAcceptedCode(product.barcode || String(product.id), 'visual')
    }
  }

  // Handle AI Basket photo upload/capture
  const handleBasketCaptured = async (blob, captureMode = 'manual') => {
    setIsBasketAnalyzing(true)
    let objectUrl = null
    try {
      if (blob) {
        objectUrl = URL.createObjectURL(blob)
      }
      const res = await aiService.basketScan(blob, { capture_mode: captureMode })
      beep()
      vibrate()
      onBasketScanned?.(res, objectUrl)
    } catch (err) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      notify.error(t('scanner:aiBasketFailed', 'Failed to analyze basket.'), err?.message)
    } finally {
      setIsBasketAnalyzing(false)
    }
  }

  const showTabs = visualSearchEnabled || showAiBasket

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* MODE TABS (Barcode | Visual | AI Basket) */}
      {showTabs && (
        <Tabs value={mode} onValueChange={handleTabChange} className="w-full">
          <TabsList
            className={cn(
              'grid w-full h-10',
              showAiBasket && visualSearchEnabled ? 'grid-cols-3' : 'grid-cols-2',
            )}
          >
            <TabsTrigger value="barcode" className="gap-1.5 text-xs font-semibold">
              <ScanBarcode className="h-3.5 w-3.5" />
              <span>{t('scanner:modeBarcode', 'Barcode')}</span>
            </TabsTrigger>

            {visualSearchEnabled && (
              <TabsTrigger value="visual" className="gap-1.5 text-xs font-semibold">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span>{t('scanner:modeVisual', 'Visual Match')}</span>
              </TabsTrigger>
            )}

            {showAiBasket && (
              <TabsTrigger value="ai_basket" className="gap-1.5 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>{t('scanner:modeAiBasket', 'AI Basket')}</span>
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

      {/* TAB 1: BARCODE SCANNER */}
      {mode === 'barcode' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant={isCameraOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={toggleCamera}
              disabled={disabled}
              className="h-8 gap-1.5 text-xs font-medium"
              aria-label={
                isCameraOpen
                  ? t('scanner:hideCamera', 'Hide camera preview')
                  : t('scanner:useCamera', 'Use camera to scan')
              }
            >
              {isCameraOpen ? (
                <>
                  <CameraOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t('scanner:hideCamera', 'Hide camera')}</span>
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  <span>{t('scanner:useCamera', 'Use camera')}</span>
                </>
              )}
            </Button>

            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
              <ScanBarcode className="h-3 w-3" />
              <span>{t('scanner:usbWedgeReady', 'USB / Wedge ready')}</span>
            </span>
          </div>

          {isCameraOpen && (
            <div className="overflow-hidden rounded-xl border border-border shadow-sm">
              <CameraScanner
                onDetected={(code) => handleAcceptedCode(code, 'camera')}
                paused={!isCameraOpen || disabled}
                showManualFallback={false}
                className="w-full aspect-4/3 sm:aspect-video"
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-1.5">
            <div className="relative flex items-center">
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                enterKeyHint="search"
                autoComplete="off"
                data-barcode-input
                value={value}
                onChange={handleInputChange}
                disabled={disabled}
                placeholder={
                  placeholder ||
                  t('scanner:inputPlaceholder', 'Scan with barcode gun or type numbers...')
                }
                className={cn(
                  'h-12 text-base font-mono pr-12 tracking-wide shadow-xs md:text-sm',
                  validationError && 'border-destructive focus-visible:ring-destructive',
                )}
                autoFocus={autoFocus && !isCameraOpen}
              />

              <Button
                type="submit"
                size="icon"
                disabled={disabled || !value.trim()}
                className="absolute right-1.5 h-9 w-9 shrink-0 rounded-lg"
                aria-label={t('common:submit', 'Submit barcode')}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {validationError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive font-medium pt-0.5 animate-in fade-in-50">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: VISUAL MATCH (taught products, on-device) */}
      {mode === 'visual' && (
        <VisualMatchPanel
          products={allProducts}
          onSelect={handleVisualSelect}
          onSwitchToBarcode={() => setMode('barcode')}
          aiEnabled={aiBasketEnabled}
          withConsent={withConsent}
          disabled={disabled}
        />
      )}

      {/* TAB 3: AI BASKET SCANNER */}
      {mode === 'ai_basket' && (
        <div className="space-y-3">
          <AiCapture
            onCapture={handleBasketCaptured}
            isAnalyzing={isBasketAnalyzing}
            autoCaptureEnabled={true}
            featureKey="basket"
            hint={t('scanner:aiBasketHint', 'Point camera at the customer basket, then tap Capture.')}
          />
        </div>
      )}
      {/* AI First-Use Consent Dialog */}
      <FirstUseAiConsentDialog
        open={isConsentOpen}
        onOpenChange={setIsConsentOpen}
        onAccept={acceptConsent}
        onDecline={declineConsent}
      />
    </div>
  )
}

export default BarcodeCapture
