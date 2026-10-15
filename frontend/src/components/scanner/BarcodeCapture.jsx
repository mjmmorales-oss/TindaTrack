import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  CameraOff,
  ScanBarcode,
  ArrowRight,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CameraScanner } from '@/components/scanner/CameraScanner'
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge'
import { Barcode } from '@/lib/barcode'
import { beep, vibrate } from '@/lib/feedback'
import { cn } from '@/lib/utils'

const CAMERA_STORAGE_KEY = 'tt_barcode_camera_enabled'

/**
 * Universal, unified BarcodeCapture component.
 * Combines an accessible numeric barcode input, inline USB keyboard wedge listener,
 * inline toggleable camera viewfinder, inline check-digit validation, and auto-submit.
 *
 * @param {object} props
 * @param {(code: string, meta: { source: 'typed'|'camera'|'wedge' }) => void} props.onCode - Triggered on valid code
 * @param {boolean} [props.autoFocus=true] - Whether to autofocus the typed input
 * @param {'auto'|'on'|'off'} [props.cameraDefault='auto'] - Initial camera state policy
 * @param {boolean} [props.disabled=false] - Disable inputs and scanner
 * @param {string} [props.className] - Container CSS classes
 * @param {boolean} [props.continuous=false] - Whether scanner stays active for multiple scans
 * @param {string} [props.placeholder] - Custom input placeholder
 */
export function BarcodeCapture({
  onCode,
  autoFocus = true,
  cameraDefault = 'auto',
  disabled = false,
  className,
  continuous = false,
  placeholder,
}) {
  const { t } = useTranslation(['scanner', 'products', 'common'])
  const [value, setValue] = useState('')
  const [validationError, setValidationError] = useState('')

  // Determine initial camera state
  const [isCameraOpen, setIsCameraOpen] = useState(() => {
    if (cameraDefault === 'on') return true
    if (cameraDefault === 'off') return false

    // Check localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(CAMERA_STORAGE_KEY)
        if (stored !== null) {
          return stored === 'true'
        }
      } catch {
        // Ignore storage errors
      }
    }

    // Default: coarse pointer (touch device) -> on; fine pointer (desktop) -> off
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        return window.matchMedia('(pointer: coarse)').matches
      } catch {
        // Fallback
      }
    }
    return false
  })

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

      // Deduplication window: 1500ms for exact same barcode
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

      if (!continuous) {
        setValue('')
      } else {
        setValue('')
      }

      return true
    },
    [disabled, continuous, onCode],
  )

  // Keyboard wedge listener (active focused or not)
  useBarcodeWedge({
    onScan: (scanned) => {
      if (disabled) return
      handleAcceptedCode(scanned, 'wedge')
    },
    enabled: !disabled,
  })

  // Autofocus input on mount or when camera closes
  useEffect(() => {
    if (autoFocus && !disabled && !isCameraOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoFocus, disabled, isCameraOpen])

  // Camera toggle handler with localStorage persistence
  const toggleCamera = () => {
    setIsCameraOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(CAMERA_STORAGE_KEY, String(next))
      } catch {
        // Ignore storage errors
      }
      if (!next && autoFocus) {
        setTimeout(() => inputRef.current?.focus(), 80)
      }
      return next
    })
  }

  // Value change and GTIN validation / auto-submit debounce
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

    // Inline check digit validation for potential GTINs
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

    // Auto-submit valid GTIN after 400ms debounce
    if (Barcode.isValidGtin(normalized)) {
      debounceTimerRef.current = setTimeout(() => {
        handleAcceptedCode(normalized, 'typed')
        setValue('')
      }, 400)
    }
  }

  // Handle manual Enter submission
  const handleSubmit = (e) => {
    e.preventDefault()
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const trimmed = (value || inputRef.current?.value || '').trim()
    if (!trimmed) return

    const normalized = Barcode.normalize(trimmed)
    const isDigitsOnly = /^\d+$/.test(normalized)
    const len = normalized.length

    // If it looks like a GTIN, enforce check digit
    if (isDigitsOnly && [8, 12, 13, 14].includes(len) && !Barcode.isInternal(normalized)) {
      if (!Barcode.isValidGtin(normalized)) {
        const expectedCheck = Barcode.computeCheckDigit(normalized.slice(0, -1))
        const actualCheck = parseInt(normalized.slice(-1), 10)
        setValidationError(
          t('scanner:invalidCheckDigit', 'Invalid check digit (expected {{expected}}, got {{actual}})', {
            expected: expectedCheck,
            actual: actualCheck,
          }),
        )
        return
      }
    }

    // Accept if acceptable (valid GTIN, internal 20-29 code, or custom alphanumeric)
    if (Barcode.isAcceptable(normalized)) {
      handleAcceptedCode(normalized, 'typed')
      setValue('')
    } else {
      setValidationError(t('scanner:invalidCodeFormat', 'Invalid barcode format (must be 4-32 characters).'))
    }
  }

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* Top Action Bar: Camera Toggle & Wedge Hint */}
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
          <span>USB / Wedge ready</span>
        </span>
      </div>

      {/* Inline Camera Viewfinder (Collapsible) */}
      {isCameraOpen && (
        <div className="overflow-hidden rounded-xl border border-border shadow-sm">
          <CameraScanner
            onDetected={(code) => handleAcceptedCode(code, 'camera')}
            paused={!isCameraOpen || disabled}
            showManualFallback={false}
            className="w-full aspect-[4/3] sm:aspect-video"
          />
        </div>
      )}

      {/* Main Barcode Input Form */}
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
              'h-12 text-base font-mono pr-12 tracking-wide shadow-xs',
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

        {/* Inline Check-Digit / Format Error Message */}
        {validationError && (
          <div className="flex items-center gap-1.5 text-xs text-destructive font-medium pt-0.5 animate-in fade-in-50">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </form>
    </div>
  )
}

export default BarcodeCapture
