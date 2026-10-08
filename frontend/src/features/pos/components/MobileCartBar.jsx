import { ShoppingBag, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/common/Money'

/**
 * Bottom sticky cart bar for mobile & tablet (< lg).
 * Hidden when cart is empty.
 *
 * @param {object} props
 * @param {number} props.itemCount - Total items in cart
 * @param {number} props.total - Total cart amount
 * @param {() => void} props.onOpenDrawer - Open cart drawer callback
 * @param {() => void} props.onOpenPayment - Open payment dialog directly
 */
export function MobileCartBar({
  itemCount = 0,
  total = 0,
  onOpenDrawer,
  onOpenPayment,
}) {
  if (itemCount <= 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md lg:hidden print:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        {/* Tappable summary triggering drawer */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none cursor-pointer"
          aria-label={`Buksan ang cart na may ${itemCount} items na nagkakahalaga ng ₱${total.toFixed(2)}`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-foreground truncate">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
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
              <span>Tingnan ang listahan</span>
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
          Bayaran (Pay)
        </Button>
      </div>
    </div>
  )
}

export default MobileCartBar
