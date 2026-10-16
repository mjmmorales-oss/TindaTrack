import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingBag, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/common/Money'
import { ProductThumb } from '@/components/common/ProductThumb'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { useOverlayStore } from '@/stores/overlayStore'
import { useCartStore } from '@/stores/cartStore'

/**
 * Bottom sticky cart bar for mobile & tablet (< lg) with overlapping mini item packshots.
 * Hidden when cart is empty, when keyboard is open, or when any modal/drawer is open.
 *
 * @param {object} props
 * @param {number} props.itemCount - Total items in cart
 * @param {number} props.total - Total cart amount
 * @param {Array<object>} [props.items] - Optional cart items override
 * @param {() => void} props.onOpenDrawer - Open cart drawer callback
 * @param {() => void} props.onOpenPayment - Open payment dialog directly
 */
export function MobileCartBar({
  itemCount = 0,
  total = 0,
  items: itemsProp,
  onOpenDrawer,
  onOpenPayment,
}) {
  const { t } = useTranslation(['pos', 'common'])
  const isAnyModalOpen = useOverlayStore((s) => s.activeModalCount > 0)
  const { isKeyboardOpen: isKeyboardFromHook } = useVisualViewport()
  const storeItems = useCartStore((s) => s.items)
  const cartItems = itemsProp ?? storeItems
  const previewItems = cartItems.slice(0, 3)

  const [isKeyboardFromDataset, setIsKeyboardFromDataset] = useState(() => {
    return (
      typeof document !== 'undefined' &&
      document.documentElement.dataset.keyboard === 'open'
    )
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const check = () => {
      setIsKeyboardFromDataset(document.documentElement.dataset.keyboard === 'open')
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-keyboard'],
    })
    return () => observer.disconnect()
  }, [])

  const isHidden = isKeyboardFromHook || isKeyboardFromDataset || isAnyModalOpen

  if (itemCount <= 0 || isHidden) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md lg:hidden print:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        {/* Tappable summary triggering drawer */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none cursor-pointer"
          aria-label={t('pos:viewCartList', 'View cart list')}
        >
          {/* Overlapping thumbnail previews or fallback bag icon */}
          <div className="relative flex items-center shrink-0">
            {previewItems.length > 0 ? (
              <div className="flex -space-x-2.5 overflow-hidden py-0.5">
                {previewItems.map((item, idx) => (
                  <ProductThumb
                    key={item.product_id || idx}
                    name={item.name}
                    imageUrl={item.image_url}
                    size="sm"
                    className="h-9 w-9 rounded-full ring-2 ring-background shrink-0 shadow-xs"
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-foreground truncate">
                {itemCount} {itemCount === 1 ? t('pos:pieces', 'item') : t('pos:piecesPlural', 'items')}
              </span>
              <span className="text-muted-foreground/60 text-xs">·</span>
              <Money
                amount={total}
                size="sm"
                tone="default"
                className="font-bold font-mono text-primary"
              />
            </div>
            <div className="flex items-center text-[10px] text-muted-foreground gap-0.5">
              <span>{t('pos:viewCartList', 'View cart list')}</span>
              <ChevronUp className="h-3 w-3" />
            </div>
          </div>
        </button>

        {/* Quick Pay CTA Button */}
        <Button
          type="button"
          size="sm"
          onClick={onOpenPayment}
          className="h-10 px-5 text-sm font-bold shadow-md shrink-0"
        >
          {t('pos:payButton', 'Pay')}
        </Button>
      </div>
    </div>
  )
}

export default MobileCartBar
