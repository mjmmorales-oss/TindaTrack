import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  Loader2,
  ScanBarcode,
  Search,
  Sparkles,
  ExternalLink,
  Printer,
  CheckCircle2,
} from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormInput } from '@/components/forms/FormInput'
import { FormSelect } from '@/components/forms/FormSelect'
import { FormSwitch } from '@/components/forms/FormSwitch'
import { FormTextarea } from '@/components/forms/FormTextarea'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { ScannerSheet } from '@/components/scanner/ScannerSheet'
import { PrintLabelsDialog } from '@/components/scanner/PrintLabelsDialog'
import { productSchema, PRODUCT_UNITS, DEFAULT_PRODUCT } from '@/features/products/schemas'
import { useCreateProduct, useUpdateProduct, useProducts } from '@/features/products/hooks/useProducts'
import { usePermissions } from '@/hooks/usePermissions'
import { Barcode } from '@/lib/barcode'
import { lookupBarcode } from '@/services/barcode'
import { notify } from '@/lib/notify'

/**
 * Product Create & Edit modal form with Open Food Facts auto-fill,
 * internal homemade barcode generation, image preview, and label printing.
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  product = DEFAULT_PRODUCT,
  categories = [],
  onSuccess,
}) {
  const currentProduct = product || DEFAULT_PRODUCT
  const isEdit = Boolean(currentProduct.id && !currentProduct.__isDuplicate)
  const { can } = usePermissions()
  const canViewCost = can('products.view_cost')

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const isPending = createMutation.isPending || updateMutation.isPending

  // Existing products to calculate sequence and check duplicate
  const { data: allProductsRes } = useProducts({ per_page: 200 })
  const allProducts = allProductsRes?.data || []

  // Scanner & Lookup UI states
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupAttribution, setLookupAttribution] = useState(null)
  const [lookupNotFound, setLookupNotFound] = useState(false)
  const [localDuplicate, setLocalDuplicate] = useState(null)
  const [isPrintLabelsOpen, setIsPrintLabelsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const priceInputRef = useRef(null)

  const categoryOptions = (categories || []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }))

  const defaultValues = {
    name: currentProduct.name || '',
    category_id: currentProduct.category_id ? String(currentProduct.category_id) : '',
    sku: currentProduct.sku || '',
    barcode: currentProduct.barcode || '',
    brand: currentProduct.brand || '',
    size: currentProduct.size || '',
    image_url: currentProduct.image_url || '',
    source: currentProduct.source || 'manual',
    source_ref: currentProduct.source_ref || '',
    unit: currentProduct.unit || 'pc',
    price: currentProduct.price ?? 0,
    cost_price: currentProduct.cost_price ?? 0,
    stock_quantity: currentProduct.stock_quantity ?? 0,
    reorder_level: currentProduct.reorder_level ?? 10,
    is_active: currentProduct.is_active ?? true,
    description: currentProduct.description || '',
  }

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues,
  })

  const watchedBarcode = watch('barcode')
  const watchedImageUrl = watch('image_url')
  const watchedPrice = Number(watch('price') || 0)
  const watchedCost = Number(watch('cost_price') || 0)
  const showCostWarning = canViewCost && watchedCost > 0 && watchedCost > watchedPrice

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const p = product || DEFAULT_PRODUCT
      reset({
        name: p.name || '',
        category_id: p.category_id ? String(p.category_id) : '',
        sku: p.sku || '',
        barcode: p.barcode || '',
        brand: p.brand || '',
        size: p.size || '',
        image_url: p.image_url || '',
        source: p.source || 'manual',
        source_ref: p.source_ref || '',
        unit: p.unit || 'pc',
        price: p.price ?? 0,
        cost_price: p.cost_price ?? 0,
        stock_quantity: p.stock_quantity ?? 0,
        reorder_level: p.reorder_level ?? 10,
        is_active: p.is_active ?? true,
        description: p.description || '',
      })
      setLookupAttribution(null)
      setLookupNotFound(false)
      setLocalDuplicate(null)
      setImageError(false)
    }
  }, [open, product, reset])

  // Reset image error state when URL changes
  useEffect(() => {
    setImageError(false)
  }, [watchedImageUrl])

  // Check for local duplicates on barcode change
  useEffect(() => {
    if (!watchedBarcode) {
      setLocalDuplicate(null)
      return
    }
    const normalized = Barcode.normalize(watchedBarcode)
    const existing = allProducts.find(
      (p) =>
        p.barcode &&
        Barcode.normalize(p.barcode) === normalized &&
        (!isEdit || p.id !== product?.id),
    )
    if (existing) {
      setLocalDuplicate(existing)
    } else {
      setLocalDuplicate(null)
    }
  }, [watchedBarcode, allProducts, isEdit, product?.id])

  // Online lookup helper
  const handleOnlineLookup = useCallback(
    async (codeToLookup, isAutoRun = false) => {
      const code = (codeToLookup || watchedBarcode || '').trim()
      if (!code) return

      const normalized = Barcode.normalize(code)
      if (!Barcode.isAcceptable(normalized)) {
        if (!isAutoRun) {
          setError('barcode', { message: 'Hindi wastong barcode format.' })
        }
        return
      }

      setIsLookingUp(true)
      setLookupNotFound(false)
      clearErrors('barcode')

      try {
        const res = await lookupBarcode(normalized)

        // 1. Local duplicate hit
        if (res?.local_product && (!isEdit || res.local_product.id !== product?.id)) {
          setLocalDuplicate(res.local_product)
          notify.warning(
            'Naka-rehistro na ang barcode',
            `Naka-rehistro na ito: ${res.local_product.name}`,
          )
          return
        }

        // 2. Catalog found hit
        if (res?.catalog?.found) {
          const cat = res.catalog
          setLookupAttribution(cat.attribution || 'Data mula sa Open Food Facts (ODbL)')

          // Prefill only fields that are currently empty
          const currentName = watch('name')
          if (!currentName) {
            const formattedName = cat.brand
              ? `${cat.brand} ${cat.name}${cat.size ? ' ' + cat.size : ''}`
              : cat.name
            setValue('name', formattedName, { shouldValidate: true })
          }

          if (!watch('brand') && cat.brand) {
            setValue('brand', cat.brand)
          }

          if (!watch('size') && cat.size) {
            setValue('size', cat.size)
          }

          if (!watch('image_url') && cat.image_url) {
            setValue('image_url', cat.image_url)
          }

          if (!watch('category_id') && cat.suggested_category_id) {
            setValue('category_id', String(cat.suggested_category_id), {
              shouldValidate: true,
            })
          }

          setValue('source', cat.source || 'openfoodfacts')
          setValue('source_ref', normalized)

          notify.success('Nakita sa Open Food Facts', 'Kusang pinunan ang mga detalye.')

          // Focus price field after auto-fill
          setTimeout(() => {
            const el = document.getElementById('product-price')
            el?.focus()
          }, 100)
        } else {
          // Not found online
          setLookupNotFound(true)
          if (!isAutoRun) {
            notify.info(
              'Walang nakitang data online',
              'Walang nakitang data online, punan nang manual.',
            )
          }
        }
      } catch (err) {
        if (!isAutoRun) {
          notify.error('Lookup error', err?.message || 'Hindi ma-lookup ang barcode.')
        }
      } finally {
        setIsLookingUp(false)
      }
    },
    [watchedBarcode, isEdit, product?.id, watch, setValue, setError, clearErrors],
  )

  // Handle scanned barcode from ScannerSheet
  const handleBarcodeScanned = (scannedCode) => {
    const normalized = Barcode.normalize(scannedCode)
    setValue('barcode', normalized, { shouldValidate: true })
    setIsScannerOpen(false)

    // Auto-run online lookup when a valid GTIN is scanned in create mode
    if (!isEdit && Barcode.isValidGtin(normalized)) {
      handleOnlineLookup(normalized, true)
    }
  }

  // Generate homemade internal barcode (EAN-13 starting with 20)
  const handleGenerateInternalBarcode = () => {
    // Find highest internal sequence
    const internalCodes = allProducts
      .map((p) => p.barcode)
      .filter((b) => b && /^20\d{11}$/.test(b))

    let maxSeq = 0
    internalCodes.forEach((b) => {
      const seq = parseInt(b.slice(2, 12), 10)
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq
      }
    })

    const nextSeq = maxSeq > 0 ? maxSeq + 1 : Math.floor(Date.now() / 1000) % 1000000
    const internalBarcode = Barcode.makeInternal(nextSeq)
    setValue('barcode', internalBarcode, { shouldValidate: true })
    setValue('source', 'manual')
    notify.success('Sariling Barcode', `Nabuo: ${internalBarcode}`)
  }

  const onSubmit = async (values) => {
    if (localDuplicate) {
      notify.error('Duplicate Barcode', 'Naka-rehistro na ang barcode na ito sa ibang produkto.')
      return
    }

    try {
      const payload = {
        ...values,
        category_id: Number(values.category_id),
        price: Number(values.price),
        cost_price: Number(values.cost_price || 0),
        stock_quantity: Number(values.stock_quantity || 0),
        reorder_level: Number(values.reorder_level || 10),
        barcode: values.barcode ? Barcode.normalize(values.barcode) : null,
        brand: values.brand?.trim() || null,
        size: values.size?.trim() || null,
        image_url: values.image_url?.trim() || null,
        source: values.source || 'manual',
        source_ref: values.source_ref || null,
      }

      if (isEdit) {
        delete payload.stock_quantity
        await updateMutation.mutateAsync({ id: product.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      if (err.errors) {
        Object.entries(err.errors).forEach(([field, msgs]) => {
          setError(field, {
            type: 'server',
            message: Array.isArray(msgs) ? msgs[0] : msgs,
          })
        })
      }
    }
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={
          isEdit
            ? `I-edit ang Produkto: ${product.name}`
            : product?.__isDuplicate
            ? 'Kopyahin ang Produkto (Duplicate)'
            : 'Magdagdag ng Bagong Produkto'
        }
        description={
          isEdit
            ? 'I-update ang presyo, detalye, at impormasyon ng paninda.'
            : 'Punan ang impormasyon ng panindang ibebenta sa tindahan.'
        }
        className="sm:max-w-xl"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              {watchedBarcode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrintLabelsOpen(true)}
                  className="gap-1.5 text-xs h-9"
                >
                  <Printer className="h-3.5 w-3.5" />
                  I-print ang label
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Kanselahin
              </Button>
              <Button
                type="submit"
                form="product-form"
                disabled={isPending || Boolean(localDuplicate)}
                className="gap-1.5 font-bold"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? 'I-save ang Pagbabago' : 'Idagdag ang Produkto'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Duplicate Barcode Warning */}
          {localDuplicate && (
            <Alert variant="destructive" className="py-2.5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs font-medium">
                Naka-rehistro na ito: <strong>{localDuplicate.name}</strong> (SKU: {localDuplicate.sku}).
                Hindi maaaring magkaroon ng parehong barcode ang magkaibang produkto.
              </AlertDescription>
            </Alert>
          )}

          {/* Online Catalog Attribution Notice */}
          {lookupAttribution && (
            <div className="flex items-center justify-between p-2.5 bg-primary/10 border border-primary/25 rounded-lg text-xs">
              <div className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{lookupAttribution}</span>
              </div>
              {watchedBarcode && (
                <a
                  href={`https://world.openfoodfacts.org/product/${watchedBarcode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 text-[11px] font-bold"
                >
                  Tingnan sa OFF
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Not Found Online Notice */}
          {lookupNotFound && (
            <Alert variant="warning" className="border-warning/40 bg-warning/10 py-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-xs text-warning-foreground font-medium">
                Walang nakitang data online, punan nang manual.
              </AlertDescription>
            </Alert>
          )}

          {/* Barcode Field with Scan & Online Lookup Toolbar */}
          <div className="space-y-1.5 p-3 rounded-xl border border-border/80 bg-muted/20">
            <div className="flex items-center justify-between">
              <label htmlFor="product-barcode" className="text-xs font-bold text-foreground">
                Barcode
              </label>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScannerOpen(true)}
                  className="h-7 text-[11px] px-2 gap-1"
                >
                  <ScanBarcode className="h-3 w-3 text-primary" />
                  I-scan
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOnlineLookup()}
                  disabled={isLookingUp || !watchedBarcode}
                  className="h-7 text-[11px] px-2 gap-1"
                >
                  {isLookingUp ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Search className="h-3 w-3 text-primary" />
                  )}
                  Hanapin online
                </Button>

                {!isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateInternalBarcode}
                    className="h-7 text-[11px] px-2 gap-1 text-primary hover:text-primary font-semibold"
                  >
                    <Sparkles className="h-3 w-3" />
                    Sariling barcode
                  </Button>
                )}
              </div>
            </div>

            <FormInput
              id="product-barcode"
              name="barcode"
              control={control}
              placeholder="8-13 tambilang (hal. 4800016601011)"
              className="font-mono text-sm"
            />
          </div>

          {/* Name (Full Width) */}
          <FormInput
            name="name"
            control={control}
            label="Pangalan ng Produkto"
            placeholder="hal. Lucky Me! Pancit Canton Kalamansi"
            className="text-base md:text-sm"
          />

          {/* Brand & Size */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              name="brand"
              control={control}
              label="Brand / Tatak (Opsyonal)"
              placeholder="hal. Lucky Me!, Bear Brand, Coke"
            />
            <FormInput
              name="size"
              control={control}
              label="Sukat / Size (Opsyonal)"
              placeholder="hal. 60g, 295ml, 1L"
            />
          </div>

          {/* Image URL & Image Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <FormInput
                  name="image_url"
                  control={control}
                  label="URL ng Larawan ng Produkto (Opsyonal)"
                  placeholder="https://images.openfoodfacts.org/..."
                  description="I-paste ang link ng larawan (walang file upload para sa mabilis na pag-load)."
                />
              </div>

              {watchedImageUrl && !imageError && (
                <div className="h-16 w-16 rounded-lg border border-border overflow-hidden shrink-0 bg-muted/40 self-end mb-1">
                  <img
                    src={watchedImageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormSelect
              name="category_id"
              control={control}
              label="Kategorya"
              options={categoryOptions}
              placeholder="Pumili ng kategorya..."
            />
            <FormSelect
              name="unit"
              control={control}
              label="Sukat / Unit"
              options={PRODUCT_UNITS}
              placeholder="Pumili ng unit..."
            />
          </div>

          {/* SKU */}
          <FormInput
            name="sku"
            control={control}
            label="SKU (Stock Keeping Unit)"
            placeholder="hal. TT-NOO-001"
            description="Kusang bubuuin kung hahayaang bakante."
          />

          {/* Pricing: Selling Price & Cost Price */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              name="price"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <Field data-invalid={!!error}>
                  <FieldLabel htmlFor="product-price">Presyo ng Benta (₱)</FieldLabel>
                  <MoneyInput
                    id="product-price"
                    ref={priceInputRef}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="0.00"
                  />
                  {error && <FieldError>{error.message}</FieldError>}
                </Field>
              )}
            />

            {canViewCost && (
              <Controller
                name="cost_price"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <Field data-invalid={!!error}>
                    <FieldLabel htmlFor="product-cost">Puhunan / Cost (₱)</FieldLabel>
                    <MoneyInput
                      id="product-cost"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="0.00"
                    />
                    {error && <FieldError>{error.message}</FieldError>}
                  </Field>
                )}
              />
            )}
          </div>

          {/* Cost > Price Warning */}
          {showCostWarning && (
            <Alert variant="warning" className="border-warning bg-warning/10 py-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-xs text-warning-foreground font-medium">
                Babala: Mas mataas ang puhunan (₱{watchedCost.toFixed(2)}) kaysa sa presyo ng benta (₱{watchedPrice.toFixed(2)}). Malulugi ang tindahan sa bawat benta nito.
              </AlertDescription>
            </Alert>
          )}

          {/* Stock Quantity & Reorder Level */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              name="stock_quantity"
              control={control}
              label="Panimulang Stock (Quantity)"
              type="number"
              inputMode="numeric"
              disabled={isEdit}
              description={isEdit ? 'Baguhin gamit ang "Adjust Stock".' : undefined}
            />
            <FormInput
              name="reorder_level"
              control={control}
              label="Reorder Level (Alert Limit)"
              type="number"
              inputMode="numeric"
              description="Magpapakita ng babala kapag umabot dito ang stock."
            />
          </div>

          {/* Active Status */}
          <div className="rounded-lg border border-border/70 p-3 bg-muted/20">
            <FormSwitch
              name="is_active"
              control={control}
              label="Aktibong Produkto"
              description="Maaaring ibenta sa POS at hanapin sa tindahan."
            />
          </div>

          {/* Description */}
          <FormTextarea
            name="description"
            control={control}
            label="Paglalarawan / Tala (Opsyonal)"
            placeholder="Mga karagdagang detalye tungkol sa paninda..."
            rows={2}
          />
        </form>
      </ResponsiveDialog>

      {/* Single Scan Modal for Form Barcode Input */}
      <ScannerSheet
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        continuous={false}
        title="I-scan ang Barcode ng Produkto"
        onDetected={handleBarcodeScanned}
      />

      {/* Print Labels Dialog */}
      <PrintLabelsDialog
        open={isPrintLabelsOpen}
        onOpenChange={setIsPrintLabelsOpen}
        product={{
          name: watch('name'),
          price: watch('price'),
          barcode: watchedBarcode,
        }}
      />
    </>
  )
}

export default ProductFormDialog
