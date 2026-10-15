import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ScanBarcode,
  Sparkles,
  CheckCircle2,
  Package,
  Plus,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Camera,
  Upload,
  ExternalLink,
  Printer,
  Pencil,
  ArrowDownUp,
  Image as ImageIcon,
} from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { BarcodeCapture } from '@/components/scanner/BarcodeCapture'
import { PrintLabelsDialog } from '@/components/scanner/PrintLabelsDialog'
import { Barcode } from '@/lib/barcode'
import { lookupBarcode } from '@/services/barcode'
import {
  useCreateProduct,
  useUploadProductImage,
} from '@/features/products/hooks/useProducts'
import { usePermissions } from '@/hooks/usePermissions'
import { notify } from '@/lib/notify'
import { resizeImage } from '@/lib/imageResize'
import { resolveImageUrl } from '@/lib/images'

/**
 * Unified "Add by Barcode" modal dialog.
 * Replaces both QuickAddScanDialog and the old Scan-to-Add sheet with a single flow:
 *   a. Capture (BarcodeCapture) ->
 *   b. Looking up (Skeleton) ->
 *   c. Found online (Compact Quick Add)
 *   d. Already in store (Restock / Edit / Scan another)
 *   e. Not found online (Compact manual add)
 *   f. Manual / homemade (Generated internal barcode + Print labels option)
 */
export function AddByBarcodeDialog({
  open,
  onOpenChange,
  categories = [],
  initialBarcode = '',
  onSuccess,
  onEditProduct,
  onRestockProduct,
}) {
  const { t } = useTranslation(['products', 'scanner', 'common'])
  const { can } = usePermissions()
  const canViewCost = can('products.view_cost')

  const createMutation = useCreateProduct()
  const uploadImageMutation = useUploadProductImage()

  // State machine: 'capture' | 'lookup' | 'found_online' | 'already_in_store' | 'not_found' | 'manual'
  const [dialogState, setDialogState] = useState('capture')
  const [activeBarcode, setActiveBarcode] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [sessionProducts, setSessionProducts] = useState([])
  const [justSavedHomemade, setJustSavedHomemade] = useState(null)
  const [printLabelsOpen, setPrintLabelsOpen] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState(0)
  const [unit, setUnit] = useState('pc')
  const [imageUrl, setImageUrl] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [isOptimizingImage, setIsOptimizingImage] = useState(false)

  // Focus refs
  const priceInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const isSaving =
    createMutation.isPending ||
    uploadImageMutation.isPending ||
    isOptimizingImage

  // Reset form inputs for a new item
  const resetFormFields = useCallback(() => {
    setName('')
    setBrand('')
    setSize('')
    setCategoryId(categories[0]?.id ? String(categories[0].id) : '1')
    setPrice('')
    setCostPrice('')
    setStockQuantity(0)
    setUnit('pc')
    setImageUrl('')
    setPendingImage(null)
    setLookupResult(null)
    setJustSavedHomemade(null)
  }, [categories])

  // Lookup barcode function
  const executeLookup = useCallback(
    async (codeToLookup) => {
      const targetCode = Barcode.normalize(codeToLookup)
      if (!targetCode) return

      setActiveBarcode(targetCode)
      setDialogState('lookup')
      resetFormFields()

      try {
        const res = await lookupBarcode(targetCode)
        const localProduct = res?.local_product || res?.data?.local_product
        const catalog = res?.catalog || res?.data?.catalog

        setLookupResult(res)

        // State d: Already in store
        if (localProduct) {
          setDialogState('already_in_store')
          return
        }

        // State c: Found online
        if (catalog?.found) {
          const combinedName =
            catalog.brand &&
            catalog.name &&
            !catalog.name.toLowerCase().includes(catalog.brand.toLowerCase())
              ? `${catalog.brand} ${catalog.name}${catalog.size ? ' ' + catalog.size : ''}`
              : `${catalog.name || ''}${catalog.size ? ' ' + catalog.size : ''}`.trim()

          setName(combinedName || catalog.name || '')
          setBrand(catalog.brand || '')
          setSize(catalog.size || '')
          if (catalog.suggested_category_id) {
            setCategoryId(String(catalog.suggested_category_id))
          } else if (categories[0]?.id) {
            setCategoryId(String(categories[0].id))
          }
          if (catalog.image_url) {
            setImageUrl(catalog.image_url)
          }

          setDialogState('found_online')
          setTimeout(() => {
            priceInputRef.current?.focus()
          }, 150)
        } else {
          // State e: Not found online
          setDialogState('not_found')
          setTimeout(() => {
            nameInputRef.current?.focus()
          }, 150)
        }
      } catch (err) {
        notify.error(t('products:lookupError', 'Barcode lookup failed'), err?.message)
        setDialogState('not_found')
        setTimeout(() => {
          nameInputRef.current?.focus()
        }, 150)
      }
    },
    [categories, resetFormFields, t],
  )

  // Handle open / initialBarcode changes
  useEffect(() => {
    if (open) {
      if (initialBarcode) {
        executeLookup(initialBarcode)
      } else {
        setDialogState('capture')
        setActiveBarcode('')
        resetFormFields()
      }
    } else {
      setSessionProducts([])
      setJustSavedHomemade(null)
    }
  }, [open, initialBarcode, executeLookup, resetFormFields])

  // Handle photo selection (upload / camera)
  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsOptimizingImage(true)
    try {
      const resized = await resizeImage(file, { maxWidth: 800, maxHeight: 800 })
      setPendingImage(resized)
    } catch {
      notify.error(t('products:imageOptimizeError', 'Could not process photo.'))
    } finally {
      setIsOptimizingImage(false)
      if (e.target) e.target.value = ''
    }
  }

  // Switch to Manual / Homemade State (f)
  const handleAddHomemade = () => {
    const seq = Math.floor(Date.now() / 1000) % 10000000000
    const internalCode = Barcode.makeInternal(seq)
    setActiveBarcode(internalCode)
    resetFormFields()
    setDialogState('manual')
    setTimeout(() => {
      nameInputRef.current?.focus()
    }, 150)
  }

  // Save product logic
  const handleSaveProduct = async (andScanNext = false) => {
    if (!name.trim()) {
      notify.error(t('products:nameLabel', 'Product name') + ' is required.')
      nameInputRef.current?.focus()
      return
    }

    const rawPrice = typeof price === 'object' && price?.target ? price.target.value : price
    const numPrice = parseFloat(rawPrice)
    if (isNaN(numPrice) || numPrice < 0) {
      notify.error(t('products:priceLabel', 'Selling price') + ' must be at least 0.')
      priceInputRef.current?.focus()
      return
    }

    const rawCost = typeof costPrice === 'object' && costPrice?.target ? costPrice.target.value : costPrice
    const numCost = parseFloat(rawCost) || 0

    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim() || null,
        size: size.trim() || null,
        category_id: Number(categoryId) || Number(categories[0]?.id) || 1,
        price: numPrice,
        cost_price: numCost,
        stock_quantity: Number(stockQuantity) || 0,
        reorder_level: 10,
        barcode: Barcode.normalize(activeBarcode) || null,
        unit: unit || 'pc',
        image_url: pendingImage ? null : imageUrl || null,
        is_active: true,
        source: dialogState === 'found_online' ? 'openfoodfacts' : 'manual',
        source_ref: activeBarcode || null,
      }

      const res = await createMutation.mutateAsync(payload)
      const savedProd = res.data

      // Upload custom photo if provided
      if (pendingImage && savedProd?.id) {
        await uploadImageMutation.mutateAsync({
          id: savedProd.id,
          file: pendingImage.file,
          source: 'upload',
        })
      }

      setSessionProducts((prev) => [savedProd, ...prev])
      onSuccess?.()
      notify.success(t('products:productSaved', 'Product added successfully!'), savedProd.name)

      if (dialogState === 'manual') {
        setJustSavedHomemade(savedProd)
      }

      if (andScanNext) {
        setDialogState('capture')
        setActiveBarcode('')
        resetFormFields()
      } else {
        if (dialogState !== 'manual') {
          onOpenChange(false)
        }
      }
    } catch (err) {
      notify.error(err.message || 'Failed to save product.')
    }
  }

  // Dialog Title helper
  const getDialogTitle = () => {
    switch (dialogState) {
      case 'capture':
        return t('products:addByBarcode', 'Add by Barcode')
      case 'lookup':
        return t('products:lookingUpBarcode', 'Looking up barcode...')
      case 'found_online':
        return t('products:foundOnlineTitle', 'Found Online — Quick Add')
      case 'already_in_store':
        return t('products:alreadyInStoreTitle', 'Product Already in Inventory')
      case 'not_found':
        return t('products:notFoundOnlineTitle', 'Not found online — add it manually')
      case 'manual':
        return t('products:homemadeItemTitle', 'Add Homemade / Custom Item')
      default:
        return t('products:addByBarcode', 'Add by Barcode')
    }
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={getDialogTitle()}
        description={
          dialogState === 'capture'
            ? t('products:scanOrTypeBarcodeDesc', 'Scan with camera, USB scanner, or type a barcode to quickly add products.')
            : undefined
        }
        className="sm:max-w-lg"
      >
        <div className="space-y-4">
          {/* ============================================================== */}
          {/* STATE A: CAPTURE */}
          {/* ============================================================== */}
          {dialogState === 'capture' && (
            <div className="space-y-4">
              <BarcodeCapture
                onCode={(code) => executeLookup(code)}
                autoFocus={true}
                cameraDefault="auto"
                continuous={false}
              />

              {/* Link to Homemade item */}
              <div className="pt-2 text-center border-t border-border/60">
                <button
                  type="button"
                  onClick={handleAddHomemade}
                  className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                  {t('products:noBarcodeHomemadeLink', 'No barcode? Add a homemade item')}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STATE B: LOOKING UP (SKELETON) */}
          {/* ============================================================== */}
          {dialogState === 'lookup' && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {t('products:searchingCatalog', 'Searching product databases...')}
                </p>
                <p className="font-mono text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md inline-block">
                  {activeBarcode}
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STATE D: ALREADY IN STORE */}
          {/* ============================================================== */}
          {dialogState === 'already_in_store' && (() => {
            const prod = lookupResult?.local_product || lookupResult?.data?.local_product
            if (!prod) return null
            return (
              <div className="space-y-4 py-1">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      name={prod.name}
                      imageUrl={prod.image_url}
                      size="lg"
                      className="shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {prod.name}
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {prod.barcode || activeBarcode}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="font-semibold text-foreground">
                          {t('products:currentStockLabel', 'Stock:')} {prod.stock_quantity ?? prod.stock ?? 0} {prod.unit || 'pcs'}
                        </span>
                        <Money amount={prod.price} size="sm" tone="default" className="font-bold" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      onRestockProduct?.(prod)
                    }}
                    className="flex-1 gap-1.5 h-10 font-semibold"
                  >
                    <ArrowDownUp className="h-4 w-4" />
                    {t('products:restock', 'Restock')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false)
                      onEditProduct?.(prod)
                    }}
                    className="flex-1 gap-1.5 h-10 font-semibold"
                  >
                    <Pencil className="h-4 w-4" />
                    {t('products:edit', 'Edit')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDialogState('capture')}
                    className="h-10 text-xs"
                  >
                    {t('products:scanAnother', 'Scan another')}
                  </Button>
                </div>
              </div>
            )
          })()}

          {/* ============================================================== */}
          {/* STATE C, E, F: COMPACT QUICK ADD FORMS */}
          {/* ============================================================== */}
          {(dialogState === 'found_online' ||
            dialogState === 'not_found' ||
            dialogState === 'manual') && (
            <div className="space-y-4 py-1">
              {/* Product Header / Photo & Name Preview */}
              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20">
                <div className="relative shrink-0">
                  <ProductThumb
                    name={name || 'Product'}
                    imageUrl={pendingImage?.dataUrl || imageUrl}
                    size="lg"
                    className="rounded-xl shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 cursor-pointer"
                    aria-label={t('products:changePhoto', 'Change photo')}
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-muted-foreground block truncate">
                      {activeBarcode}
                    </span>
                    {dialogState === 'manual' && (
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        Homemade
                      </Badge>
                    )}
                    {dialogState === 'found_online' && (
                      <Badge variant="secondary" className="text-[10px] font-semibold text-emerald-600 bg-emerald-50">
                        OFF Catalog
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline font-medium text-[11px]"
                    >
                      {t('products:changePhoto', 'Change photo')}
                    </button>
                  </p>
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="space-y-3">
                {/* Name */}
                <div className="space-y-1">
                  <Label htmlFor="quick-add-name" className="text-xs font-semibold">
                    {t('products:nameLabel', 'Product Name')} *
                  </Label>
                  <Input
                    id="quick-add-name"
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. San Miguel Pale Pilsen 330ml"
                    className="h-10 text-sm"
                    required
                  />
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="quick-add-category" className="text-xs font-semibold">
                      {t('products:categoryLabel', 'Category')}
                    </Label>
                    <select
                      id="quick-add-category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="quick-add-unit" className="text-xs font-semibold">
                      {t('products:unitLabel', 'Unit')}
                    </Label>
                    <select
                      id="quick-add-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="pc">Piece (pc)</option>
                      <option value="pack">Pack</option>
                      <option value="bottle">Bottle</option>
                      <option value="can">Can</option>
                      <option value="sachet">Sachet</option>
                      <option value="kg">Kilogram (kg)</option>
                    </select>
                  </div>
                </div>

                {/* Price (Required & Autofocused), Cost, Initial Stock */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="quick-add-price" className="text-xs font-semibold text-primary">
                      {t('products:priceLabel', 'Price (₱)')} *
                    </Label>
                    <MoneyInput
                      id="quick-add-price"
                      ref={priceInputRef}
                      value={price}
                      onChange={(e) => setPrice(e?.target ? e.target.value : e)}
                      placeholder="0.00"
                      className="h-10 text-sm font-bold font-mono"
                    />
                  </div>

                  {canViewCost && (
                    <div className="space-y-1">
                      <Label htmlFor="quick-add-cost" className="text-xs font-semibold text-muted-foreground">
                        {t('products:costLabel', 'Cost (₱)')}
                      </Label>
                      <MoneyInput
                        id="quick-add-cost"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e?.target ? e.target.value : e)}
                        placeholder="0.00"
                        className="h-10 text-sm font-mono text-muted-foreground"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="quick-add-stock" className="text-xs font-semibold">
                      {t('products:initialStockLabel', 'Initial Stock')}
                    </Label>
                    <Input
                      id="quick-add-stock"
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(Number(e.target.value) || 0)}
                      className="h-10 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogState('capture')}
                  className="gap-1.5 h-10 text-xs sm:w-auto"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('common:back', 'Back')}
                </Button>

                <div className="flex-1 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleSaveProduct(true)}
                    disabled={isSaving}
                    className="flex-1 gap-1.5 h-10 font-semibold text-xs"
                  >
                    {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t('products:saveAndScanNext', 'Save & Scan Next')}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSaveProduct(false)}
                    disabled={isSaving}
                    className="flex-1 gap-1.5 h-10 font-bold text-xs"
                  >
                    {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t('common:save', 'Save')}
                  </Button>
                </div>
              </div>

              {/* Shortcut to print labels for homemade item right after saving */}
              {justSavedHomemade && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between gap-2 mt-2">
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">
                      {t('products:savedHomemadeNotice', 'Saved! Print sticker barcode labels?')}
                    </p>
                    <p className="text-muted-foreground text-[11px] font-mono">
                      {justSavedHomemade.barcode}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPrintLabelsOpen(true)}
                    className="h-8 text-xs gap-1.5 font-semibold"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {t('products:printLabels', 'Print Labels')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* SESSION LIST: Added this session (n) */}
          {/* ============================================================== */}
          {sessionProducts.length > 0 && (
            <div className="border-t border-border/70 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-muted-foreground">
                  {t('products:addedThisSession', {
                    count: sessionProducts.length,
                    defaultValue: `Added this session (${sessionProducts.length})`,
                  })}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t('products:tapToEdit', 'Tap to edit')}
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {sessionProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onOpenChange(false)
                      onEditProduct?.(p)
                    }}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ProductThumb name={p.name} imageUrl={p.image_url} size="sm" />
                      <div className="min-w-0">
                        <span className="font-semibold block truncate">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate block">
                          {p.barcode || 'NO-BARCODE'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Money amount={p.price} size="sm" tone="default" className="font-bold font-mono" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ResponsiveDialog>

      {/* Print Labels Dialog if requested */}
      {justSavedHomemade && (
        <PrintLabelsDialog
          open={printLabelsOpen}
          onOpenChange={setPrintLabelsOpen}
          product={justSavedHomemade}
        />
      )}
    </>
  )
}

export default AddByBarcodeDialog
