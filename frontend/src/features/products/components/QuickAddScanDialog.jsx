import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ScanBarcode,
  Search,
  Sparkles,
  CheckCircle2,
  Package,
  Plus,
  Loader2,
  ArrowRight,
  Zap,
  RotateCcw,
} from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { ProductThumb } from '@/components/common/ProductThumb'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ScannerSheet } from '@/components/scanner/ScannerSheet'
import { Barcode } from '@/lib/barcode'
import { lookupBarcode } from '@/services/barcode'
import { useCreateProduct, useAdjustStock } from '@/features/products/hooks/useProducts'
import { usePermissions } from '@/hooks/usePermissions'
import { notify } from '@/lib/notify'

/**
 * Continuous "Quick Add by Scan" shelf stocking modal.
 * Streamlines bulk shelf inventory intake: scan/enter barcode, set selling price,
 * and immediately save and loop to the next item with zero modal closing.
 */
export function QuickAddScanDialog({
  open,
  onOpenChange,
  categories = [],
  onSuccess,
}) {
  const { t } = useTranslation(['products', 'common', 'scanner'])
  const { can } = usePermissions()
  const canViewCost = can('products.view_cost')

  const createMutation = useCreateProduct()
  const adjustMutation = useAdjustStock()

  // Session states
  const [barcode, setBarcode] = useState('')
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState(null)
  const [notFoundOnline, setNotFoundOnline] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [lastSavedName, setLastSavedName] = useState(null)

  // Form fields for item to add
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState(10)
  const [unit, setUnit] = useState('pc')
  const [imageUrl, setImageUrl] = useState('')

  // Quick restock amount for existing items
  const [restockAmount, setRestockAmount] = useState(10)

  const barcodeInputRef = useRef(null)
  const priceInputRef = useRef(null)
  const lastLookedUpRef = useRef('')

  const isSaving = createMutation.isPending || adjustMutation.isPending

  // Reset fields for the next scan while keeping session counter
  const resetForNextScan = useCallback(() => {
    setBarcode('')
    setLookupResult(null)
    setNotFoundOnline(false)
    setName('')
    setCategoryId(categories[0]?.id ? String(categories[0].id) : '')
    setPrice('')
    setCostPrice('')
    setStockQuantity(10)
    setUnit('pc')
    setImageUrl('')
    setRestockAmount(10)
    lastLookedUpRef.current = ''
    setTimeout(() => {
      barcodeInputRef.current?.focus()
    }, 80)
  }, [categories])

  // Reset session on modal open/close
  useEffect(() => {
    if (open) {
      resetForNextScan()
      setAddedCount(0)
      setLastSavedName(null)
    }
  }, [open, resetForNextScan])

  // Lookup barcode
  const handlePerformLookup = useCallback(
    async (codeToLookup) => {
      const targetCode = (codeToLookup || barcode || '').trim()
      if (!targetCode) return

      const normalized = Barcode.normalize(targetCode)
      if (!Barcode.isAcceptable(normalized)) {
        notify.warning(t('products:invalidBarcodeFormat'))
        return
      }

      setIsLookingUp(true)
      setNotFoundOnline(false)
      lastLookedUpRef.current = normalized

      try {
        const res = await lookupBarcode(normalized)
        setLookupResult(res)

        // Case 1: Local duplicate
        if (res?.local_product) {
          return
        }

        // Case 2: Found in Open Food Facts catalog
        if (res?.catalog?.found) {
          const cat = res.catalog
          const formattedName = cat.brand
            ? `${cat.brand} ${cat.name}${cat.size ? ' ' + cat.size : ''}`
            : cat.name
          setName(formattedName)
          if (cat.suggested_category_id) {
            setCategoryId(String(cat.suggested_category_id))
          } else if (categories[0]?.id) {
            setCategoryId(String(categories[0].id))
          }
          if (cat.image_url) {
            setImageUrl(cat.image_url)
          }

          // Focus price input immediately
          setTimeout(() => {
            priceInputRef.current?.focus()
          }, 100)
        } else {
          // Case 3: Not found online
          setNotFoundOnline(true)
          if (categories[0]?.id) {
            setCategoryId(String(categories[0].id))
          }
        }
      } catch (err) {
        notify.error(t('products:lookupError'), err?.message)
      } finally {
        setIsLookingUp(false)
      }
    },
    [barcode, categories, t],
  )

  // Debounced auto-lookup on GTIN entry
  useEffect(() => {
    if (!open || !barcode) return
    const normalized = Barcode.normalize(barcode)
    if (!Barcode.isValidGtin(normalized) || lastLookedUpRef.current === normalized) {
      return
    }

    const timer = setTimeout(() => {
      handlePerformLookup(normalized)
    }, 450)

    return () => clearTimeout(timer)
  }, [barcode, open, handlePerformLookup])

  // Handle scanned code from camera sheet
  const handleBarcodeScanned = (scannedCode) => {
    const normalized = Barcode.normalize(scannedCode)
    setBarcode(normalized)
    setIsScannerOpen(false)
    handlePerformLookup(normalized)
  }

  // Submit product creation and loop to next
  const handleSaveAndScanNext = async (e) => {
    e?.preventDefault()
    if (!name.trim()) {
      notify.error(t('products:nameLabel') + ' is required.')
      return
    }
    const numPrice = Number(price)
    if (isNaN(numPrice) || numPrice < 0) {
      notify.error(t('products:priceLabel') + ' must be at least 0.')
      priceInputRef.current?.focus()
      return
    }

    try {
      const payload = {
        name: name.trim(),
        category_id: Number(categoryId) || categories[0]?.id || 1,
        price: numPrice,
        cost_price: Number(costPrice) || 0,
        stock_quantity: Number(stockQuantity) || 0,
        reorder_level: 10,
        barcode: Barcode.normalize(barcode),
        unit: unit || 'pc',
        image_url: imageUrl || null,
        is_active: true,
        source: lookupResult?.catalog?.found ? 'openfoodfacts' : 'manual',
        source_ref: Barcode.normalize(barcode),
      }

      await createMutation.mutateAsync(payload)
      setAddedCount((prev) => prev + 1)
      setLastSavedName(name)
      onSuccess?.()
      resetForNextScan()
    } catch (err) {
      notify.error(err.message || 'Failed to add product.')
    }
  }

  // Quick Restock handler if item is already in local inventory
  const handleQuickRestock = async () => {
    const localProduct = lookupResult?.local_product
    if (!localProduct) return

    try {
      await adjustMutation.mutateAsync({
        id: localProduct.id,
        type: 'restock',
        quantity: Number(restockAmount) || 1,
        notes: 'Quick Add Shelf Restock',
      })
      notify.success(
        t('products:quickRestock'),
        `Added +${restockAmount} to ${localProduct.name}`,
      )
      setAddedCount((prev) => prev + 1)
      setLastSavedName(`${localProduct.name} (+${restockAmount})`)
      onSuccess?.()
      resetForNextScan()
    } catch (err) {
      notify.error(err.message || 'Failed to restock.')
    }
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span>{t('products:quickAddByScan')}</span>
          </div>
        }
        description={t('products:quickAddDesc')}
        className="sm:max-w-xl"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              {addedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('products:itemsAddedSession', { count: addedCount })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t('common:close', 'Done')}
              </Button>
              {lookupResult && !lookupResult.local_product && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || !name || price === ''}
                  onClick={handleSaveAndScanNext}
                  className="gap-1.5 font-bold"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {t('products:scanNextItem')}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Recent added badge feedback */}
          {lastSavedName && (
            <div className="flex items-center justify-between p-2.5 bg-success/10 border border-success/30 rounded-lg text-xs text-success font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Added <strong>{lastSavedName}</strong> to inventory.</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Total added: {addedCount}
              </span>
            </div>
          )}

          {/* Barcode Search / Scan Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="quick-add-barcode" className="text-xs font-bold text-foreground">
                {t('products:barcodeCol')}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScannerOpen(true)}
                className="h-7 text-[11px] px-2 gap-1"
              >
                <ScanBarcode className="h-3.5 w-3.5" />
                {t('products:scanBarcodeButton')}
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="quick-add-barcode"
                  ref={barcodeInputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handlePerformLookup(e.target.value)
                    }
                  }}
                  placeholder="Scan or enter barcode (e.g. 4800016644800)..."
                  className="font-mono text-sm pr-9"
                  autoFocus
                />
                {isLookingUp && (
                  <div className="absolute right-2.5 top-2.5 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => handlePerformLookup(barcode)}
                disabled={isLookingUp || !barcode.trim()}
                className="gap-1 h-9 px-3"
              >
                <Search className="h-3.5 w-3.5" />
                {t('common:search', 'Find')}
              </Button>
            </div>
          </div>

          {/* CASE 1: Local Product Hit (Already in stock) */}
          {lookupResult?.local_product && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ProductThumb
                    name={lookupResult.local_product.name}
                    imageUrl={lookupResult.local_product.image_url}
                    size="lg"
                    className="rounded-lg shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {lookupResult.local_product.name}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      SKU: {lookupResult.local_product.sku} · ₱{Number(lookupResult.local_product.price).toFixed(2)}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  type="stock"
                  variant={lookupResult.local_product.stock_quantity > 0 ? 'in' : 'out'}
                />
              </div>

              <div className="rounded-lg bg-card p-3 border border-border/80 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('products:alreadyInStock')}:</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {lookupResult.local_product.stock_quantity} {lookupResult.local_product.unit || 'pcs'}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">{t('products:restockAmount')}</Label>
                    <div className="flex items-center gap-1">
                      {[5, 10, 20, 50].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setRestockAmount(amt)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            restockAmount === amt
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted hover:bg-muted/80 text-foreground border-border'
                          }`}
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={restockAmount}
                      onChange={(e) => setRestockAmount(Number(e.target.value) || 1)}
                      className="h-8 text-xs font-mono"
                      min="1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleQuickRestock}
                      disabled={isSaving}
                      className="h-8 gap-1.5 font-bold shrink-0"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {t('products:quickRestock')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetForNextScan}
                      className="h-8 shrink-0"
                    >
                      {t('products:scanNext')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CASE 2: Catalog Hit or Manual Entry Form */}
          {lookupResult && !lookupResult.local_product && (
            <form onSubmit={handleSaveAndScanNext} className="space-y-3">
              {/* Online Catalog Attribution */}
              {lookupResult.catalog?.found && (
                <div className="flex items-center gap-2 p-2 bg-highlight/10 border border-highlight/25 rounded-lg text-xs text-highlight font-medium">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>{lookupResult.catalog.attribution || 'Open Food Facts product match'}</span>
                </div>
              )}

              {notFoundOnline && (
                <div className="flex items-center gap-2 p-2 bg-muted border border-border/80 rounded-lg text-xs text-muted-foreground">
                  <Package className="h-4 w-4 shrink-0" />
                  <span>Unknown barcode. Enter details to register in inventory.</span>
                </div>
              )}

              {/* Product preview & name */}
              <div className="flex items-center gap-3">
                <ProductThumb
                  name={name || 'New Item'}
                  imageUrl={imageUrl}
                  size="lg"
                  className="rounded-lg shrink-0"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="quick-product-name" className="text-xs font-bold">
                    {t('products:nameLabel')}
                  </Label>
                  <Input
                    id="quick-product-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Product name..."
                    className="text-sm font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Pricing & Stock inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="quick-product-price" className="text-xs font-bold text-primary">
                    {t('products:priceLabel')} *
                  </Label>
                  <MoneyInput
                    id="quick-product-price"
                    ref={priceInputRef}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {canViewCost && (
                  <div className="space-y-1">
                    <Label htmlFor="quick-product-cost" className="text-xs font-medium text-muted-foreground">
                      {t('products:costLabel')}
                    </Label>
                    <MoneyInput
                      id="quick-product-cost"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="quick-product-stock" className="text-xs font-medium">
                    {t('products:initialStockLabel')}
                  </Label>
                  <Input
                    id="quick-product-stock"
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value) || 0)}
                    min="0"
                    className="text-sm font-mono"
                  />
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <Label htmlFor="quick-product-category" className="text-xs font-medium">
                  {t('products:categoryLabel')}
                </Label>
                <select
                  id="quick-product-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  id="quick-add-submit"
                  type="submit"
                  disabled={isSaving || !name || price === ''}
                  className="w-full sm:w-auto gap-2 font-bold"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {t('products:scanNextItem')} (Enter)
                </Button>
              </div>
            </form>
          )}
        </div>
      </ResponsiveDialog>

      {/* Camera scanner sub-sheet */}
      <ScannerSheet
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        continuous={false}
        title={t('products:scanSheetTitle')}
        onDetected={handleBarcodeScanned}
      />
    </>
  )
}

export default QuickAddScanDialog
