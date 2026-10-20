import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
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
import {
  useCreateProduct,
  useUpdateProduct,
  useProducts,
  useUploadProductImage,
  useDeleteProductImage,
} from '@/features/products/hooks/useProducts'
import { usePermissions } from '@/hooks/usePermissions'
import { Barcode } from '@/lib/barcode'
import { lookupBarcode } from '@/services/barcode'
import { notify } from '@/lib/notify'
import { resolveImageUrl } from '@/lib/images'
import { resizeImage } from '@/lib/imageResize'
import { getAutoBarcodeLookup } from '@/lib/barcodeSettings'
import { applyServerErrors } from '@/lib/formErrors'

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
  const { t } = useTranslation(['products', 'common'])
  const currentProduct = product || DEFAULT_PRODUCT
  const isEdit = Boolean(currentProduct.id && !currentProduct.__isDuplicate)
  const { can } = usePermissions()
  const canViewCost = can('products.view_cost')

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const uploadImageMutation = useUploadProductImage()
  const deleteImageMutation = useDeleteProductImage()

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
  const [pendingImage, setPendingImage] = useState(null)
  const [isOptimizingImage, setIsOptimizingImage] = useState(false)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadImageMutation.isPending ||
    deleteImageMutation.isPending ||
    isOptimizingImage

  const priceInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

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
      setPendingImage(null)
      setImageRemoved(false)
      setIsOptimizingImage(false)
      setShowUrlInput(false)
    }
  }, [open, product, reset])

  const handleImageFile = async (file, source = 'upload') => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      notify.error(t('products:imageFileTooLarge'))
      return
    }
    setIsOptimizingImage(true)
    try {
      const resized = await resizeImage(file)
      setPendingImage({
        file: resized.file,
        dataUrl: resized.dataUrl,
        sizeBytes: resized.sizeBytes,
        source,
      })
      setValue('image_url', resized.dataUrl, { shouldValidate: true })
      setImageRemoved(false)
      setImageError(false)
    } catch (err) {
      notify.error('Failed to process image: ' + err.message)
    } finally {
      setIsOptimizingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => {
    setPendingImage(null)
    setValue('image_url', '', { shouldValidate: true })
    setImageRemoved(true)
    setImageError(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

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
          setError('barcode', { message: t('products:invalidBarcodeFormat') })
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
            t('products:barcodeRegisteredTitle'),
            t('products:barcodeRegisteredDesc', { name: res.local_product.name }),
          )
          return
        }

        // A deleted product used this barcode; saving creates a new product (codes were freed on delete).
        if (res?.archived_product && !isEdit) {
          notify.info(
            t('products:archivedBarcodeHintTitle', 'Barcode from a deleted product'),
            t('products:archivedBarcodeHint', { name: res.archived_product.name }),
          )
        }

        // 2. Catalog found hit
        if (res?.catalog?.found) {
          const cat = res.catalog
          setLookupAttribution(cat.attribution || t('products:openFoodFactsAttribution'))

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

          notify.success(t('products:foundOnOffTitle'), t('products:foundOnOffDesc'))

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
              t('products:notFoundOnlineAlert'),
              t('products:notFoundOnlineAlert'),
            )
          }
        }
      } catch (err) {
        if (!isAutoRun) {
          notify.error(t('products:lookupError'), err?.message || t('products:lookupError'))
        }
      } finally {
        setIsLookingUp(false)
      }
    },
    [watchedBarcode, isEdit, product?.id, watch, setValue, setError, clearErrors, t],
  )

  // Handle scanned barcode from ScannerSheet
  const handleBarcodeScanned = (scannedCode) => {
    const normalized = Barcode.normalize(scannedCode)
    setValue('barcode', normalized, { shouldValidate: true })
    setIsScannerOpen(false)

    // Auto-run online lookup when a valid GTIN is scanned in create mode
    if (!isEdit && Barcode.isValidGtin(normalized) && getAutoBarcodeLookup()) {
      handleOnlineLookup(normalized, true)
    }
  }

  // Debounced auto-lookup when a valid GTIN is entered via keyboard or pasted
  const lastLookedUpRef = useRef('')
  useEffect(() => {
    if (isEdit || !watchedBarcode || !getAutoBarcodeLookup()) return
    const normalized = Barcode.normalize(watchedBarcode)
    if (!Barcode.isValidGtin(normalized) || lastLookedUpRef.current === normalized) {
      return
    }

    const timer = setTimeout(() => {
      lastLookedUpRef.current = normalized
      handleOnlineLookup(normalized, true)
    }, 500)

    return () => clearTimeout(timer)
  }, [watchedBarcode, isEdit, handleOnlineLookup])

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
    notify.success(t('products:internalBarcodeTitle'), t('products:internalBarcodeDesc', { barcode: internalBarcode }))
  }

  const onSubmit = async (values) => {
    if (localDuplicate) {
      notify.error(t('products:duplicateBarcodeTitle'), t('products:duplicateBarcodeDesc'))
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
        image_url: pendingImage ? null : (values.image_url?.trim() || null),
        source: values.source || 'manual',
        source_ref: values.source_ref || null,
      }

      if (imageRemoved) {
        payload.image_url = null
      }

      let savedProduct
      if (isEdit) {
        delete payload.stock_quantity
        const res = await updateMutation.mutateAsync({ id: product.id, data: payload })
        savedProduct = res.data
        if (imageRemoved && product.image_url) {
          try {
            await deleteImageMutation.mutateAsync(product.id)
          } catch {
            // Ignore if image was already deleted
          }
        }
      } else {
        const res = await createMutation.mutateAsync(payload)
        savedProduct = res.data
      }

      // If user selected a new photo, upload it as a binary file to the database
      if (pendingImage && savedProduct?.id) {
        await uploadImageMutation.mutateAsync({
          id: savedProduct.id,
          file: pendingImage.file,
          source: pendingImage.source || 'upload',
        })
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      applyServerErrors(err, setError, {
        visibleFields: Object.keys(DEFAULT_PRODUCT),
      })
    }
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={
          isEdit
            ? t('products:editProductModalTitle', { name: product.name })
            : product?.__isDuplicate
            ? t('products:duplicateProductModalTitle')
            : t('products:createProductModalTitle')
        }
        description={
          isEdit
            ? t('products:editProductModalDesc')
            : t('products:createProductModalDesc')
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
                  {t('products:printBarcodeLabel')}
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
                {t('common:cancel')}
              </Button>
              <Button
                type="submit"
                form="product-form"
                disabled={isPending || Boolean(localDuplicate)}
                className="gap-1.5 font-bold"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? t('products:saveChanges') : t('products:addProduct')}
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
                {t('products:duplicateBarcodeAlert', { name: localDuplicate.name, sku: localDuplicate.sku })}
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
                  {t('products:viewOnOff')}
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
                {t('products:notFoundOnlineAlert')}
              </AlertDescription>
            </Alert>
          )}

          {/* Barcode Field with Scan & Online Lookup Toolbar */}
          <div className="space-y-1.5 p-3 rounded-xl border border-border/80 bg-muted/20">
            <div className="flex items-center justify-between">
              <label htmlFor="product-barcode" className="text-xs font-bold text-foreground">
                {t('products:barcodeCol')}
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
                  {t('products:scanBarcodeButton')}
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
                  {t('products:searchOnlineButton')}
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
                    {t('products:generateHomemadeBarcode')}
                  </Button>
                )}
              </div>
            </div>

            <FormInput
              id="product-barcode"
              name="barcode"
              control={control}
              placeholder={t('products:barcodePlaceholder')}
              className="font-mono text-sm"
            />
          </div>

          {/* Name (Full Width) */}
          <FormInput
            name="name"
            control={control}
            label={t('products:nameLabel')}
            placeholder={t('products:namePlaceholder')}
            className="text-base md:text-sm"
          />

          {/* Brand & Size */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              name="brand"
              control={control}
              label={t('products:brandLabel')}
              placeholder={t('products:brandPlaceholder')}
            />
            <FormInput
              name="size"
              control={control}
              label={t('products:sizeLabel')}
              placeholder={t('products:sizePlaceholder')}
            />
          </div>

          {/* Product Photo Upload, Camera, & Preview */}
          <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-muted/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                {t('products:uploadImage')}
              </label>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isOptimizingImage || isPending}
                  className="h-7 text-[11px] px-2 gap-1"
                >
                  <Upload className="h-3 w-3" />
                  {t('products:uploadImage')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isOptimizingImage || isPending}
                  className="h-7 text-[11px] px-2 gap-1"
                >
                  <Camera className="h-3 w-3" />
                  {t('products:takePhoto')}
                </Button>
                {(pendingImage || (watchedImageUrl && !imageRemoved)) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={isPending}
                    className="h-7 text-[11px] px-2 gap-1 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t('products:removeImage')}
                  </Button>
                )}
              </div>
            </div>

            {/* Hidden file and camera inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageFile(e.target.files?.[0], 'upload')}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleImageFile(e.target.files?.[0], 'camera')}
            />

            {/* Thumbnail preview and status card */}
            <div className="flex items-center gap-3 bg-card p-2.5 rounded-lg border border-border/60">
              <div className="relative h-16 w-16 rounded-lg border border-border overflow-hidden shrink-0 bg-muted/40 flex items-center justify-center">
                {isOptimizingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (pendingImage?.dataUrl || resolveImageUrl(watchedImageUrl)) && !imageError ? (
                  <img
                    src={pendingImage?.dataUrl || resolveImageUrl(watchedImageUrl)}
                    alt={t('products:uploadImage')}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                {isOptimizingImage ? (
                  <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('products:optimizingImage')}
                  </p>
                ) : pendingImage ? (
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('products:imageSourcePending')} ({Math.round(pendingImage.sizeBytes / 1024)} KB)
                    </span>
                  </div>
                ) : watchedImageUrl && watchedImageUrl.includes('openfoodfacts') ? (
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-highlight/15 px-2 py-0.5 text-[11px] font-semibold text-highlight">
                      <Sparkles className="h-3 w-3" />
                      {t('products:imageSourceOff')}
                    </span>
                  </div>
                ) : watchedImageUrl && watchedImageUrl.includes('/api/product-images/') ? (
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      {t('products:imageSourceLocal')}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t('products:dragOrClickPhoto')}
                  </p>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    {showUrlInput ? 'Hide photo URL' : 'Or paste photo URL'}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional manual URL input */}
            {showUrlInput && (
              <div className="pt-1">
                <FormInput
                  name="image_url"
                  control={control}
                  label={t('products:imageUrlLabel')}
                  placeholder={t('products:imageUrlPlaceholder')}
                  description={t('products:imageUrlDesc')}
                />
              </div>
            )}
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormSelect
              name="category_id"
              control={control}
              label={t('products:categoryLabel')}
              options={categoryOptions}
              placeholder={t('products:categoryPlaceholder')}
            />
            <FormSelect
              name="unit"
              control={control}
              label={t('products:unitLabel')}
              options={PRODUCT_UNITS}
              placeholder={t('products:unitPlaceholder')}
            />
          </div>

          {/* SKU */}
          <FormInput
            name="sku"
            control={control}
            label={t('products:skuLabel')}
            placeholder={t('products:skuPlaceholder')}
            description={t('products:skuDesc')}
          />

          {/* Pricing: Selling Price & Cost Price */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              name="price"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <Field data-invalid={!!error}>
                  <FieldLabel htmlFor="product-price">{t('products:priceLabel')}</FieldLabel>
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
                    <FieldLabel htmlFor="product-cost">{t('products:costLabel')}</FieldLabel>
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
                {t('products:costHigherThanPriceDesc', { cost: watchedCost.toFixed(2), price: watchedPrice.toFixed(2) })}
              </AlertDescription>
            </Alert>
          )}

          {/* Stock Quantity & Reorder Level */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              name="stock_quantity"
              control={control}
              label={t('products:initialStockLabel')}
              type="number"
              inputMode="numeric"
              disabled={isEdit}
              description={isEdit ? t('products:stockDisabledDesc') : undefined}
            />
            <FormInput
              name="reorder_level"
              control={control}
              label={t('products:reorderLevelLabel')}
              type="number"
              inputMode="numeric"
              description={t('products:reorderLevelDesc')}
            />
          </div>

          {/* Active Status */}
          <div className="rounded-lg border border-border/70 p-3 bg-muted/20">
            <FormSwitch
              name="is_active"
              control={control}
              label={t('products:isActiveLabel')}
              description={t('products:isActiveDesc')}
            />
          </div>

          {/* Description */}
          <FormTextarea
            name="description"
            control={control}
            label={t('products:descriptionLabel')}
            placeholder={t('products:descriptionPlaceholder')}
            rows={2}
          />
        </form>
      </ResponsiveDialog>

      {/* Single Scan Modal for Form Barcode Input */}
      <ScannerSheet
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        continuous={false}
        title={t('products:scanSheetTitle')}
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
