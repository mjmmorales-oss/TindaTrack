import { useState } from 'react'
import { Loader2, PackagePlus } from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdjustStock } from '@/features/inventory/hooks/useInventory'
import { notify } from '@/lib/notify'

/**
 * Bulk restock dialog for multiple running-low items.
 *
 * @param {object} props
 * @param {Array<object>} props.items - Selected products to restock
 * @param {boolean} props.open - Modal open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {() => void} [props.onSuccess] - Callback after restock completes
 */
export function BulkRestockDialog({
  items = [],
  open,
  onOpenChange,
  onSuccess,
}) {
  const [quantities, setQuantities] = useState({})
  const [defaultAddQty, setDefaultAddQty] = useState('10')
  const [notes, setNotes] = useState('Bulk restock')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const adjustMutation = useAdjustStock()

  const handleApplyToAll = () => {
    const val = parseInt(defaultAddQty, 10) || 1
    const next = {}
    items.forEach((item) => {
      next[item.id] = val
    })
    setQuantities(next)
  }

  const handleQtyChange = (id, val) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, parseInt(val, 10) || 1),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!items.length) return

    setIsSubmitting(true)
    try {
      for (const item of items) {
        const qty = quantities[item.id] || parseInt(defaultAddQty, 10) || 10
        await adjustMutation.mutateAsync({
          id: item.id,
          data: {
            type: 'restock',
            quantity: qty,
            notes: notes.trim() || 'Bulk restock delivery',
          },
        })
      }
      notify.success(
        'Matagumpay na na-restock!',
        `Naidagdag ang bagong stock sa ${items.length} mga paninda.`,
      )
      onSuccess?.()
      onOpenChange(false)
    } catch {
      // Handled by mutation toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Maramihang Pag-restock (${items.length} Items)`}
      description="Magdagdag ng bagong dating na stock sa mga napiling paninda."
      className="sm:max-w-lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Kanselahin
          </Button>
          <Button
            type="submit"
            form="bulk-restock-form"
            disabled={isSubmitting || items.length === 0}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="h-4 w-4" />
            )}
            Kumpirmahin ang Restock ({items.length})
          </Button>
        </div>
      }
    >
      <form id="bulk-restock-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Quick set for all items */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2">
          <Label className="text-xs font-semibold">
            Itakda ang Dami para sa Lahat (Quick Fill)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={defaultAddQty}
              onChange={(e) => setDefaultAddQty(e.target.value)}
              className="h-9 w-28 text-xs font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyToAll}
              className="h-9 text-xs"
            >
              Ilapat sa Lahat
            </Button>
          </div>
        </div>

        {/* Selected Items List */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Talaan ng mga Paninda at Idaragdag na Stock:
          </Label>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {items.map((item) => {
              const currentStock = item.stock_quantity ?? item.stock ?? 0
              const itemAddQty =
                quantities[item.id] !== undefined
                  ? quantities[item.id]
                  : parseInt(defaultAddQty, 10) || 10
              const projected = currentStock + itemAddQty

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2.5 text-xs bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Stock ngayon: {currentStock} → Bagong Stock: <strong>{projected}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-muted-foreground">+</span>
                    <Input
                      type="number"
                      min="1"
                      value={itemAddQty}
                      onChange={(e) => handleQtyChange(item.id, e.target.value)}
                      className="h-8 w-20 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="bulk-notes" className="text-xs font-semibold">
            Tala / Sanggunian (Opsyonal)
          </Label>
          <Input
            id="bulk-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="hal. Weekly supermarket delivery, supplier invoice #..."
            className="h-9 text-xs"
          />
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default BulkRestockDialog
