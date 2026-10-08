import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2, PackageCheck } from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAdjustStock } from '@/features/inventory/hooks/useInventory'

/**
 * Modal dialog for logging inventory adjustments (Restock, Damage/Waste, Physical Count Correction).
 *
 * @param {object} props
 * @param {boolean} props.open - Open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {object|null} props.product - Target product to adjust
 * @param {() => void} [props.onSuccess] - Callback after successful adjustment
 */
export function AdjustStockDialog({
  open,
  onOpenChange,
  product = null,
  onSuccess,
}) {
  const [type, setType] = useState('restock')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const adjustMutation = useAdjustStock()

  useEffect(() => {
    if (open) {
      setType('restock')
      setQuantity('1')
      setNotes('')
      setErrorMsg('')
    }
  }, [open, product])

  if (!product) return null

  const currentStock = Number(product.stock_quantity || 0)
  const qtyNum = parseInt(quantity, 10) || 0

  let computedNewStock = currentStock
  if (type === 'restock') {
    computedNewStock = currentStock + qtyNum
  } else if (type === 'damage') {
    computedNewStock = currentStock - qtyNum
  } else if (type === 'correction') {
    computedNewStock = qtyNum
  }

  const isInvalidStock = computedNewStock < 0
  const isZeroQty = qtyNum <= 0 && type !== 'correction'
  const canSubmit = !isInvalidStock && !isZeroQty && !adjustMutation.isPending

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (computedNewStock < 0) {
      setErrorMsg('Hindi maaaring maging negatibo ang bilang ng stock.')
      return
    }

    let payloadQty = qtyNum
    let payloadType = type

    if (type === 'correction') {
      const delta = qtyNum - currentStock
      if (delta === 0) {
        setErrorMsg('Walang pagbabago sa bilang ng stock.')
        return
      }
      payloadQty = Math.abs(delta)
      payloadType = delta > 0 ? 'correction_plus' : 'correction_minus'
    }

    try {
      await adjustMutation.mutateAsync({
        id: product.id,
        data: {
          type: payloadType,
          quantity: payloadQty,
          notes: notes.trim() || undefined,
        },
      })
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          'Nabigong i-adjust ang stock.',
      )
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`I-adjust ang Stock: ${product.name}`}
      description={`Kasalukuyang stock: ${currentStock} ${product.unit || 'pcs'}`}
      className="sm:max-w-md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adjustMutation.isPending}
          >
            Kanselahin
          </Button>
          <Button
            type="submit"
            form="adjust-stock-form"
            disabled={!canSubmit}
            className="gap-1.5"
          >
            {adjustMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="h-4 w-4" />
            )}
            Kumpirmahin ang Stock ({computedNewStock})
          </Button>
        </div>
      }
    >
      <form id="adjust-stock-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Adjustment Type Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Uri ng Pagbabago (Reason)</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restock" className="text-xs">
                📦 Restock (Bagong dating na paninda)
              </SelectItem>
              <SelectItem value="damage" className="text-xs">
                ⚠️ Damage / Tapon (Sira o expire na paninda)
              </SelectItem>
              <SelectItem value="correction" className="text-xs">
                🔍 Physical Count Correction (Aktwal na bilang)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quantity Input */}
        <div className="space-y-1.5">
          <Label htmlFor="adjust-qty" className="text-xs font-semibold">
            {type === 'correction' ? 'Aktwal na Bagong Bilang ng Stock' : 'Dami (Quantity)'}
          </Label>
          <Input
            id="adjust-qty"
            type="number"
            min={type === 'correction' ? 0 : 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-10 font-mono text-base md:text-sm"
            inputMode="numeric"
            autoFocus
          />
        </div>

        {/* Live Stock Preview Card */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Dating Stock:</span>
            <span className="font-mono font-medium">{currentStock} {product.unit || 'pcs'}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Pagbabago:</span>
            <span className="font-mono font-bold">
              {type === 'restock' && `+${qtyNum}`}
              {type === 'damage' && `-${qtyNum}`}
              {type === 'correction' && `${qtyNum - currentStock >= 0 ? '+' : ''}${qtyNum - currentStock}`}
            </span>
          </div>
          <div className="border-t border-border/70 pt-1.5 flex justify-between items-center font-bold">
            <span className="text-foreground">Bagong Stock:</span>
            <span
              className={`font-mono text-sm ${
                isInvalidStock ? 'text-destructive' : 'text-primary'
              }`}
            >
              {computedNewStock} {product.unit || 'pcs'}
            </span>
          </div>
        </div>

        {isInvalidStock && (
          <p className="text-xs text-destructive font-medium">
            Hindi sapat ang stock para sa bawas na ito.
          </p>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="adjust-notes" className="text-xs font-semibold">
            Tala / Dahilan (Opsyonal)
          </Label>
          <Input
            id="adjust-notes"
            placeholder="hal. Dumating galing supermarket, Nabutas ang pakete..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-10 text-xs"
          />
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default AdjustStockDialog
