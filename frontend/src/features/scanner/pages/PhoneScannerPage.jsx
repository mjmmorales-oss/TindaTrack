import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  LogOut,
  Minus,
  Plus,
  Clock,
  ScanLine,
  RefreshCw,
  QrCode,
  X,
} from 'lucide-react'
import { BarcodeCapture } from '@/components/scanner/BarcodeCapture'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ModeToggle } from '@/components/common/ModeToggle'
import { pairScanner, sendScan, scannerHeartbeat, sendAiBasket } from '@/services/scanner.js'
import { beep, vibrate } from '@/lib/feedback'
import { formatCurrency } from '@/lib/format'
import { parsePairingCode } from '@/lib/barcode'
import { makePreviewDataUrl } from '@/lib/imagePrep'
import { notify } from '@/lib/notify'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const SCANNER_TOKEN_KEY = 'tt_scanner_token'
const SCANNER_INFO_KEY = 'tt_scanner_info'

function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Phone'
  const ua = navigator.userAgent || ''
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return 'Android phone'
  if (/Macintosh/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'PC'
  return 'Phone'
}

function formatCode(val) {
  const cleaned = (val || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`
  }
  return cleaned
}

/**
 * PhoneScannerPage
 * Lightweight, standalone full-screen mobile scanner page (/scan).
 * No login required — paired via short pairing code.
 */
export function PhoneScannerPage() {
  const { t } = useTranslation(['scanner', 'pos', 'common'])
  useDocumentTitle(t('scanner:pageTitle', 'TindaTrack Phone Scanner'))
  const [searchParams] = useSearchParams()

  // State: session info
  const [sessionInfo, setSessionInfo] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(SCANNER_INFO_KEY)
        const token = sessionStorage.getItem(SCANNER_TOKEN_KEY)
        if (raw && token) return JSON.parse(raw)
      } catch {
        // ignore
      }
    }
    return null
  })

  // State: pairing input
  const [codeInput, setCodeInput] = useState('')
  const [isPairing, setIsPairing] = useState(false)
  const [pairError, setPairError] = useState(null)
  const [sessionEndedMessage, setSessionEndedMessage] = useState(null)

  // Scanning state
  const [quantity, setQuantity] = useState(1)
  const [isSending, setIsSending] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  // In-app camera for the laptop's pairing QR (no need to leave the app)
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false)
  // After sending a basket the phone waits for the cashier (no second basket on top)
  const [waitingForCashier, setWaitingForCashier] = useState(false)
  const [basketRearmKey, setBasketRearmKey] = useState(0)

  const hasAutoPaired = useRef(false)

  // Handle pairing action
  const handlePair = useCallback(async (codeToPair) => {
    const rawCode = (codeToPair || '').trim()
    if (!rawCode) {
      setPairError(t('scanner:noCodeError', 'No pairing code provided. Scan the QR on POS or enter the code.'))
      return
    }

    const clean = rawCode.replace(/[-\s]/g, '').toUpperCase()
    const formattedCode =
      clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : rawCode.toUpperCase()

    if (clean.length < 4) {
      setPairError(t('scanner:invalidCodeError', 'Enter a valid 8-character pairing code.'))
      return
    }

    setIsPairing(true)
    setPairError(null)
    setSessionEndedMessage(null)

    try {
      const res = await pairScanner({
        pairing_code: formattedCode,
        device_label: getDeviceLabel(),
      })

      const payload = res?.data ?? res

      const info = {
        store_name: payload.store_name || 'Tindahan ni Aling Nena',
        user_name: payload.user_name || 'Aling Nena',
        mode: payload.session?.mode || 'pos',
        expires_at: payload.session?.expires_at,
        sessionId: payload.session?.id,
      }

      setSessionInfo(info)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SCANNER_INFO_KEY, JSON.stringify(info))
      }
    } catch (err) {
      const reason = err?.response?.data?.reason || err?.data?.reason
      const status = err?.status ?? err?.response?.status

      if (reason === 'not_found') {
        setPairError(t('scanner:notFoundError', 'Pairing code not found. Make sure the code from POS is correct.'))
      } else if (reason === 'expired') {
        setPairError(t('scanner:expiredError', 'Pairing code expired. Request a new code on POS.'))
      } else if (reason === 'used') {
        setPairError(t('scanner:usedError', 'This pairing code was already used. Request a new code on POS.'))
      } else if (
        status === 0 ||
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err?.message?.includes('Network Error') ||
        err?.message?.includes('Failed to fetch')
      ) {
        setPairError(t('scanner:networkError', 'Cannot reach scanner server. Ensure phone and laptop are on the same Wi-Fi.'))
      } else {
        setPairError(err?.message || t('scanner:generalPairError', 'Could not connect. Please check the pairing code.'))
      }
    } finally {
      setIsPairing(false)
    }
  }, [t])

  // Auto-pair on mount if ?code= is present
  useEffect(() => {
    const queryCode = searchParams.get('code')
    if (queryCode && !hasAutoPaired.current && !sessionInfo) {
      hasAutoPaired.current = true
      const formatted = formatCode(queryCode)
      setCodeInput(formatted)
      handlePair(formatted)
    } else if (searchParams.has('code') && !searchParams.get('code')?.trim() && !sessionInfo) {
      setPairError(t('scanner:noCodeError', 'No pairing code provided. Scan the QR on POS or enter the code.'))
    }
  }, [searchParams, sessionInfo, handlePair, t])

  // Screen Wake Lock (prevent screen from sleeping while scanning)
  useEffect(() => {
    if (!sessionInfo) return
    let wakeLock = null

    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen')
        } catch {
          // ignore
        }
      }
    }

    requestWakeLock()
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVis)
    return () => {
      document.removeEventListener('visibilitychange', handleVis)
      wakeLock?.release().catch(() => {})
    }
  }, [sessionInfo])

  // Heartbeat every 10s
  useEffect(() => {
    if (!sessionInfo) return

    // Faster while waiting for the cashier, so the phone re-arms right after Add to Cart
    const timer = setInterval(async () => {
      try {
        const res = await scannerHeartbeat()
        const beat = res?.data ?? res
        if (waitingForCashier && beat?.basket_pending === false) {
          setWaitingForCashier(false)
          setBasketRearmKey((k) => k + 1)
        }
      } catch (err) {
        const status = err?.status ?? err?.response?.status
        if (status === 401) {
          disconnect(t('scanner:sessionEndedRescan', 'Session ended. Please scan a new QR code.'))
        }
      }
    }, waitingForCashier ? 2000 : 10000)

    return () => clearInterval(timer)
  }, [sessionInfo, waitingForCashier, t])

  // Disconnect function
  const disconnect = (message = null) => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SCANNER_TOKEN_KEY)
      sessionStorage.removeItem(SCANNER_INFO_KEY)
    }
    setSessionInfo(null)
    setLastScan(null)
    setScanHistory([])
    if (message) {
      setSessionEndedMessage(message)
    }
  }

  // Handle scanned code from CameraScanner
  const handleDetected = async (code) => {
    if (!sessionInfo || isSending) return
    setIsSending(true)

    try {
      const raw = await sendScan({ barcode: code, quantity })
      const res = raw?.data ?? raw
      beep()
      vibrate(60)

      const resultEntry = {
        id: Date.now(),
        barcode: code,
        status: res.status,
        product: res.product,
        catalog: res.catalog,
        quantity,
        time: new Date().toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      }

      setLastScan(resultEntry)
      setScanHistory((prev) => [resultEntry, ...prev].slice(0, 10))
    } catch (err) {
      const status = err?.status ?? err?.response?.status
      if (status === 401) {
        disconnect(t('scanner:sessionEndedRescan', 'Session ended. Please scan a new QR code.'))
      } else {
        setLastScan({
          id: Date.now(),
          barcode: code,
          status: 'error',
          error: err?.message || t('scanner:scanSendFailed', 'Failed to send scan.'),
          time: new Date().toLocaleTimeString('en-PH'),
        })
      }
    } finally {
      setIsSending(false)
    }
  }

  // Handle AI basket photo capture from phone
  const handleAiBasketPhoto = async (blob, captureMode = 'manual', { onStage } = {}) => {
    try {
      // Small photo for the POS review (the server drops it if it's too big)
      const preview = await makePreviewDataUrl(blob)
      const res = await sendAiBasket(blob, {
        capture_mode: captureMode,
        onStage,
        ...(preview ? { preview_data_url: preview } : {}),
      })
      const scan = res?.scan || res

      // Nothing detected: nothing was sent to the POS; try again in 2 s
      if (res?.empty) {
        setLastScan({
          id: Date.now(),
          barcode: 'AI_BASKET',
          status: 'unknown',
          product: { name: t('pos:aiNothingDetected'), price: 0 },
          time: new Date().toLocaleTimeString('en-PH'),
        })
        setBasketRearmKey((k) => k + 1)
        return
      }

      beep()
      vibrate(100)
      setWaitingForCashier(true)
      const count = scan?.items?.length ?? scan?.detected_count ?? scan?.matched_count ?? 0
      setLastScan({
        id: Date.now(),
        barcode: 'AI_BASKET',
        status: 'found',
        product: {
          name: t('scanner:aiBasketDetected', {
            count,
            defaultValue: `AI Basket (${count} items detected)`,
          }),
          price: 0,
        },
        time: new Date().toLocaleTimeString('en-PH'),
      })
    } catch (err) {
      const status = err?.status ?? err?.response?.status
      if (status === 401) {
        disconnect(t('scanner:sessionEndedRescan', 'Session ended. Please scan a new QR code.'))
        return
      }
      setLastScan({
        id: Date.now(),
        barcode: 'AI_BASKET',
        status: 'error',
        error: err?.message || t('scanner:aiBasketFailed', 'Failed to analyze basket.'),
        time: new Date().toLocaleTimeString('en-PH'),
      })
    }
  }

  // The laptop's QR was read by the in-app camera: pair at once
  const handleQrPairing = (code) => {
    setIsQrScannerOpen(false)
    setCodeInput(code)
    handlePair(code)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shrink-0 shadow-xs">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight truncate">
              {sessionInfo?.store_name || 'TindaTrack Scanner'}
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              {sessionInfo
                ? t('scanner:connectedToUser', { name: sessionInfo.user_name, defaultValue: `Connected to ${sessionInfo.user_name}` })
                : t('scanner:phoneScannerHeader', 'Wireless Phone Scanner')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessionInfo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary uppercase tracking-wider border border-primary/20">
              {sessionInfo.mode === 'inventory' ? 'Inventory' : 'POS'}
            </span>
          )}

          {sessionInfo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => disconnect()}
              className="h-8 text-xs text-muted-foreground hover:text-destructive px-2"
              title={t('scanner:disconnect', 'Disconnect')}
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t('scanner:disconnect', 'Disconnect')}</span>
            </Button>
          )}

          <ModeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
        {!sessionInfo ? (
          /* UNPAIRED STATE */
          <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <ScanLine className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <span
                data-testid="pairing-status"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
              >
                {isPairing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                )}
                {isPairing
                  ? t('scanner:statusPairing')
                  : sessionEndedMessage
                    ? t('scanner:statusEnded')
                    : t('scanner:statusNotPaired')}
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                {t('scanner:usePhoneAsScannerTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('scanner:pairInstructionsQr')}
              </p>
            </div>

            {sessionEndedMessage && (
              <Alert variant="warning" className="text-xs text-left max-w-sm border-warning/40 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground font-medium">
                  {sessionEndedMessage}
                </AlertDescription>
              </Alert>
            )}

            {pairError && (
              <Alert variant="destructive" className="text-xs text-left max-w-sm">
                <AlertDescription>{pairError}</AlertDescription>
              </Alert>
            )}

            {isQrScannerOpen ? (
              <div className="w-full max-w-sm space-y-2 text-left">
                <BarcodeCapture
                  onCode={(code) => {
                    const pairing = parsePairingCode(code)
                    if (pairing) handleQrPairing(pairing)
                    else notify.warning(t('scanner:notPairingQr'), t('scanner:notPairingQrDesc'))
                  }}
                  onPairingCode={handleQrPairing}
                  cameraDefault="on"
                  autoFocus={false}
                  hideAiBasket
                  hideVisual
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsQrScannerOpen(false)}
                  className="w-full h-11 gap-1.5"
                >
                  <X className="h-4 w-4" />
                  {t('common:cancel', 'Cancel')}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={() => setIsQrScannerOpen(true)}
                disabled={isPairing}
                className="w-full max-w-sm h-14 text-base font-bold gap-2"
              >
                <QrCode className="h-5 w-5" />
                {t('scanner:scanPairingQr')}
              </Button>
            )}

            <div className="flex w-full max-w-sm items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {t('scanner:orTypeCode')}
              <span className="h-px flex-1 bg-border" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handlePair(codeInput)
              }}
              className="w-full max-w-sm space-y-3"
            >
              <div className="space-y-1 text-left">
                <label htmlFor="pairing-code-input" className="text-xs font-semibold text-muted-foreground">
                  {t('scanner:pairingCode', 'Pairing Code')}
                </label>
                <Input
                  id="pairing-code-input"
                  value={codeInput}
                  onChange={(e) => setCodeInput(formatCode(e.target.value))}
                  placeholder="ABCD-EFGH"
                  className="h-12 text-center text-xl font-mono font-bold tracking-widest uppercase bg-card border-border"
                  maxLength={9}
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                variant="outline"
                disabled={isPairing || codeInput.length < 4}
                className="w-full h-12 text-sm font-bold gap-2"
              >
                {isPairing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t('scanner:connecting', 'Connecting...')}
                  </>
                ) : (
                  t('scanner:pairPhoneButton', 'Connect Phone')
                )}
              </Button>
            </form>

            <div className="text-xs text-muted-foreground max-w-xs space-y-1 bg-muted/40 p-3 rounded-lg border border-border">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                {t('scanner:howToConnect', 'How to connect?')}
              </p>
              <p>{t('scanner:howToConnectQrDesc')}</p>
            </div>
          </div>
        ) : (
          /* PAIRED STATE */
          <div className="flex-1 flex flex-col space-y-4">
            {/* Connected banner */}
            <div
              data-testid="pairing-status"
              className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5"
            >
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{t('scanner:statusConnected')}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t('scanner:statusConnectedTo', { store: sessionInfo.store_name })}
                </p>
              </div>
            </div>

            {waitingForCashier && (
              <div
                className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                data-testid="waiting-for-cashier"
              >
                <p className="text-sm font-medium">{t('scanner:sentWaitingForCashier')}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setWaitingForCashier(false)
                    setBasketRearmKey((k) => k + 1)
                  }}
                >
                  {t('scanner:scanNextBasket')}
                </Button>
              </div>
            )}

            {/* Tabs: Barcode | AI Basket (Visual Match needs the store catalog, so it stays on the POS) */}
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <BarcodeCapture
                onCode={(code) => handleDetected(code)}
                onPairingCode={() =>
                  notify.info(t('scanner:alreadyConnected'), t('scanner:alreadyConnectedDesc'))
                }
                onBasketCapture={handleAiBasketPhoto}
                basketPaused={waitingForCashier}
                basketPausedMessage={t('scanner:sentWaitingForCashier')}
                basketRearmKey={basketRearmKey}
                hideVisual
                cameraDefault="on"
                continuous={true}
                placeholder={t('scanner:typeBarcodePlaceholder', 'Type barcode here...')}
              />
            </div>

            {/* Quantity Stepper Row */}
            <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/80 shadow-xs">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  {t('scanner:quantityLabel', 'Quantity:')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('scanner:quantitySentPerScan', 'Quantity sent per scan')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-lg"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label={t('scanner:decreaseQuantity', 'Decrease quantity')}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <span className="font-mono text-base font-bold w-8 text-center tabular-nums">
                  {quantity}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-lg"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  aria-label={t('scanner:increaseQuantity', 'Increase quantity')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Instant Scan Result Card */}
            {lastScan && (
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  lastScan.status === 'found'
                    ? 'bg-success/10 border-success/30 text-success-foreground'
                    : lastScan.status === 'out_of_stock'
                    ? 'bg-warning/10 border-warning/30 text-warning-foreground'
                    : 'bg-muted/60 border-border text-foreground'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {lastScan.status === 'found' && (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                    {lastScan.status === 'out_of_stock' && (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    )}
                    {lastScan.status === 'unknown' && (
                      <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    {lastScan.status === 'found' && (
                      <>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-bold leading-tight truncate">
                            {lastScan.product?.name || 'Product'}
                          </p>
                          <span className="text-sm font-black font-mono shrink-0 text-success">
                            {formatCurrency(lastScan.product?.price || 0)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('scanner:sentToPos', { quantity: lastScan.quantity, defaultValue: `Sent to POS ✓ (x${lastScan.quantity})` })}
                        </p>
                      </>
                    )}

                    {lastScan.status === 'out_of_stock' && (
                      <>
                        <p className="text-sm font-bold leading-tight">
                          {lastScan.product?.name || t('pos:outOfStock', 'Out of Stock')}
                        </p>
                        <p className="text-xs text-warning-foreground">
                          {t('scanner:outOfStockWarning', 'Warning: This product is out of stock in store.')}
                        </p>
                      </>
                    )}

                    {lastScan.status === 'unknown' && (
                      <>
                        <p className="text-sm font-bold leading-tight">
                          {t('scanner:barcodeNotRegistered', 'Barcode not registered yet')}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {lastScan.barcode}
                        </p>
                        {sessionInfo.mode === 'inventory' && lastScan.catalog?.name && (
                          <p className="text-xs text-primary font-medium mt-1">
                            {t('scanner:foundOnline', { name: lastScan.catalog.name, defaultValue: `Found online: ${lastScan.catalog.name}` })}
                          </p>
                        )}
                      </>
                    )}

                    {lastScan.status === 'error' && (
                      <p className="text-xs text-destructive font-medium">
                        {lastScan.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Scans History (Last 10) */}
            {scanHistory.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
                  <span>
                    {t('scanner:recentScans', { count: scanHistory.length, defaultValue: `Recent Scans (${scanHistory.length})` })}
                  </span>
                  <span className="flex items-center gap-1 font-normal text-[11px]">
                    <Clock className="h-3 w-3" />
                    {t('scanner:realtimeFeed', 'Real-time feed')}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {scanHistory.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between px-3 py-2 bg-card rounded-lg border border-border/70 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-foreground truncate">
                          {scan.product?.name || `Barcode: ${scan.barcode}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {scan.time} • x{scan.quantity}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {scan.status === 'found' ? (
                          <span className="text-[11px] font-bold text-success font-mono">
                            {formatCurrency(scan.product?.price || 0)}
                          </span>
                        ) : scan.status === 'out_of_stock' ? (
                          <span className="text-[10px] font-semibold text-warning">
                            {t('pos:outOfStock', 'Out of Stock')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {t('scanner:unknown', 'Unknown')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  )
}

export default PhoneScannerPage
