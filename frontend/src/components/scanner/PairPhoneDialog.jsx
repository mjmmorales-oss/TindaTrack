import { useState, useEffect, useRef, useCallback } from 'react'
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
import { createScannerSession, getScannerSession } from '@/services/scanner.js'
import { notify } from '@/lib/notify'

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
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [pairedDevice, setPairedDevice] = useState(null)
  const [copied, setCopied] = useState(false)

  const pollingRef = useRef(null)
  const timerRef = useRef(null)

  const publicAppUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL) ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  const isLocalhost =
    typeof publicAppUrl === 'string' &&
    /localhost|127\.0\.0\.1/.test(publicAppUrl)

  const startNewSession = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setPairedDevice(null)
    try {
      const res = await createScannerSession({ mode })
      setSession(res)
      if (res?.pairing_expires_at) {
        const diff = Math.max(
          0,
          Math.floor((new Date(res.pairing_expires_at).getTime() - Date.now()) / 1000),
        )
        setTimeLeft(diff)
      } else {
        setTimeLeft(600)
      }
    } catch (err) {
      setError(err?.message || 'Hindi nakagawa ng bagong session.')
    } finally {
      setIsLoading(false)
    }
  }, [mode])

  // Create session on open
  useEffect(() => {
    if (open) {
      startNewSession()
    } else {
      setSession(null)
      setPairedDevice(null)
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [open, startNewSession])

  // Countdown timer
  useEffect(() => {
    if (!open || !session || pairedDevice) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [open, session, pairedDevice])

  // Status polling every 2s
  useEffect(() => {
    if (!open || !session?.id || pairedDevice) return

    pollingRef.current = setInterval(async () => {
      try {
        const status = await getScannerSession(session.id)
        if (status?.paired) {
          setPairedDevice(status.device_label || 'Phone')
          clearInterval(pollingRef.current)
          notify.success('Nakakonekta na!', `Phone: ${status.device_label || 'Phone'}`)
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
  }, [open, session, pairedDevice, onPaired])

  const pairingCode = session?.pairing_code || '----'
  const scanUrl = session
    ? `${publicAppUrl}/scan?code=${encodeURIComponent(session.pairing_code)}`
    : ''

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`

  const handleCopyCode = async () => {
    if (!session?.pairing_code) return
    try {
      await navigator.clipboard.writeText(session.pairing_code)
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
      title="Ikonekta ang Phone bilang Barcode Scanner"
      description="Gamitin ang camera ng smartphone para mag-scan ng paninda nang wireless."
      className="max-w-md"
    >
      <div className="space-y-4 py-2">
        {isLocalhost && (
          <Alert variant="warning" className="border-warning/40 bg-warning/10 text-xs">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <AlertDescription className="text-warning-foreground font-medium">
              Nasa <strong>localhost</strong> ka. Hindi ito mabubuksan ng camera ng phone sa parehong Wi-Fi.
              Patakbuhin ang <code className="bg-muted px-1 py-0.5 rounded">npm run dev:lan</code> sa terminal o gamitin ang deployed link.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="text-xs">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {pairedDevice ? (
          <div className="flex flex-col items-center justify-center p-6 bg-success/10 border border-success/30 rounded-xl text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-success/20 text-success flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="font-bold text-foreground text-base">Nakakonekta na!</p>
              <p className="text-sm text-muted-foreground">
                Device: <span className="font-semibold text-foreground">{pairedDevice}</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Maaari mo nang simulan ang pag-scan ng mga paninda sa phone. Kusa itong papasok dito sa POS terminal.
            </p>
            <Button
              type="button"
              className="mt-2 w-full"
              onClick={() => onOpenChange(false)}
            >
              Simulan ang Pagtitinda
            </Button>
          </div>
        ) : (
          <>
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl border border-border/80">
              {session && scanUrl ? (
                <div className="p-3 bg-white rounded-lg shadow-xs">
                  <QRCodeSVG
                    value={scanUrl}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              ) : (
                <div className="h-44 w-44 flex items-center justify-center text-muted-foreground">
                  <QrCode className="h-10 w-10 animate-pulse" />
                </div>
              )}

              {/* Pairing Code Display */}
              <div className="mt-4 flex flex-col items-center gap-1.5 w-full">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  O ilagay ang code na ito sa /scan
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
                    title="Kopyahin ang code"
                    aria-label="Kopyahin ang code"
                  >
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Steps Guide */}
            <div className="text-xs space-y-1.5 text-muted-foreground bg-card p-3 rounded-lg border border-border">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Mga Hakbang:</p>
              <p>1. Buksan ang camera ng iyong phone.</p>
              <p>2. I-scan ang QR code sa itaas (o pumunta sa <code className="font-mono bg-muted px-1 rounded">/scan</code>).</p>
              <p>3. Simulan ang pag-scan ng mga produkto!</p>
            </div>

            {/* Expiry & Refresh */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {timeLeft > 0 ? (
                  <>
                    Mapapaso sa loob ng: <strong className="text-foreground font-mono">{formattedTime}</strong>
                  </>
                ) : (
                  <span className="text-destructive font-semibold">Paso na ang code</span>
                )}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startNewSession}
                disabled={isLoading}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Bagong code
              </Button>
            </div>
          </>
        )}
      </div>
    </ResponsiveDialog>
  )
}

export default PairPhoneDialog
