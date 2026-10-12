import { useState, useEffect } from 'react'
import { AlertTriangle, Check, ChevronsUpDown, Loader2, PackageCheck } from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAdjustStock } from '@/features/inventory/hooks/useInventory'
import { useProducts } from '@/features/products/hooks/useProducts'
import { cn } from '@/lib/utils'

/**
 * Modal dialog for logging inventory adjustments (Restock, Damage/Waste, Physical Count Correction).
 * If `product` is provided, renders in locked/read-only mode for that specific product.
 * If `product` is omitted/null, renders a searchable product picker (Command + Popover) and disables
 * form fields until a product is selected.
 *
 * @param {object} props
 * @param {boolean} props.open - Open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {object|null} [props.product=null] - Target product to adjust
 * @param {() => void} [props.onSuccess] - Callback after successful adjustment
 */
export function AdjustStockDialog({
  open,
  onOpenChange,
  product = null,
  onSuccess,
}) {
  const [chosenProduct, setChosenProduct] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [type, setType] = useState('restock')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Query all active products when dialog is open and no specific product prop was passed
  const { data: productsRes, isLoading: isProductsLoading } = useProducts(
    { per_page: 100 },
    { enabled: open && !product },
  )
  const productList = productsRes?.data || []

  const activeProduct = product || chosenProduct

  const adjustMutation = useAdjustStock()

  useEffect(() => {
    if (open) {
      setChosenProduct(null)
      setPickerOpen(false)
      setType('restock')
      setQuantity('1')
      setNotes('')
      setErrorMsg('')
    }
  }, [open, product])

  const currentStock = Number(activeProduct?.stock_quantity || 0)
  const qtyNum = parseInt(quantity, 10) || 0

  let computedNewStock = currentStock
  if (type === 'restock') {
    computedNewStock = currentStock + qtyNum
  } else if (type === 'damage') {
    computedNewStock = currentStock - qtyNum
  } else if (type === 'correction') {
    computedNewStock = qtyNum
  }

  const isInvalidStock = activeProduct ? computedNewStock < 0 : false
  const isZeroQty = qtyNum <= 0 && type !== 'correction'
  const canSubmit = Boolean(
    activeProduct && !isInvalidStock && !isZeroQty && !adjustMutation.isPending,
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!activeProduct) {
      setErrorMsg('Pumili muna ng produkto bago mag-adjust ng stock.')
      return
    }

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
        id: activeProduct.id,
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
      title={
        activeProduct
          ? `I-adjust ang Stock: ${activeProduct.name}`
          : 'I-adjust ang Stock'
      }
      description={
        activeProduct
          ? `Kasalukuyang stock: ${currentStock} ${activeProduct.unit || 'pcs'}`
          : 'Pumili ng produkto upang i-adjust ang bilang sa imbentaryo.'
      }
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
            {activeProduct
              ? `Kumpirmahin ang Stock (${computedNewStock})`
              : 'Pumili ng Produkto'}
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

        {/* Product Selection Mode: Read-Only Header when passed, Popover Picker when absent */}
        {product ? (
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <span className="font-semibold text-foreground truncate block">
                {product.name}
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {product.sku || 'Walang SKU'}
                {product.barcode ? ` · ${product.barcode}` : ''}
              </span>
            </div>
            <Badge variant="outline" className="font-mono text-xs shrink-0 font-medium">
              Stock: {currentStock} {product.unit || 'pcs'}
            </Badge>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Pumili ng Produkto</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  aria-label="Pumili ng produkto para sa stock adjustment"
                  className="w-full justify-between h-10 text-xs font-normal"
                >
                  {chosenProduct ? (
                    <span className="truncate font-medium text-foreground">
                      {chosenProduct.name} ({chosenProduct.stock_quantity ?? 0}{' '}
                      {chosenProduct.unit || 'pcs'})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Pumili ng produkto (Maghanap ayon sa pangalan, SKU)...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] sm:w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Maghanap ng pangalan, SKU, barcode..."
                    className="text-xs"
                  />
                  <CommandList className="max-h-60">
                    <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
                      {isProductsLoading
                        ? 'Kinukuha ang mga paninda...'
                        : 'Walang nahanap na produkto.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {productList.map((p) => {
                        const isSelected = activeProduct?.id === p.id
                        return (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${p.sku || ''} ${p.barcode || ''} ${p.id}`}
                            onSelect={() => {
                              setChosenProduct(p)
                              setPickerOpen(false)
                            }}
                            className="flex items-center justify-between py-2 text-xs cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <Check
                                className={cn(
                                  'h-4 w-4 shrink-0',
                                  isSelected ? 'opacity-100 text-primary' : 'opacity-0',
                                )}
                              />
                              <div className="min-w-0">
                                <span className="font-semibold block truncate">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {p.sku || 'Walang SKU'}
                                  {p.barcode ? ` · ${p.barcode}` : ''}
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant={
                                p.stock_quantity <= (p.reorder_level || 5)
                                  ? 'warning'
                                  : 'outline'
                              }
                              className="font-mono text-[10px] shrink-0"
                            >
                              {p.stock_quantity} {p.unit || 'pcs'}
                            </Badge>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Adjustment Type Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Uri ng Pagbabago (Reason)</Label>
          <Select
            value={type}
            onValueChange={setType}
            disabled={!activeProduct}
          >
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
            {type === 'correction'
              ? 'Aktwal na Bagong Bilang ng Stock'
              : 'Dami (Quantity)'}
          </Label>
          <Input
            id="adjust-qty"
            type="number"
            min={type === 'correction' ? 0 : 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={!activeProduct}
            className="h-10 font-mono text-base md:text-sm"
            inputMode="numeric"
            autoFocus={Boolean(activeProduct)}
          />
        </div>

        {/* Live Stock Preview Card */}
        {activeProduct ? (
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Dating Stock:</span>
              <span className="font-mono font-medium">
                {currentStock} {activeProduct.unit || 'pcs'}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Pagbabago:</span>
              <span className="font-mono font-bold">
                {type === 'restock' && `+${qtyNum}`}
                {type === 'damage' && `-${qtyNum}`}
                {type === 'correction' &&
                  `${qtyNum - currentStock >= 0 ? '+' : ''}${qtyNum - currentStock}`}
              </span>
            </div>
            <div className="border-t border-border/70 pt-1.5 flex justify-between items-center font-bold">
              <span className="text-foreground">Bagong Stock:</span>
              <span
                className={`font-mono text-sm ${
                  isInvalidStock ? 'text-destructive' : 'text-primary'
                }`}
              >
                {computedNewStock} {activeProduct.unit || 'pcs'}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
            Pumili ng produkto sa itaas upang makita ang bagong kalkulasyon ng stock.
          </div>
        )}

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
            disabled={!activeProduct}
            className="h-10 text-xs"
          />
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default AdjustStockDialog
