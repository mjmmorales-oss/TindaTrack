import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  AlertTriangle,
  Check,
  Package,
  Loader2,
  Barcode,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { aiService } from '@/services/aiService'
import { productService } from '@/services/productService'
import { cropBox } from '@/lib/imagePrep'
import { notify } from '@/lib/notify'

/**
 * Helper to determine confidence badge styling.
 */
function getConfidenceStyle(confidence = 0) {
  const pct = Math.round(confidence * 100)
  if (pct >= 90) {
    return {
      text: `${pct}%`,
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    }
  }
  if (pct >= 75) {
    return {
      text: `${pct}%`,
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    }
  }
  return {
    text: `${pct}%`,
    className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
  }
}

/**
 * AiProductReviewTable Component.
 * Large review dialog for bulk intake of detected products from photo.
 * Generates image crops, pre-fills name/barcode/category/pricing, displays duplicate warnings,
 * allows restock redirects, and calls bulk create + feedback.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {object} props.scanResult - Result from aiService.productScan
 * @param {Blob} [props.imageBlob] - Original captured image
 * @param {() => void} [props.onSaved] - Callback when products are created
 * @param {(product: object) => void} [props.onRestockProduct] - Callback when user clicks "Restock X instead"
 */
export function AiProductReviewTable({
  open,
  onOpenChange,
  scanResult,
  imageBlob,
  onSaved,
  onRestockProduct,
}) {
  const { t } = useTranslation(['products', 'pos', 'common'])
  const { data: categoriesRes } = useCategories()
  const categories = useMemo(() => categoriesRes?.data || [], [categoriesRes?.data])

  const [rows, setRows] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const firstPriceInputRef = useRef(null)

  // Initialize rows from scanResult and extract crops
  useEffect(() => {
    if (!open || !scanResult?.products) return

    let isMounted = true

    const initRows = async () => {
      const candidates = scanResult.products || []
      const prepared = []

      for (let idx = 0; idx < candidates.length; idx++) {
        const c = candidates[idx]
        let cropBlob = null
        let cropUrl = null

        if (imageBlob && c.bounding_box && c.bounding_box.length === 4) {
          try {
            cropBlob = await cropBox(imageBlob, c.bounding_box)
            cropUrl = URL.createObjectURL(cropBlob)
          } catch {
            // fallback if canvas crop fails
          }
        }

        // Match category by suggested name
        let matchedCategoryId = ''
        if (c.suggested_category) {
          const cat = categories.find(
            (catItem) =>
              catItem.name.toLowerCase() === c.suggested_category.toLowerCase(),
          )
          if (cat) matchedCategoryId = cat.id
        }

        prepared.push({
          id: c.id || `candidate_${idx}`,
          selected: !c.is_duplicate, // Duplicate rows start unchecked
          name: c.suggested_name || '',
          original_name: c.suggested_name || '',
          official_name: c.official_name || null,
          brand: c.brand || '',
          size: c.size || '',
          category_id: matchedCategoryId,
          original_category_id: matchedCategoryId,
          barcode: c.suggested_barcode || '',
          price: c.suggested_price ? String(c.suggested_price) : '',
          cost: c.suggested_cost ? String(c.suggested_cost) : '',
          stock: c.estimated_count || 5,
          confidence: c.confidence || 0.9,
          bounding_box: c.bounding_box,
          is_duplicate: Boolean(c.is_duplicate),
          possible_duplicate: c.possible_duplicate_product || null,
          cropBlob,
          cropUrl,
          online_image_url: c.online_image_url || null,
          use_online_image: false,
        })
      }

      if (isMounted) {
        setRows(prepared)
        // Autofocus first price input after render
        setTimeout(() => {
          firstPriceInputRef.current?.focus()
        }, 200)
      }
    }

    initRows()

    return () => {
      isMounted = false
    }
  }, [open, scanResult, imageBlob, categories])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      rows.forEach((r) => {
        if (r.cropUrl) URL.revokeObjectURL(r.cropUrl)
      })
    }
  }, [rows])

  // Row field updater
  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    )
  }

  // Toggle selection
  const toggleSelect = (id) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)),
    )
  }

  // Select / Deselect all
  const selectAll = (checked) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })))
  }

  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows])
  const areAllSelected = rows.length > 0 && selectedCount === rows.length

  // Validation
  const hasInvalidSelectedRows = useMemo(() => {
    const selected = rows.filter((r) => r.selected)
    return selected.some(
      (r) =>
        !r.name.trim() ||
        !r.price ||
        Number(r.price) <= 0 ||
        !r.category_id ||
        Number(r.category_id) <= 0,
    )
  }, [rows])

  // Handle Save Selected Products
  const handleSaveSelected = async () => {
    const selectedRows = rows.filter((r) => r.selected)
    if (selectedRows.length === 0) return

    setIsSaving(true)
    try {
      // 1. Prepare products payload for bulk creation
      const payload = selectedRows.map((r) => ({
        name: r.name.trim(),
        barcode: r.barcode.trim() || null,
        category_id: Number(r.category_id),
        price: Number(r.price),
        cost_price: Number(r.cost || 0),
        stock_quantity: Number(r.stock || 0),
        cost: Number(r.cost || 0),
        initial_stock: Number(r.stock || 0),
        min_stock: 5,
      }))

      const res = await aiService.bulkCreateProducts(payload)
      const createdProducts = res?.products || res?.data || []

      // 2. Upload crops for created products
      for (let i = 0; i < selectedRows.length; i++) {
        const row = selectedRows[i]
        const created = createdProducts[i]
        if (created?.id && (row.cropBlob || row.online_image_url)) {
          try {
            if (row.use_online_image && row.online_image_url) {
              await productService.importImage(created.id, row.online_image_url)
            } else if (row.cropBlob) {
              await productService.uploadImage(created.id, row.cropBlob, 'ai_crop')
            }
          } catch {
            // non-fatal image upload error
          }
        }
      }

      // 3. Prepare and send feedback
      const feedbackLines = rows.map((r) => {
        if (!r.selected) {
          return {
            line_id: r.id,
            status: 'removed',
            original_product_id: null,
            final_product_id: null,
            original_quantity: r.stock,
            final_quantity: 0,
          }
        }
        const nameChanged = r.name !== r.original_name
        const catChanged = r.category_id !== r.original_category_id
        return {
          line_id: r.id,
          status: nameChanged || catChanged ? 'product_changed' : 'accepted',
          original_product_id: null,
          final_product_id: null,
          original_quantity: r.stock,
          final_quantity: r.stock,
        }
      })

      if (scanResult?.scan_id) {
        aiService.sendFeedback(scanResult.scan_id, feedbackLines).catch(() => {})
      }

      notify.success(
        t('products:aiBulkCreateSuccess', 'Products added'),
        t('products:aiBulkCreateSuccessDesc', {
          count: selectedRows.length,
          defaultValue: `Successfully added ${selectedRows.length} products to inventory.`,
        }),
      )

      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      notify.error(
        t('products:aiBulkCreateError', 'Failed to add products'),
        err?.message || 'Please verify product prices and details.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span>{t('products:aiReviewTitle', 'Add Products from Photo (AI)')}</span>
        </div>
      }
      description={t(
        'products:aiReviewDesc',
        'Review detected products, confirm prices and details, and save them in bulk.',
      )}
      className="sm:max-w-5xl"
    >
      <div className="flex flex-col gap-4 py-2">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-candidates"
              checked={areAllSelected}
              onCheckedChange={(val) => selectAll(Boolean(val))}
            />
            <label
              htmlFor="select-all-candidates"
              className="text-xs font-semibold text-foreground cursor-pointer select-none"
            >
              {t('common:selectAll', 'Select all')} ({selectedCount} of {rows.length})
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1 font-mono">
              <Package className="w-3.5 h-3.5 text-primary" />
              {rows.length} {t('products:detectedItems', 'detected')}
            </Badge>
          </div>
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block max-h-[60vh] overflow-y-auto border rounded-xl bg-card">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-md border-b">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3 w-16">{t('products:photoCol', 'Crop')}</th>
                <th className="p-3 min-w-[200px]">{t('products:nameCol', 'Product Name & Barcode')}</th>
                <th className="p-3 w-36">{t('products:categoryCol', 'Category')}</th>
                <th className="p-3 w-24">{t('products:priceCol', 'Price (₱)')}</th>
                <th className="p-3 w-20">{t('products:costCol', 'Cost (₱)')}</th>
                <th className="p-3 w-20">{t('products:stockCol', 'Stock')}</th>
                <th className="p-3 w-28 text-right">{t('products:statusCol', 'Confidence')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row, idx) => {
                const confStyle = getConfidenceStyle(row.confidence)
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.selected
                        ? 'bg-background hover:bg-muted/30'
                        : 'bg-muted/20 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <td className="p-3 align-middle">
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={() => toggleSelect(row.id)}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>

                    {/* Image Crop Thumbnail */}
                    <td className="p-3 align-middle">
                      <div className="relative w-12 h-12 rounded-lg bg-neutral-900 border overflow-hidden flex items-center justify-center shrink-0">
                        {row.use_online_image && row.online_image_url ? (
                          <img
                            src={row.online_image_url}
                            alt={row.name}
                            className="w-full h-full object-cover"
                          />
                        ) : row.cropUrl ? (
                          <img
                            src={row.cropUrl}
                            alt={row.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground opacity-50" />
                        )}
                      </div>
                    </td>

                    {/* Product Name, Suggestion, and Barcode */}
                    <td className="p-3 align-middle space-y-1.5">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                        placeholder="Product name"
                        className="h-8 text-base md:text-xs font-medium"
                      />

                      {row.official_name && row.official_name !== row.name && (
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, 'name', row.official_name)}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20"
                          title="Click to use official GTIN product name"
                        >
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span>Use: {row.official_name}</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Barcode className="w-3.5 h-3.5 shrink-0" />
                        <Input
                          value={row.barcode}
                          onChange={(e) => updateRow(row.id, 'barcode', e.target.value)}
                          placeholder="Barcode / EAN"
                          className="h-7 text-base md:text-[11px] font-mono"
                        />
                      </div>

                      {/* Duplicate Alert Chip */}
                      {row.is_duplicate && row.possible_duplicate && (
                        <div className="flex items-center gap-2 p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            Looks like: <strong>{row.possible_duplicate.name}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateRow(row.id, 'selected', false)
                              onRestockProduct?.(row.possible_duplicate)
                            }}
                            className="text-primary hover:underline font-semibold text-[10px] shrink-0 ml-auto"
                          >
                            Restock instead →
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Category Select */}
                    <td className="p-3 align-middle">
                      <select
                        value={row.category_id || ''}
                        onChange={(e) =>
                          updateRow(row.id, 'category_id', e.target.value ? Number(e.target.value) : '')
                        }
                        className={`w-full h-8 text-xs rounded-md border px-2 focus:ring-1 focus:outline-none ${
                          !row.category_id
                            ? 'border-destructive focus:ring-destructive'
                            : 'border-input bg-background focus:ring-primary'
                        }`}
                      >
                        <option value="">{t('products:selectCategory', 'Select category')}</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Price Input (Autofocus first row) */}
                    <td className="p-3 align-middle">
                      <Input
                        ref={idx === 0 ? firstPriceInputRef : null}
                        type="number"
                        step="0.25"
                        min="0"
                        value={row.price}
                        onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                        placeholder="0.00"
                        className={`h-8 text-base md:text-xs font-semibold tabular-nums ${
                          row.selected && (!row.price || Number(row.price) <= 0)
                            ? 'border-destructive focus-visible:ring-destructive'
                            : ''
                        }`}
                        required
                      />
                    </td>

                    {/* Cost Input */}
                    <td className="p-3 align-middle">
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={row.cost}
                        onChange={(e) => updateRow(row.id, 'cost', e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-base md:text-xs tabular-nums text-muted-foreground"
                      />
                    </td>

                    {/* Initial Stock */}
                    <td className="p-3 align-middle">
                      <Input
                        type="number"
                        min="0"
                        value={row.stock}
                        onChange={(e) => updateRow(row.id, 'stock', Number(e.target.value))}
                        className="h-8 text-base md:text-xs tabular-nums text-center"
                      />
                    </td>

                    {/* Confidence */}
                    <td className="p-3 align-middle text-right">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${confStyle.className}`}
                      >
                        {confStyle.text}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (< md) */}
        <div className="md:hidden flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {rows.map((row, idx) => {
            const confStyle = getConfidenceStyle(row.confidence)
            return (
              <div
                key={row.id}
                className={`p-3 rounded-xl border flex flex-col gap-2.5 transition-all ${
                  row.selected
                    ? 'border-border bg-card'
                    : 'border-border/60 bg-muted/20 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={() => toggleSelect(row.id)}
                      id={`mobile-check-${row.id}`}
                    />
                    <label
                      htmlFor={`mobile-check-${row.id}`}
                      className="text-xs font-semibold cursor-pointer"
                    >
                      {row.selected ? 'Selected' : 'Ignored'}
                    </label>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${confStyle.className}`}
                  >
                    {confStyle.text}
                  </span>
                </div>

                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-neutral-900 border shrink-0 overflow-hidden flex items-center justify-center">
                    {row.cropUrl ? (
                      <img
                        src={row.cropUrl}
                        alt={row.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground opacity-50" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Input
                      ref={idx === 0 ? firstPriceInputRef : null}
                      value={row.name}
                      onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                      placeholder="Product name"
                      className="h-8 text-base md:text-xs font-medium"
                    />

                    {row.official_name && row.official_name !== row.name && (
                      <button
                        type="button"
                        onClick={() => updateRow(row.id, 'name', row.official_name)}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20"
                      >
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span>Use: {row.official_name}</span>
                      </button>
                    )}
                  </div>
                </div>

                {row.is_duplicate && row.possible_duplicate && (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex flex-col gap-1">
                    <span>
                      Looks like: <strong>{row.possible_duplicate.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        updateRow(row.id, 'selected', false)
                        onRestockProduct?.(row.possible_duplicate)
                      }}
                      className="text-primary hover:underline font-semibold text-xs text-left"
                    >
                      Restock {row.possible_duplicate.name} instead →
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      {t('products:categoryLabel', 'Category')} *
                    </label>
                    <select
                      value={row.category_id || ''}
                      onChange={(e) =>
                        updateRow(row.id, 'category_id', e.target.value ? Number(e.target.value) : '')
                      }
                      className={`w-full h-8 text-xs rounded-md border px-2 ${
                        !row.category_id
                          ? 'border-destructive focus:ring-destructive'
                          : 'border-input bg-background'
                      }`}
                    >
                      <option value="">{t('products:selectCategory', 'Select category')}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground">Barcode</label>
                    <Input
                      value={row.barcode}
                      onChange={(e) => updateRow(row.id, 'barcode', e.target.value)}
                      placeholder="Barcode"
                      className="h-8 text-base md:text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      Price (₱) <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={row.price}
                      onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-base md:text-xs font-semibold tabular-nums"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground">Initial Stock</label>
                    <Input
                      type="number"
                      min="0"
                      value={row.stock}
                      onChange={(e) => updateRow(row.id, 'stock', Number(e.target.value))}
                      className="h-8 text-base md:text-xs tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
          <p className="text-xs text-muted-foreground">
            {t('products:aiSelectedReady', {
              count: selectedCount,
              defaultValue: `${selectedCount} products ready to add`,
            })}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedCount === 0 || hasInvalidSelectedRows || isSaving}
              onClick={handleSaveSelected}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('products:aiSavingBulk', 'Adding products...')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t('products:aiSaveSelectedBtn', {
                    count: selectedCount,
                    defaultValue: `Save selected (${selectedCount})`,
                  })}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default AiProductReviewTable
