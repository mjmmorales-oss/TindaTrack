import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import {
  Smartphone,
  QrCode,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  createScannerSession,
  getScannerSession,
  endScannerSession,
} from '@/services/scanner.js'
import { notify } from '@/lib/notify'
import { getApiBaseUrl } from '@/lib/api'

/**
 * PairPhoneDialog
 * Generates an ephemeral scanner session with QR code & pairing code
 * for phone-to-POS real-time scanning.
 */
export function PairPhoneDialog({
  open,
  onOpenChange,
  onPaired,
  mode = 'pos',
}) {
  const { t } = useTranslation(['scanner', 'common'])
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [pairedDevice, setPairedDevice] = useState(null)
  const [copied, setCopied] = useState(false)

  const pollingRef = useRef(null)
  const timerRef = useRef(null)
  const hasCreatedForOpenRef = useRef(false)
  const activeSessionRef = useRef(null)
  const isPairedRef = useRef(false)
  const isCreatingRef = useRef(false)

  const publicAppUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL) ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  const isLocalhostOrigin =
    typeof publicAppUrl === 'string' &&
    /localhost|127\.0\.0\.1/.test(publicAppUrl)

  const apiBase = getApiBaseUrl()
  const isApiLocalhost =
    typeof apiBase === 'string' && /localhost|127\.0\.0\.1/.test(apiBase)
  const isApiMismatch = !isLocalhostOrigin && isApiLocalhost

  const startNewSession = useCallback(
    async (isManualRefresh = false) => {
      if (isCreatingRef.current) return
      isCreatingRef.current = true
      setIsLoading(true)
      setError(null)
      setPairedDevice(null)
      isPairedRef.current = false

      // If replacing an active un-paired session, end it on the server
      if (activeSessionRef.current?.id) {
        const oldId = activeSessionRef.current.id
        activeSessionRef.current = null
        endScannerSession(oldId).catch(() => {})
      }

      try {
        const raw = await createScannerSession({ mode })
        const res = raw?.data ?? raw

        if (!res?.pairing_code || !res?.id) {
          throw new Error('Walang pairing code na ibinalik ang server.')
        }

        setSession(res)
        activeSessionRef.current = res

        if (res?.pairing_expires_at) {
          const diff = Math.max(
            0,
            Math.floor((new Date(res.pairing_expires_at).getTime() - Date.now()) / 1000),
          )
          setTimeLeft(diff)
        } else {
          setTimeLeft(null)
        }
      } catch (err) {
        if (import.meta.env?.DEV) {
          console.error(
            '[PairPhoneDialog] createScannerSession error:',
            err?.status,
            err?.message,
            err,
          )
        }
        setSession(null)
        setTimeLeft(null)
        activeSessionRef.current = null
        const statusText = err?.status ? ` (HTTP ${err.status})` : ''
        setError(`Hindi makagawa ng code: ${err?.message || 'Network error'}${statusText}`)
      } finally {
        setIsLoading(false)
        isCreatingRef.current = false
      }
    },
    [mode],
  )

  // Single session creation per dialog open (StrictMode-safe)
  useEffect(() => {
    if (open) {
      if (!hasCreatedForOpenRef.current) {
        hasCreatedForOpenRef.current = true
        startNewSession()
      }
    } else {
      hasCreatedForOpenRef.current = false
      if (activeSessionRef.current?.id && !isPairedRef.current) {
        const toEnd = activeSessionRef.current
        activeSessionRef.current = null
        endScannerSession(toEnd.id).catch(() => {})
      }
      setSession(null)
      setPairedDevice(null)
      setTimeLeft(null)
      setError(null)
      setIsLoading(false)
      isPairedRef.current = false
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [open, startNewSession])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (activeSessionRef.current?.id && !isPairedRef.current) {
        endScannerSession(activeSessionRef.current.id).catch(() => {})
      }
    }
  }, [])

  // Countdown timer derived strictly from server expiry
  useEffect(() => {
    if (!open || !session || pairedDevice || timeLeft === null) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(timerRef.current)
          startNewSession(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [open, session, pairedDevice, timeLeft, startNewSession])

  // Status polling every 2s
  useEffect(() => {
    const sessionId = session?.id || session?.data?.id
    if (!open || !sessionId || pairedDevice) return

    pollingRef.current = setInterval(async () => {
      try {
        const res = await getScannerSession(sessionId)
        const status = res?.data ?? res
        if (status?.paired) {
          isPairedRef.current = true
          setPairedDevice(status.device_label || 'Phone')
          clearInterval(pollingRef.current)
          notify.success(t('scanner:connectedTitle', 'Connected!'), `Phone: ${status.device_label || 'Phone'}`)
          onPaired?.({
            ...session,
            device_label: status.device_label,
          })
        }
      } catch {
        // ignore polling errors
      }
    }, 2000)

    return () => clearInterval(pollingRef.current)
  }, [open, session, pairedDevice, onPaired, t])

  const pairingCode = session?.pairing_code || session?.data?.pairing_code || ''
  const scanUrl =
    session && pairingCode
      ? `${publicAppUrl}/scan?code=${encodeURIComponent(pairingCode)}`
      : ''

  const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : 0
  const seconds = timeLeft !== null ? timeLeft % 60 : 0
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`

  const handleCopyCode = async () => {
    if (!pairingCode) return
    try {
      await navigator.clipboard.writeText(pairingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('scanner:connectPhoneTitle', 'Connect Phone as Barcode Scanner')}
      description={t('scanner:connectPhoneDesc', 'Use your smartphone camera to scan products wirelessly.')}
      className="max-w-md"
    >
      <div className="space-y-4 py-2">
        {isLocalhostOrigin && (
          <Alert variant="warning" className="border-warning/40 bg-warning/10 text-xs">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <AlertDescription className="text-warning-foreground font-medium">
              Nasa <strong>localhost</strong> ka. Hindi ito mabubuksan ng camera ng phone sa parehong Wi-Fi.
              Patakbuhin ang <code className="bg-muted px-1 py-0.5 rounded">npm run dev:lan</code> sa terminal o gamitin ang deployed link.
            </AlertDescription>
          </Alert>
        )}

        {isApiMismatch && (
          <Alert variant="destructive" className="text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <AlertDescription className="font-medium">
              Naka-set ang API base sa <strong>localhost</strong> habang binubuksan mo ang app sa LAN.
              Hindi maaabot ng phone ang server kung localhost ang API. Patakbuhin ang{' '}
              <code className="bg-muted px-1 py-0.5 rounded">npm run dev:lan</code>.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl space-y-3 text-center">
            <div className="text-destructive font-semibold text-sm">
              {error}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('scanner:sessionCreationError', 'Could not create pairing code. Ensure the backend server is running.')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startNewSession(true)}
              className="gap-2 mx-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('scanner:tryAgain', 'Try again')}
            </Button>
          </div>
        )}

        {isLoading && !session && !error && (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/40 rounded-xl border border-border/80 space-y-3">
            <div className="h-40 w-40 bg-muted/80 rounded-lg animate-pulse flex items-center justify-center text-muted-foreground">
              <QrCode className="h-10 w-10 animate-spin" />
            </div>
            <div className="h-6 w-36 bg-muted/80 rounded-md animate-pulse mt-2" />
            <p className="text-xs text-muted-foreground">
              {t('scanner:creatingSession', 'Creating new session...')}
            </p>
          </div>
        )}

        {pairedDevice ? (
          <div className="flex flex-col items-center justify-center p-6 bg-success/10 border border-success/30 rounded-xl text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-success/20 text-success flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="font-bold text-foreground text-base">
                {t('scanner:connectedTitle', 'Connected!')}
              </p>
              <p className="text-sm text-muted-foreground">
                Device: <span className="font-semibold text-foreground">{pairedDevice}</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              {t('scanner:connectedDesc', 'You can now scan products on your phone. They will automatically appear in this POS terminal.')}
            </p>
            <Button
              type="button"
              className="mt-2 w-full"
              onClick={() => onOpenChange(false)}
            >
              {t('scanner:startSelling', 'Start Selling')}
            </Button>
          </div>
        ) : session && pairingCode ? (
          <>
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl border border-border/80">
              <div className="p-3 bg-white rounded-lg shadow-xs">
                <QRCodeSVG
                  value={scanUrl}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Pairing Code Display */}
              <div className="mt-4 flex flex-col items-center gap-1.5 w-full">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t('scanner:orEnterCodeAt', 'Or enter this code at /scan')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-foreground select-all bg-background px-3 py-1 rounded-md border border-border">
                    {pairingCode}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={handleCopyCode}
                    title={t('scanner:copyCode', 'Copy code')}
                    aria-label={t('scanner:copyCode', 'Copy code')}
                  >
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Steps Guide */}
            <div className="text-xs space-y-1.5 text-muted-foreground bg-card p-3 rounded-lg border border-border">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                {t('scanner:stepsTitle', 'Steps:')}
              </p>
              <p>{t('scanner:stepOpenPhone', '1. Open your phone camera.')}</p>
              <p>{t('scanner:stepScanQr', '2. Scan the QR code above (or visit /scan).')}</p>
              <p>{t('scanner:stepStartScanning', '3. Start scanning products!')}</p>
            </div>

            {/* Expiry & Refresh */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {timeLeft !== null && timeLeft > 0 ? (
                  <>
                    {t('scanner:expiresIn', 'Expires in:')} <strong className="text-foreground font-mono">{formattedTime}</strong>
                  </>
                ) : (
                  <span className="text-destructive font-semibold">
                    {t('scanner:codeExpired', 'Code expired')}
                  </span>
                )}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => startNewSession(true)}
                disabled={isLoading}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {t('scanner:newCode', 'New code')}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}

export default PairPhoneDialog
