import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/forms/QuantityStepper'
import { Money } from '@/components/common/Money'
import { cn } from '@/lib/utils'

/**
 * Single line item in the POS cart with quantity controls and stock warnings.
 *
 * @param {object} props
 * @param {object} props.item - Cart item object
 * @param {(productId: number, qty: number) => void} props.onQuantityChange - Stepper change callback
 * @param {(productId: number) => void} props.onRemove - Remove item callback
 */
export function CartItemRow({ item, onQuantityChange, onRemove }) {
  const isAtMaxStock = item.quantity >= item.stock
  const stockHint = isAtMaxStock ? `Natira: ${item.stock} ${item.unit || 'pc'}` : undefined

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-3 last:border-b-0">
      {/* Item info */}
      <div className="min-w-0 flex-1 space-y-1">
        <h4 className="text-foreground line-clamp-2 text-xs font-semibold leading-tight sm:text-sm">
          {item.name}
        </h4>
        <div className="flex items-center gap-2 text-xs">
          <Money amount={item.price} size="xs" tone="muted" />
          <span className="text-muted-foreground/60 text-[10px]">·</span>
          <span className="text-muted-foreground text-[10px] font-mono">
            {item.sku || 'SKU'}
          </span>
        </div>

        {/* Stepper */}
        <div className="pt-1.5">
          <QuantityStepper
            value={item.quantity}
            min={1}
            max={item.stock}
            onChange={(qty) => onQuantityChange(item.product_id, qty)}
            stockHint={stockHint}
            className="scale-95 origin-left"
          />
        </div>
      </div>

      {/* Line total & remove button */}
      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.product_id)}
          aria-label={`Tanggalin ang ${item.name} sa cart`}
          className="text-muted-foreground hover:text-destructive h-7 w-7 rounded-md p-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <Money
          amount={item.quantity * item.price}
          size="sm"
          tone="default"
          className="font-bold font-mono text-right"
        />
      </div>
    </div>
  )
}

export default CartItemRow
