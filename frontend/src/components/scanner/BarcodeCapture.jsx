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
  HelpCircle,
  Loader2,
  Check,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CameraScanner } from '@/components/scanner/CameraScanner'
import { AiCapture } from '@/components/ai/AiCapture'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge'
import { useCameraScanner } from '@/hooks/useCameraScanner'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { Barcode } from '@/lib/barcode'
import { beep, vibrate } from '@/lib/feedback'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { aiService } from '@/services/aiService'
import {
  VISUAL_MODEL_ID,
  VISUAL_SIMILARITY_THRESHOLD,
  VISUAL_MARGIN_THRESHOLD,
  VISUAL_SCAN_INTERVAL_MS,
} from '@/config/visual'
import {
  embedImage,
  findTopMatches,
  getVisualIndex,
  invalidateVisualIndex,
} from '@/lib/visualSearch'

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
}) {
  const { t } = useTranslation(['scanner', 'products', 'common'])
  const { data: settingsRes } = useSettings()
  const settings = settingsRes?.data || {}

  const visualSearchEnabled = settings.visual_search_enabled !== false
  const aiBasketEnabled = settings.ai_enabled !== false

  const [mode, setMode] = useState(defaultMode)
  const [value, setValue] = useState('')
  const [validationError, setValidationError] = useState('')

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

  // Visual search states
  const [visualMatches, setVisualMatches] = useState([])
  const [visualStatus, setVisualStatus] = useState('waiting') // 'waiting'|'ok'|'low_confidence'|'low_margin'|'empty'|'error'
  const [isVisualScanning, setIsVisualScanning] = useState(false)
  const [visualError, setVisualError] = useState(null)
  const [lastQueryVector, setLastQueryVector] = useState(null)
  const [showTeachDialog, setShowTeachDialog] = useState(false)
  const [selectedCorrectionProduct, setSelectedCorrectionProduct] = useState(null)
  const [isTeaching, setIsTeaching] = useState(false)

  // Camera stream hook for Visual Mode
  const {
    videoRef: visualVideoRef,
    status: visualCamStatus,
    error: visualCamError,
  } = useCameraScanner({
    enabled: mode === 'visual' && !disabled,
    paused: mode !== 'visual',
  })

  const inputRef = useRef(null)
  const lastCodeRef = useRef('')
  const lastTimeRef = useRef(0)
  const debounceTimerRef = useRef(null)
  const isBusyEmbeddingRef = useRef(false)

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

      beep()
      vibrate()

      onCode?.(normalized, { source })
      setValidationError('')
      setValue('')

      return true
    },
    [disabled, onCode],
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

  // VISUAL SEARCH SCAN LOOP (~700ms interval)
  useEffect(() => {
    if (mode !== 'visual' || disabled || visualCamStatus !== 'scanning') {
      return
    }

    let intervalId = null
    let isCancelled = false

    const runVisualScan = async () => {
      if (document.hidden || isBusyEmbeddingRef.current || isCancelled) return
      const video = visualVideoRef.current
      if (!video || video.readyState < 2 || video.videoWidth === 0) return

      isBusyEmbeddingRef.current = true
      setIsVisualScanning(true)

      try {
        // Crop center square
        const side = Math.min(video.videoWidth, video.videoHeight)
        const sx = (video.videoWidth - side) / 2
        const sy = (video.videoHeight - side) / 2

        const canvas = document.createElement('canvas')
        canvas.width = 224
        canvas.height = 224
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, sx, sy, side, side, 0, 0, 224, 224)

        const vector = await embedImage(canvas)
        if (isCancelled) return

        setLastQueryVector(vector)

        const index = await getVisualIndex()
        const { matches, status } = findTopMatches(vector, index, {
          topK: 3,
          threshold: VISUAL_SIMILARITY_THRESHOLD,
          margin: VISUAL_MARGIN_THRESHOLD,
        })

        if (!isCancelled) {
          setVisualStatus(status)
          if (status === 'ok') {
            // Attach resolved product objects
            const resolved = matches
              .map((m) => {
                const prod = allProducts.find((p) => Number(p.id) === Number(m.product_id))
                return prod ? { ...m, product: prod } : null
              })
              .filter(Boolean)
            setVisualMatches(resolved)
          } else {
            setVisualMatches([])
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Visual search cycle error:', err)
          setVisualError(err?.message || 'Inference error')
        }
      } finally {
        isBusyEmbeddingRef.current = false
        if (!isCancelled) {
          setIsVisualScanning(false)
        }
      }
    }

    intervalId = setInterval(runVisualScan, VISUAL_SCAN_INTERVAL_MS)
    return () => {
      isCancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [mode, disabled, visualCamStatus, allProducts])

  // Handle visual match selection
  const handleSelectVisualMatch = (product) => {
    beep()
    vibrate()
    if (onProductSelect) {
      onProductSelect(product, { source: 'visual' })
    } else {
      handleAcceptedCode(product.barcode || String(product.id), 'visual')
    }
  }

  // Handle teaching loop
  const handleTeachPhoto = async () => {
    if (!selectedCorrectionProduct || !lastQueryVector) return
    setIsTeaching(true)
    try {
      await aiService.saveEmbedding(selectedCorrectionProduct.id, {
        model: VISUAL_MODEL_ID,
        source: 'correction',
        vector: lastQueryVector,
      })
      invalidateVisualIndex()
      notify.success(
        t('scanner:teachPhoto', 'Teach TindaTrack this photo'),
        t('scanner:teachingSuccess', 'Successfully saved reference photo for {{name}}.', {
          name: selectedCorrectionProduct.name,
        }),
      )
      setShowTeachDialog(false)
      setSelectedCorrectionProduct(null)
    } catch (err) {
      notify.error(t('common:error', 'Error'), err?.message)
    } finally {
      setIsTeaching(false)
    }
  }

  // Handle AI Basket photo upload/capture
  const handleBasketCaptured = async (blob) => {
    try {
      const res = await aiService.basketScan(blob)
      beep()
      vibrate()
      onBasketScanned?.(res)
    } catch (err) {
      notify.error(t('scanner:aiBasketFailed', 'Failed to analyze basket.'), err?.message)
    }
  }

  const showTabs = visualSearchEnabled || aiBasketEnabled

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* MODE TABS (Barcode | Visual | AI Basket) */}
      {showTabs && (
        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="barcode" className="gap-1.5 text-xs font-semibold">
              <ScanBarcode className="h-3.5 w-3.5" />
              <span>{t('scanner:modeBarcode', 'Barcode')}</span>
            </TabsTrigger>

            {visualSearchEnabled && (
              <TabsTrigger value="visual" className="gap-1.5 text-xs font-semibold">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span>{t('scanner:modeVisual', 'Visual')}</span>
              </TabsTrigger>
            )}

            {aiBasketEnabled && (
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

      {/* TAB 2: VISUAL PRODUCT IDENTIFIER */}
      {mode === 'visual' && (
        <div className="space-y-3.5">
          {visualError ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-2">
              <p className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                <span>{t('scanner:unsupportedTitle', 'Visual search unavailable')}</span>
              </p>
              <p className="text-muted-foreground">
                {t('scanner:visualUnavailable', 'On-device visual search is unavailable on this browser/device. Please use barcode scanning.')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode('barcode')}
                className="gap-1.5 text-xs"
              >
                <ScanBarcode className="h-3.5 w-3.5" />
                <span>{t('scanner:modeBarcode', 'Switch to Barcode')}</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Camera Viewfinder with Center Square Guide */}
              <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-xl border border-border bg-black shadow-sm sm:aspect-4/3">
                <video
                  ref={visualVideoRef}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />

                {/* Center Square Overlay Guide */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                  <div className="relative aspect-square w-48 sm:w-56 rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 h-5 w-5 rounded-tl-lg border-t-3 border-l-3 border-primary" />
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-tr-lg border-t-3 border-r-3 border-primary" />
                    <div className="absolute -bottom-1 -left-1 h-5 w-5 rounded-bl-lg border-b-3 border-l-3 border-primary" />
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-br-lg border-b-3 border-r-3 border-primary" />

                    {/* Scanning Pulse Line */}
                    <div className="absolute inset-x-2 top-1/2 h-0.5 bg-primary/70 shadow-[0_0_8px_var(--primary)] animate-pulse" />
                  </div>
                </div>

                {/* Live Scanning Status Pill */}
                <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                  <div className="rounded-full bg-slate-900/80 backdrop-blur-xs px-3 py-1 text-[11px] text-white flex items-center gap-1.5 font-medium shadow-sm">
                    {isVisualScanning ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        <span>{t('scanner:visualSearching', 'Identifying product...')}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 text-primary" />
                        <span>{t('scanner:modeVisual', 'Visual Search')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* MATCHED RESULTS OR HINTS */}
              {visualMatches.length > 0 ? (
                <div className="space-y-2 animate-in fade-in-50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Top Matches:</span>
                    <button
                      type="button"
                      onClick={() => setShowTeachDialog(true)}
                      className="text-primary hover:underline text-[11px]"
                    >
                      {t('scanner:notThisOne', 'Not this one?')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {visualMatches.map((m) => (
                      <button
                        key={m.product_id}
                        type="button"
                        onClick={() => handleSelectVisualMatch(m.product)}
                        className="flex items-center gap-3 rounded-xl border border-primary/40 bg-card p-2.5 text-left hover:border-primary hover:bg-primary/5 transition-all shadow-xs"
                      >
                        <ProductThumb
                          name={m.product?.name}
                          imageUrl={m.product?.image_url}
                          size="md"
                          className="shrink-0 rounded-lg"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-foreground truncate leading-tight">
                            {m.product?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Money amount={m.product?.price || 0} size="xs" />
                            <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 rounded px-1">
                              {Math.round(m.score * 100)}%
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span>
                    {t(
                      'scanner:visualHoldCloser',
                      'Hold the product closer / try another angle',
                    )}
                  </span>
                </div>
              )}

              {/* TEACHING LOOP ACCORDION/FORM */}
              {showTeachDialog && (
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5 animate-in fade-in-50">
                  <p className="text-xs font-semibold text-foreground">
                    {t('scanner:pickCorrectProduct', 'Pick the correct product')}
                  </p>
                  <select
                    className="w-full rounded-lg border border-border bg-background p-2 text-base md:text-xs"
                    value={selectedCorrectionProduct?.id || ''}
                    onChange={(e) => {
                      const id = e.target.value
                      const found = allProducts.find((p) => String(p.id) === String(id))
                      setSelectedCorrectionProduct(found || null)
                    }}
                  >
                    <option value="">-- Choose product --</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₱{p.price})
                      </option>
                    ))}
                  </select>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTeachDialog(false)}
                      className="text-xs h-8"
                    >
                      {t('common:cancel', 'Cancel')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!selectedCorrectionProduct || isTeaching}
                      onClick={handleTeachPhoto}
                      className="gap-1.5 text-xs h-8"
                    >
                      {isTeaching ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>{t('scanner:teachPhoto', 'Teach TindaTrack this photo')}</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: AI BASKET SCANNER */}
      {mode === 'ai_basket' && (
        <div className="space-y-3">
          <AiCapture
            onCapture={handleBasketCaptured}
            hint={t('scanner:aiBasketHint', 'Point camera at the customer basket, then tap Capture.')}
          />
        </div>
      )}
    </div>
  )
}

export default BarcodeCapture
