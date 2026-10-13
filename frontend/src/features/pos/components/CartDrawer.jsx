import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Trash2, ArrowRight, Pause } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { CartItemRow } from '@/features/pos/components/CartItemRow'
import { CartSummary } from '@/features/pos/components/CartSummary'
import { HeldCartsDialog } from '@/features/pos/components/HeldCartsDialog'
import { useCartStore } from '@/stores/cartStore'
import { notify } from '@/lib/notify'

/**
 * Mobile drawer for displaying full cart items, quantity adjustments, and checkout trigger.
 *
 * @param {object} props
 * @param {boolean} props.open - Open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {Array<object>} props.items - Cart items
 * @param {number} props.itemCount - Total item count
 * @param {number} props.total - Total cart value
 * @param {(productId: number, qty: number) => void} props.onQuantityChange - Change item quantity
 * @param {(productId: number) => void} props.onRemove - Remove single item
 * @param {() => void} props.onClear - Clear entire cart
 * @param {() => void} props.onOpenPayment - Open checkout/payment modal
 */
export function CartDrawer({
  open,
  onOpenChange,
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
      onOpenChange(false)
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-[90dvh] flex-col">
          {/* Header */}
          <DrawerHeader className="border-b border-border px-4 py-3 text-left flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <DrawerTitle className="text-base font-bold text-foreground">
                {t('pos:cartTitle', 'Cart')}
              </DrawerTitle>
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
          </DrawerHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {isEmpty ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                {t('pos:cartEmptyTitle', 'Your cart is empty')}
              </div>
            ) : (
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
            )}
          </div>

          {/* Footer with summary and Pay button */}
          <DrawerFooter className="border-t border-border bg-card px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3">
            <CartSummary itemCount={itemCount} total={total} />

            <Button
              type="button"
              size="lg"
              disabled={isEmpty}
              onClick={() => {
                onOpenChange(false)
                onOpenPayment()
              }}
              className="h-12 w-full text-base font-bold gap-2 shadow-md"
            >
              <span>{t('pos:payButton', 'Pay')}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
          onOpenChange(false)
        }}
      />

      <HeldCartsDialog
        open={heldDialogOpen}
        onOpenChange={setHeldDialogOpen}
      />
    </>
  )
}

export default CartDrawer
