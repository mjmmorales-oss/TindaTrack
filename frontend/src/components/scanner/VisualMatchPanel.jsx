import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useInRouterContext } from 'react-router'
import {
  AlertCircle,
  Eye,
  GraduationCap,
  HelpCircle,
  Loader2,
  ScanBarcode,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { AuthContext } from '@/context/AuthContext'
import { hasAbility } from '@/config/permissions'
import { useCameraScanner } from '@/hooks/useCameraScanner'
import { notify } from '@/lib/notify'
import { beep, vibrate } from '@/lib/feedback'
import { toImageBlob } from '@/lib/imagePrep'
import { aiService } from '@/services/aiService'
import {
  VISUAL_MODEL_ID,
  VISUAL_SIMILARITY_THRESHOLD,
  VISUAL_MARGIN_THRESHOLD,
  VISUAL_SCAN_INTERVAL_MS,
  VISUAL_ASK_AI_AFTER_MS,
} from '@/config/visual'
import {
  countIndexedProducts,
  embedImage,
  findTopMatches,
  frameSignature,
  getVisualIndex,
  getVisualModelStatus,
  hasSceneChanged,
  initVisualModel,
  invalidateVisualIndex,
  subscribeVisualIndex,
  subscribeVisualModelStatus,
} from '@/lib/visualSearch'

/**
 * Loads the taught-product index and re-loads it whenever it is invalidated.
 *
 * @returns {{ index: Array<object>, count: number|null }}
 */
function useVisualIndex() {
  const [state, setState] = useState({ index: [], count: null })

  useEffect(() => {
    let alive = true
    const load = () => {
      getVisualIndex().then((index) => {
        if (alive) setState({ index, count: countIndexedProducts(index) })
      })
    }
    load()
    const unsubscribe = subscribeVisualIndex(load)
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  return state
}

/**
 * Visual Match tab: identifies one taught product from the camera with the
 * on-device model. Shows how many products it knows (and an empty state when
 * none are taught), model download progress, skips unchanged frames, and
 * offers "Ask AI" after a few seconds without a confident match.
 *
 * @param {object} props
 * @param {Array<object>} props.products - Catalog used to resolve matched product ids
 * @param {(product: object) => void} props.onSelect - A product was picked (match or Ask AI)
 * @param {() => void} [props.onSwitchToBarcode] - Fallback when Visual Match is unavailable
 * @param {boolean} [props.aiEnabled=true] - Show the "Ask AI" fallback
 * @param {(fn: () => void) => void} [props.withConsent] - Wraps the AI call in the first-use consent
 * @param {boolean} [props.disabled=false]
 */
export function VisualMatchPanel({
  products = [],
  onSelect,
  onSwitchToBarcode,
  aiEnabled = true,
  withConsent = (fn) => fn(),
  disabled = false,
}) {
  const { t } = useTranslation(['scanner', 'common'])
  const auth = useContext(AuthContext)
  const canTeach = Boolean(auth?.user?.role && hasAbility(auth.user.role, 'products.manage'))
  const inRouter = useInRouterContext()

  const { index, count } = useVisualIndex()
  const model = useSyncExternalStore(subscribeVisualModelStatus, getVisualModelStatus)
  const hasIndex = count > 0

  const [matches, setMatches] = useState([])
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [lastVector, setLastVector] = useState(null)
  const [showTeach, setShowTeach] = useState(false)
  const [teachProduct, setTeachProduct] = useState(null)
  const [isTeaching, setIsTeaching] = useState(false)
  const [showAskAi, setShowAskAi] = useState(false)
  const [isAskingAi, setIsAskingAi] = useState(false)

  // No camera (and no loop) until there is something to match against
  const { videoRef, status: camStatus } = useCameraScanner({
    enabled: hasIndex && !disabled,
    paused: !hasIndex || disabled,
  })

  const productsRef = useRef(products)
  const indexRef = useRef(index)
  const busyRef = useRef(false)
  const lastSigRef = useRef(null)
  const lastConfidentAtRef = useRef(0)

  // Start the model download as soon as there is something to match (shows progress)
  useEffect(() => {
    if (hasIndex && !disabled) initVisualModel().catch(() => {})
  }, [hasIndex, disabled])

  useEffect(() => {
    productsRef.current = products
    indexRef.current = index
  }, [products, index])

  // Scan loop: embed only when the scene changed; paused while the tab is hidden
  useEffect(() => {
    if (!hasIndex || disabled || camStatus !== 'scanning') return undefined

    let cancelled = false
    lastConfidentAtRef.current = Date.now()
    lastSigRef.current = null

    const tick = async () => {
      if (cancelled || busyRef.current || document.hidden) return
      const video = videoRef.current
      if (!video || video.readyState < 2 || !video.videoWidth) return

      if (Date.now() - lastConfidentAtRef.current > VISUAL_ASK_AI_AFTER_MS) setShowAskAi(true)

      const side = Math.min(video.videoWidth, video.videoHeight)
      const canvas = document.createElement('canvas')
      canvas.width = 224
      canvas.height = 224
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, 224, 224)

      const sig = frameSignature(ctx)
      if (!hasSceneChanged(lastSigRef.current, sig)) return
      lastSigRef.current = sig

      busyRef.current = true
      setIsScanning(true)
      try {
        const vector = await embedImage(canvas)
        if (cancelled) return
        setLastVector(vector)
        const result = findTopMatches(vector, indexRef.current, {
          topK: 3,
          threshold: VISUAL_SIMILARITY_THRESHOLD,
          margin: VISUAL_MARGIN_THRESHOLD,
        })
        if (result.status === 'ok') {
          lastConfidentAtRef.current = Date.now()
          setShowAskAi(false)
          setMatches(
            result.matches
              .map((m) => {
                const product = productsRef.current.find((p) => Number(p.id) === Number(m.product_id))
                return product ? { ...m, product } : null
              })
              .filter(Boolean),
          )
        } else {
          setMatches([])
          // Re-check this view soon instead of waiting for movement
          lastSigRef.current = null
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Inference error')
      } finally {
        busyRef.current = false
        if (!cancelled) setIsScanning(false)
      }
    }

    const id = setInterval(tick, VISUAL_SCAN_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [hasIndex, disabled, camStatus, videoRef])

  const select = useCallback(
    (product) => {
      beep()
      vibrate()
      onSelect?.(product)
    },
    [onSelect],
  )

  // One Gemini call per tap: send the current frame and take the top matched product
  const askAi = () =>
    withConsent(async () => {
      const video = videoRef.current
      if (!video?.videoWidth) return
      setIsAskingAi(true)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        const blob = await toImageBlob(canvas)
        const res = await aiService.basketScan(blob, { capture_mode: 'manual' })
        const top = (res?.items || [])
          .filter((i) => i.matched_product_id || i.matched_product)
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0]
        const product =
          top &&
          (productsRef.current.find((p) => Number(p.id) === Number(top.matched_product_id)) ||
            top.matched_product)
        if (product) {
          select(product)
          setShowAskAi(false)
          lastConfidentAtRef.current = Date.now()
        } else {
          notify.info(t('scanner:askAiNoMatch'), t('scanner:askAiNoMatchDesc'))
        }
      } catch (err) {
        notify.error(t('scanner:aiBasketFailed'), err?.message)
      } finally {
        setIsAskingAi(false)
      }
    })

  const teach = async () => {
    if (!teachProduct || !lastVector) return
    setIsTeaching(true)
    try {
      await aiService.saveEmbedding(teachProduct.id, {
        model: VISUAL_MODEL_ID,
        source: 'correction',
        vector: lastVector,
      })
      invalidateVisualIndex()
      notify.success(t('scanner:teachPhoto'), t('scanner:teachingSuccess', { name: teachProduct.name }))
      setShowTeach(false)
      setTeachProduct(null)
    } catch (err) {
      notify.error(t('common:error'), err?.message)
    } finally {
      setIsTeaching(false)
    }
  }

  if (count === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('scanner:visualLoadingIndex')}</span>
      </div>
    )
  }

  if (!hasIndex) {
    return (
      <div className="rounded-xl border border-dashed border-border p-5 text-center space-y-3" data-testid="visual-empty">
        <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{t('scanner:visualEmptyTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('scanner:visualEmptyDesc')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {canTeach &&
            (inRouter ? (
              <Button asChild size="sm" className="h-11 gap-1.5">
                <Link to="/products">
                  <GraduationCap className="h-4 w-4" />
                  {t('scanner:visualGoTeach')}
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="h-11 gap-1.5">
                <a href="/products">
                  <GraduationCap className="h-4 w-4" />
                  {t('scanner:visualGoTeach')}
                </a>
              </Button>
            ))}
          {onSwitchToBarcode && (
            <Button type="button" variant="outline" size="sm" className="h-11 gap-1.5" onClick={onSwitchToBarcode}>
              <ScanBarcode className="h-4 w-4" />
              {t('scanner:modeBarcode')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (error || model.status === 'error') {
    return (
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-xs space-y-2">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          <span>{t('scanner:unsupportedTitle')}</span>
        </p>
        <p className="text-muted-foreground">{t('scanner:visualUnavailable')}</p>
        {onSwitchToBarcode && (
          <Button type="button" variant="outline" size="sm" onClick={onSwitchToBarcode} className="gap-1.5 text-xs">
            <ScanBarcode className="h-3.5 w-3.5" />
            <span>{t('scanner:modeBarcode')}</span>
          </Button>
        )}
      </div>
    )
  }

  const isModelLoading = model.status === 'loading' || model.status === 'idle'

  return (
    <div className="space-y-3.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5 text-primary" />
        <span>{t('scanner:visualKnowsCount', { count })}</span>
      </p>

      <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-xl border border-border bg-black shadow-sm sm:aspect-4/3">
        <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
          <div className="relative aspect-square w-48 sm:w-56 rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        </div>

        {isModelLoading && (
          <div className="absolute inset-x-4 top-4 rounded-lg bg-background/90 p-2.5 space-y-1.5 shadow" role="status">
            <p className="text-[11px] font-medium text-foreground">
              {t('scanner:visualModelLoading', { progress: model.progress || 0 })}
            </p>
            <Progress value={model.progress || 0} className="h-1.5" />
          </div>
        )}

        <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
          <div className="rounded-full bg-background/85 px-3 py-1 text-[11px] text-foreground flex items-center gap-1.5 font-medium shadow-sm">
            {isScanning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>{t('scanner:visualSearching')}</span>
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 text-primary" />
                <span>{t('scanner:modeVisual')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="space-y-2 animate-in fade-in-50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{t('scanner:topMatches')}</span>
            {canTeach && (
              <button type="button" onClick={() => setShowTeach(true)} className="text-primary hover:underline text-xs min-h-11 px-2">
                {t('scanner:notThisOne')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {matches.map((m) => (
              <button
                key={m.product_id}
                type="button"
                onClick={() => select(m.product)}
                className="flex items-center gap-3 rounded-xl border border-primary/40 bg-card p-2.5 text-left hover:border-primary hover:bg-primary/5 transition-all shadow-xs min-h-11"
              >
                <ProductThumb name={m.product?.name} imageUrl={m.product?.image_url} size="md" className="shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-foreground truncate leading-tight">{m.product?.name}</p>
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
        <div className="text-center py-1 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span>{t('scanner:visualHoldCloser')}</span>
        </div>
      )}

      {aiEnabled && showAskAi && matches.length === 0 && (
        <Button
          type="button"
          variant="secondary"
          onClick={askAi}
          disabled={isAskingAi}
          className="w-full h-11 gap-1.5"
        >
          {isAskingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
          {t('scanner:askAi')}
        </Button>
      )}

      {showTeach && (
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5 animate-in fade-in-50">
          <p className="text-xs font-semibold text-foreground">{t('scanner:pickCorrectProduct')}</p>
          <select
            className="w-full rounded-lg border border-border bg-background p-2 text-base md:text-xs min-h-11"
            value={teachProduct?.id || ''}
            onChange={(e) => setTeachProduct(products.find((p) => String(p.id) === e.target.value) || null)}
            aria-label={t('scanner:pickCorrectProduct')}
          >
            <option value="">{t('scanner:chooseProduct')}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowTeach(false)} className="h-11">
              {t('common:cancel')}
            </Button>
            <Button type="button" size="sm" disabled={!teachProduct || isTeaching} onClick={teach} className="gap-1.5 h-11">
              {isTeaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>{t('scanner:teachPhoto')}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VisualMatchPanel
