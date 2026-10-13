import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Trash2, ArrowRight, Pause } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Kbd } from '@/components/ui/kbd'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { CartItemRow } from '@/features/pos/components/CartItemRow'
import { CartSummary } from '@/features/pos/components/CartSummary'
import { HeldCartsDialog } from '@/features/pos/components/HeldCartsDialog'
import { useCartStore } from '@/stores/cartStore'
import { notify } from '@/lib/notify'

/**
 * Desktop right-side cart panel (~380px fixed width).
 *
 * @param {object} props
 * @param {Array<object>} props.items - Cart items
 * @param {number} props.itemCount - Total item count
 * @param {number} props.total - Total cart value
 * @param {(productId: number, qty: number) => void} props.onQuantityChange - Change item quantity
 * @param {(productId: number) => void} props.onRemove - Remove single item
 * @param {() => void} props.onClear - Clear entire cart
 * @param {() => void} props.onOpenPayment - Open checkout/payment modal
 */
export function CartPanel({
  items = [],
  itemCount = 0,
  total = 0,
  onQuantityChange,
  onRemove,
  onClear,
  onOpenPayment,
}) {
  const { t } = useTranslation(['pos', 'common'])
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [heldDialogOpen, setHeldDialogOpen] = useState(false)
  const isEmpty = items.length === 0

  const heldCarts = useCartStore((state) => state.heldCarts)
  const holdCurrentCart = useCartStore((state) => state.holdCurrentCart)

  const handleHoldCart = () => {
    if (heldCarts.length >= 3) {
      notify.warning(t('pos:heldSlotsFull', 'Hold slots are full. Up to 3 sales can be parked.'))
      return
    }
    const success = holdCurrentCart()
    if (success) {
      notify.success(t('pos:cartHeldSuccess', 'Sale held successfully.'))
    }
  }

  return (
    <>
      <aside className="w-[380px] shrink-0 border-l border-border bg-card flex flex-col h-full overflow-hidden select-none">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0 bg-card/95">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {t('pos:cartTitle', 'Cart')}
            </h2>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
              {itemCount}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {heldCarts.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHeldDialogOpen(true)}
                className="h-8 px-2 text-xs gap-1 border-warning/40 text-warning hover:bg-warning/10"
                aria-label={t('pos:heldCarts', 'Parked Sales')}
              >
                <Pause className="h-3.5 w-3.5" />
                <Badge variant="secondary" className="bg-warning/20 text-warning px-1 py-0 text-[10px]">
                  {heldCarts.length}
                </Badge>
              </Button>
            )}

            {!isEmpty && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleHoldCart}
                  disabled={heldCarts.length >= 3}
                  className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs gap-1"
                  title={t('pos:holdCart', 'Hold')}
                  aria-label={t('pos:holdCart', 'Hold')}
                >
                  <Pause className="h-3.5 w-3.5" />
                  {t('pos:holdCart', 'Hold')}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setClearDialogOpen(true)}
                  className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs gap-1"
                  aria-label={t('pos:clearCart', 'Clear')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('pos:clearCart', 'Clear')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Cart Items */}
        <div className="flex-1 overflow-hidden">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
                <ShoppingCart className="h-7 w-7 opacity-40" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t('pos:cartEmptyTitle', 'Your cart is empty')}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                {t('pos:cartEmptyDesc', 'Scan a barcode or click a product to add it to this sale.')}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full px-4">
              <div className="py-2">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <CartItemRow
                      key={item.product_id}
                      item={item}
                      onQuantityChange={onQuantityChange}
                      onRemove={onRemove}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Pinned Bottom Summary & Checkout Button */}
        <div className="border-t border-border bg-card p-4 space-y-4 shrink-0 shadow-sm">
          <CartSummary itemCount={itemCount} total={total} />

          <Button
            type="button"
            size="lg"
            disabled={isEmpty}
            onClick={onOpenPayment}
            className="w-full h-12 text-base font-bold gap-2 shadow-md"
          >
            <span>{t('pos:payButton', 'Pay')}</span>
            <ArrowRight className="h-4 w-4" />
            <Kbd className="ml-auto bg-primary-foreground/20 text-primary-foreground text-[10px]">
              F9
            </Kbd>
          </Button>
        </div>
      </aside>

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title={t('pos:clearCartTitle', 'Clear Current Cart?')}
        description={t('pos:clearCartMessage', 'All items currently in the cart will be removed.')}
        confirmText={t('pos:clearConfirm', 'Yes, Clear')}
        cancelText={t('pos:clearCancel', 'Cancel')}
        tone="destructive"
        onConfirm={() => {
          onClear?.()
          setClearDialogOpen(false)
        }}
      />

      <HeldCartsDialog
        open={heldDialogOpen}
        onOpenChange={setHeldDialogOpen}
      />
    </>
  )
}

export default CartPanel
