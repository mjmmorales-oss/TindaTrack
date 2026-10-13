import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, ChevronsUpDown, Loader2, PackageCheck, ScanBarcode } from 'lucide-react'

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
import { ScannerSheet } from '@/components/scanner/ScannerSheet'
import { useAdjustStock } from '@/features/inventory/hooks/useInventory'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useBarcodeWedge } from '@/hooks/useBarcodeWedge'
import { Barcode } from '@/lib/barcode'
import { beep } from '@/lib/feedback'
import { notify } from '@/lib/notify'
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
  const { t } = useTranslation(['inventory', 'common', 'products'])
  const [chosenProduct, setChosenProduct] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
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

  const handleBarcodeScanned = (code) => {
    setIsScannerOpen(false)
    const normalized = Barcode.normalize(code)
    const matched = productList.find(
      (p) => p.barcode && Barcode.normalize(p.barcode) === normalized,
    )
    if (matched) {
      setChosenProduct(matched)
      beep()
      notify.success(t('inventory:productSelected'), matched.name)
    } else {
      notify.warning(t('inventory:productNotFound'), t('inventory:noProductWithBarcode'))
    }
  }

  useBarcodeWedge({
    onBarcode: (code) => {
      if (!open || product) return
      handleBarcodeScanned(code)
    },
    enabled: open && !product,
  })

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
      setErrorMsg(t('inventory:mustSelectProduct'))
      return
    }

    if (computedNewStock < 0) {
      setErrorMsg(t('inventory:cannotBeNegative'))
      return
    }

    let payloadQty = qtyNum
    let payloadType = type

    if (type === 'correction') {
      const delta = qtyNum - currentStock
      if (delta === 0) {
        setErrorMsg(t('inventory:noStockChange'))
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
          t('inventory:adjustFailed'),
      )
    }
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={
          activeProduct
            ? t('inventory:adjustStockModalProductTitle', { name: activeProduct.name })
            : t('inventory:adjustStockModalTitle')
        }
        description={
          activeProduct
            ? t('inventory:adjustStockDescProduct', { count: currentStock, unit: activeProduct.unit || 'pcs' })
            : t('inventory:adjustStockDescGeneral')
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
              {t('common:cancel')}
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
                ? t('inventory:confirmStockCount', { count: computedNewStock })
                : t('inventory:selectProductFirst')}
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
                  {product.sku || t('inventory:noSku')}
                  {product.barcode ? ` · ${product.barcode}` : ''}
                </span>
              </div>
              <Badge variant="outline" className="font-mono text-xs shrink-0 font-medium">
                {t('inventory:currentStockLabel')} {currentStock} {product.unit || 'pcs'}
              </Badge>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('inventory:selectProductLabel')}</Label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={pickerOpen}
                        aria-label={t('inventory:selectProductLabel')}
                        className="w-full justify-between h-10 text-xs font-normal"
                      >
                        {chosenProduct ? (
                          <span className="truncate font-medium text-foreground">
                            {chosenProduct.name} ({chosenProduct.stock_quantity ?? 0}{' '}
                            {chosenProduct.unit || 'pcs'})
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {t('inventory:selectProductComboboxPlaceholder')}
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] sm:w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={t('inventory:searchProductPlaceholder')}
                          className="text-xs"
                        />
                        <CommandList className="max-h-60">
                          <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">
                            {isProductsLoading
                              ? t('inventory:loadingProducts')
                              : t('inventory:noProductsFound')}
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
                                        {p.sku || t('inventory:noSku')}
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

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScannerOpen(true)}
                  className="h-10 text-xs px-2.5 gap-1 shrink-0"
                  title={t('inventory:scanBarcodeTooltip')}
                >
                  <ScanBarcode className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">{t('inventory:scanBarcodeButton')}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Adjustment Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t('inventory:adjustmentReasonLabel')}</Label>
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
                  {t('inventory:reasonRestock')}
                </SelectItem>
                <SelectItem value="damage" className="text-xs">
                  {t('inventory:reasonDamage')}
                </SelectItem>
                <SelectItem value="correction" className="text-xs">
                  {t('inventory:reasonCorrection')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Input */}
          <div className="space-y-1.5">
            <Label htmlFor="adjust-qty" className="text-xs font-semibold">
              {type === 'correction'
                ? t('inventory:actualStockQtyLabel')
                : t('inventory:quantityLabel')}
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
                <span>{t('inventory:previousStockLabel')}</span>
                <span className="font-mono font-medium">
                  {currentStock} {activeProduct.unit || 'pcs'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('inventory:changeLabel')}</span>
                <span className="font-mono font-bold">
                  {type === 'restock' && `+${qtyNum}`}
                  {type === 'damage' && `-${qtyNum}`}
                  {type === 'correction' &&
                    `${qtyNum - currentStock >= 0 ? '+' : ''}${qtyNum - currentStock}`}
                </span>
              </div>
              <div className="border-t border-border/70 pt-1.5 flex justify-between items-center font-bold">
                <span className="text-foreground">{t('inventory:newStockLabel')}</span>
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
              {t('inventory:selectProductPrompt')}
            </div>
          )}

          {isInvalidStock && (
            <p className="text-xs text-destructive font-medium">
              {t('inventory:negativeStockWarning')}
            </p>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="adjust-notes" className="text-xs font-semibold">
              {t('inventory:notesLabelOptional')}
            </Label>
            <Input
              id="adjust-notes"
              placeholder={t('inventory:notesPlaceholderInput')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!activeProduct}
              className="h-10 text-xs"
            />
          </div>
        </form>
      </ResponsiveDialog>

      <ScannerSheet
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        continuous={false}
        title={t('inventory:scanBarcodeSheetTitle')}
        onDetected={handleBarcodeScanned}
      />
    </>
)
}

export default AdjustStockDialog
