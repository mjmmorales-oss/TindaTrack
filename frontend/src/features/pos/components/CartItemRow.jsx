import { useTranslation } from 'react-i18next'
import { Trash2, Minus, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { useCartStore } from '@/stores/cartStore'
import { notify } from '@/lib/notify'

/**
 * Modern POS cart row with 48x48 packshot thumbnail, stacked unit breakdown,
 * compact quantity stepper with scale pulse, and touch swipe-to-remove with undo toast.
 *
 * @param {object} props
 * @param {object} props.item - Cart item object
 * @param {(productId: number, qty: number) => void} props.onQuantityChange - Stepper change callback
 * @param {(productId: number) => void} props.onRemove - Remove item callback
 */
export function CartItemRow({ item, onQuantityChange, onRemove }) {
  const { t } = useTranslation(['pos', 'common'])
  const isAtMaxStock = item.quantity >= (item.stock ?? 999)

  const handleRemoveWithUndo = () => {
    const removedItem = { ...item }
    onRemove?.(item.product_id)
    notify.info(
      t('pos:removedFromCart', {
        name: removedItem.name,
        defaultValue: `Removed ${removedItem.name}`,
      }),
      {
        action: {
          label: t('pos:undo', 'Undo'),
          onClick: () => {
            useCartStore.getState().add(removedItem, removedItem.quantity)
          },
        },
      },
    )
  }

  return (
    <div className="relative overflow-hidden border-b border-border/50 last:border-b-0">
      {/* Red trash background revealed on leftward swipe */}
      <div className="absolute inset-0 flex items-center justify-end bg-destructive px-4 text-destructive-foreground rounded-lg">
        <Trash2 className="h-5 w-5 animate-pulse" />
      </div>

      {/* Front draggable item row */}
      <motion.div
        layout
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_e, info) => {
          if (info.offset.x < -60 || info.velocity.x < -300) {
            handleRemoveWithUndo()
          }
        }}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative flex items-center justify-between gap-3 bg-card py-2.5 px-0.5 touch-pan-y"
      >
        {/* Left: 48x48 product thumbnail with fast fallback */}
        <ProductThumb
          name={item.name}
          imageUrl={item.image_url}
          className="h-12 w-12 rounded-lg shrink-0 object-cover"
        />

        {/* Center: Stacked Name & Price x Qty */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <h4
            className="text-foreground truncate text-sm font-medium leading-snug"
            title={item.name}
          >
            {item.name}
          </h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <Money amount={item.price} size="xs" tone="muted" />
            <span>×</span>
            <span>{item.quantity}</span>
            {item.unit && (
              <span className="text-[10px] text-muted-foreground/80">({item.unit})</span>
            )}
          </div>
        </div>

        {/* Right: Line total & compact stepper with >= 36px touch targets */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <Money
              amount={item.quantity * item.price}
              size="sm"
              className="font-bold font-mono text-foreground text-right"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveWithUndo}
              aria-label={t('pos:removeFromCartAria', {
                name: item.name,
                defaultValue: `Remove ${item.name} from cart`,
              })}
              className="text-muted-foreground hover:text-destructive h-7 w-7 rounded-md p-0 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="inline-flex items-center rounded-lg border border-input bg-background/80 p-0.5 shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={item.quantity <= 1}
              onClick={() => onQuantityChange(item.product_id, Math.max(1, item.quantity - 1))}
              className="h-7 w-7 sm:h-8 sm:w-8 min-h-[36px] min-w-[36px] text-foreground hover:bg-muted shrink-0"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>

            <motion.span
              key={item.quantity}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
              className="w-6 text-center font-mono text-xs font-bold text-foreground select-none"
            >
              {item.quantity}
            </motion.span>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isAtMaxStock}
              onClick={() => onQuantityChange(item.product_id, item.quantity + 1)}
              className="h-7 w-7 sm:h-8 sm:w-8 min-h-[36px] min-w-[36px] text-foreground hover:bg-muted shrink-0"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default CartItemRow
