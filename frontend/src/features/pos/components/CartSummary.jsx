import NumberFlow from '@number-flow/react'
import { Money } from '@/components/common/Money'

/**
 * Summary block showing item count, subtotal, and large animated total amount.
 *
 * @param {object} props
 * @param {number} props.itemCount - Total quantity of all items in cart
 * @param {number} props.total - Total currency amount
 */
export function CartSummary({ itemCount, total }) {
  return (
    <div className="space-y-3">
      {/* Subtotal & Items breakdown */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Bilang ng Paninda (Items)</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            {itemCount} {itemCount === 1 ? 'piraso' : 'piraso'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <Money amount={total} size="sm" tone="muted" />
        </div>
      </div>

      {/* Pinned Big Total */}
      <div className="border-t border-border/80 pt-2 flex items-baseline justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            KABUUANG HALAGA
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            (Total Due)
          </span>
        </div>
        <div className="flex items-baseline font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-primary tabular-nums">
          <span className="mr-0.5">₱</span>
          <NumberFlow
            value={total}
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
        </div>
      </div>
    </div>
  )
}

export default CartSummary
