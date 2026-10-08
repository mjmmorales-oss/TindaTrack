import { useState } from 'react'
import { ShoppingCart, Trash2, ArrowRight } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { CartItemRow } from '@/features/pos/components/CartItemRow'
import { CartSummary } from '@/features/pos/components/CartSummary'

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
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const isEmpty = items.length === 0

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-[90dvh] flex-col">
          {/* Header */}
          <DrawerHeader className="border-b border-border px-4 py-3 text-left flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <DrawerTitle className="text-base font-bold text-foreground">
                Talaan ng Benta (Cart)
              </DrawerTitle>
              <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                {itemCount}
              </Badge>
            </div>

            {!isEmpty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setClearDialogOpen(true)}
                className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Linisin
              </Button>
            )}
          </DrawerHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {isEmpty ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Walang laman ang cart.
              </div>
            ) : (
              items.map((item) => (
                <CartItemRow
                  key={item.product_id}
                  item={item}
                  onQuantityChange={onQuantityChange}
                  onRemove={onRemove}
                />
              ))
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
              <span>Bayaran (Proceed to Pay)</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title="I-clear ang cart?"
        description="Mawawala ang lahat ng paninda na kasalukuyang nakalista sa cart."
        confirmText="Oo, Linisin"
        cancelText="Huwag"
        tone="destructive"
        onConfirm={() => {
          onClear?.()
          setClearDialogOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}

export default CartDrawer
