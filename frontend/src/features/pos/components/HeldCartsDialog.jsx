import { useState } from 'react'
import { Pause, Play, Trash2, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Money } from '@/components/common/Money'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { useCartStore } from '@/stores/cartStore'
import { formatTime } from '@/lib/format'
import { notify } from '@/lib/notify'

export function HeldCartsDialog({ open, onOpenChange }) {
  const heldCarts = useCartStore((state) => state.heldCarts)
  const restoreHeldCart = useCartStore((state) => state.restoreHeldCart)
  const discardHeldCart = useCartStore((state) => state.discardHeldCart)

  const [discardTarget, setDiscardTarget] = useState(null)

  const handleResume = (id) => {
    restoreHeldCart(id)
    onOpenChange(false)
    notify.success('Naibalik ang naka-hold na benta sa cart.')
  }

  const handleConfirmDiscard = () => {
    if (discardTarget) {
      discardHeldCart(discardTarget.id)
      setDiscardTarget(null)
      notify.info('Tinapon ang naka-hold na benta.')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pause className="h-4 w-4 text-warning" />
              Mga Naka-hold na Benta (Parked Sales)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Maaaring mag-hold ng hanggang 3 benta habang naghihintay ang kustomer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {heldCarts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Walang kasalukuyang naka-hold na benta.
              </div>
            ) : (
              heldCarts.map((cart, index) => (
                <div
                  key={cart.id}
                  className="rounded-lg border border-border p-3.5 space-y-2.5 bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        Slot #{index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(cart.savedAt)}
                      </span>
                    </div>
                    <Money amount={cart.total} size="sm" className="font-bold font-mono" />
                  </div>

                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {cart.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDiscardTarget(cart)}
                      className="text-muted-foreground hover:text-destructive h-8 px-2.5 text-xs gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Itapon
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleResume(cart.id)}
                      className="h-8 px-3 text-xs gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Ibalik sa Cart
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!discardTarget}
        onOpenChange={(isOpen) => !isOpen && setDiscardTarget(null)}
        title="Itapon ang Naka-hold na Benta?"
        description="Mawawala ang mga inilistang paninda sa slot na ito. Hindi na ito maibabalik."
        confirmText="Oo, Itapon"
        cancelText="Kanselahin"
        tone="destructive"
        onConfirm={handleConfirmDiscard}
      />
    </>
  )
}

export default HeldCartsDialog
