import { useCallback, useEffect, useRef, useState } from 'react'
import { mergeIntoDraft, toReviewDraft } from '@/features/pos/lib/basketReview'

export const PENDING_BASKET_KEY = 'tt.pos.pendingBasket'

function readStored() {
  try {
    const raw = sessionStorage.getItem(PENDING_BASKET_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStored(pending) {
  try {
    if (!pending) {
      sessionStorage.removeItem(PENDING_BASKET_KEY)
      return
    }
    // blob: URLs die with the page; only data: previews (phone scans) survive a reload
    const imageSrc = typeof pending.imageSrc === 'string' && pending.imageSrc.startsWith('data:') ? pending.imageSrc : null
    sessionStorage.setItem(PENDING_BASKET_KEY, JSON.stringify({ ...pending, imageSrc }))
  } catch {
    // storage full / private mode: the in-memory copy still works
  }
}

/**
 * The AI Basket review the cashier is working on. It survives the sheet closing,
 * the page unmounting and a reload (sessionStorage), so a scan is never lost
 * before Add to Cart or an explicit Discard. A basket that arrives while a review
 * is open is held as `incoming` instead of replacing the cashier's edits.
 *
 * @param {{ onFinished?: (pending: object) => void }} [options] - called after Add to Cart / Discard / Scan again
 */
export function usePendingBasket({ onFinished } = {}) {
  const [pending, setPending] = useState(readStored)
  const [isOpen, setIsOpen] = useState(false)
  const [incoming, setIncoming] = useState(null)
  const onFinishedRef = useRef(onFinished)

  useEffect(() => {
    onFinishedRef.current = onFinished
  }, [onFinished])

  useEffect(() => {
    writeStored(pending)
  }, [pending])

  /** A new scan result (laptop, scanner sheet or phone). */
  const receive = useCallback(
    (result, imageSrc = null, source = 'laptop') => {
      // Never replace a review in progress (open, or closed but not finished): ask instead
      if (pending) {
        setIncoming({ result, imageSrc, source })
        setIsOpen(true)
        return
      }
      setPending({ key: `b${Date.now()}`, result, imageSrc: imageSrc || result?.preview_data_url || null, source, draft: toReviewDraft(result) })
      setIncoming(null)
      setIsOpen(true)
    },
    [pending],
  )

  /** Scan again → "Add to current items": merge into the cashier's draft. */
  const mergeScan = useCallback((result, imageSrc = null) => {
    setPending((prev) =>
      prev
        ? { ...prev, key: `b${Date.now()}`, result, imageSrc: imageSrc || prev.imageSrc, draft: mergeIntoDraft(prev.draft, result) }
        : { key: `b${Date.now()}`, result, imageSrc, source: 'laptop', draft: toReviewDraft(result) },
    )
    setIsOpen(true)
  }, [])

  const setDraft = useCallback((draft) => {
    setPending((prev) => (prev ? { ...prev, draft } : prev))
  }, [])

  /** Banner choice for a basket that arrived while reviewing. */
  const resolveIncoming = useCallback(
    (action) => {
      if (!incoming) return
      if (action === 'replace') {
        setPending({
          key: `b${Date.now()}`,
          result: incoming.result,
          imageSrc: incoming.imageSrc || incoming.result?.preview_data_url || null,
          source: incoming.source,
          draft: toReviewDraft(incoming.result),
        })
      } else if (action === 'add') {
        setPending((prev) => ({ ...prev, key: `b${Date.now()}`, draft: mergeIntoDraft(prev?.draft, incoming.result) }))
      }
      setIncoming(null)
    },
    [incoming],
  )

  /** Add to Cart, Discard, or Scan again (replace): the review is over. */
  const finish = useCallback(() => {
    const done = pending
    setPending(null)
    setIncoming(null)
    setIsOpen(false)
    if (done) onFinishedRef.current?.(done)
  }, [pending])

  return {
    pending,
    incoming,
    isOpen,
    receive,
    mergeScan,
    setDraft,
    resolveIncoming,
    finish,
    open: () => pending && setIsOpen(true),
    hide: () => setIsOpen(false),
  }
}

export default usePendingBasket
