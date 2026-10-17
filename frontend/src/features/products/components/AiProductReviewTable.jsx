import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  AlertTriangle,
  Check,
  Package,
  Loader2,
  Barcode,
  ChevronDown,
  ChevronUp,
  Trash2,
  RotateCcw,
  Info,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { aiService } from '@/services/aiService'
import { productService } from '@/services/productService'
import { cropBox } from '@/lib/imagePrep'
import { notify } from '@/lib/notify'
import { buildProductFeedbackLines } from '@/lib/aiContract.js'

const PRODUCT_UNITS = [
  'pc',
  'pack',
  'can',
  'bottle',
  'sachet',
  'box',
  'roll',
  'bag',
  'kg',
  'g',
  'L',
  'ml',
]

/**
 * Validates a single row and returns its readiness status and message.
 *
 * @param {object} row
 * @param {Function} t - translation function
 * @returns {{ status: 'ready'|'needs_info'|'check', message: string, missingField?: string }}
 */
function getRowStatus(row, t) {
  if (!row.name || !row.name.trim()) {
    return {
      status: 'needs_info',
      message: t('products:missingName', 'Missing name'),
      missingField: 'name',
    }
  }
  if (!row.category_id || Number(row.category_id) <= 0) {
    return {
      status: 'needs_info',
      message: t('products:missingCategory', 'Missing category'),
      missingField: 'category_id',
    }
  }
  if (!row.price || Number(row.price) <= 0) {
    return {
      status: 'needs_info',
      message: t('products:missingPrice', 'Price required'),
      missingField: 'price',
    }
  }
  if (row.confidence !== undefined && row.confidence < 0.75) {
    return {
      status: 'check',
      message: t('products:checkThis', 'Check this'),
    }
  }
  return {
    status: 'ready',
    message: t('products:ready', 'Ready'),
  }
}

/**
 * AiProductReviewTable Component (AI Stock-In).
 * Review sheet for bulk intake of up to 5 detected products from photo.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {object} props.scanResult - Result from aiService.productScan
 * @param {Blob} [props.imageBlob] - Original captured image
 * @param {() => void} [props.onSaved] - Callback when products are created
 * @param {(product: object, initialStock?: number) => void} [props.onRestockProduct] - Callback to restock duplicate item
 * @param {() => void} [props.onScanAgain] - Callback to reopen camera for another scan
 */
export function AiProductReviewTable({
  open,
  onOpenChange,
  scanResult,
  imageBlob,
  onSaved,
  onRestockProduct,
  onScanAgain,
}) {
  const { t } = useTranslation(['products', 'pos', 'common'])
  const { data: categoriesRes } = useCategories()
  const categories = useMemo(() => categoriesRes?.data || [], [categoriesRes?.data])

  const { data: settingsRes } = useSettings()
  const settings = settingsRes?.data || {}
  const defaultReorderLevel = Number(settings.low_stock_threshold ?? 5)

  const [rows, setRows] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [expandedRowIds, setExpandedRowIds] = useState(new Set())
  const [bulkCategoryVal, setBulkCategoryVal] = useState('')
  const firstPriceInputRef = useRef(null)

  // Initialize rows from scanResult (max 5) and generate crops
  useEffect(() => {
    if (!open || !scanResult?.products) return

    let isMounted = true

    const initRows = async () => {
      // Limit to at most 5 visible products
      const rawCandidates = (scanResult.products || []).slice(0, 5)
      const prepared = []

      for (let idx = 0; idx < rawCandidates.length; idx++) {
        const c = rawCandidates[idx]
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

        // Match category: use valid suggested_category_id or category_id.
        // NO silent default. If invalid/empty, leave empty string so user is prompted.
        let matchedCategoryId = c.suggested_category_id ? String(c.suggested_category_id) : (c.category_id ? String(c.category_id) : '')
        if (matchedCategoryId && categories.length > 0) {
          const catExists = categories.some((catItem) => Number(catItem.id) === Number(matchedCategoryId))
          if (!catExists) {
            matchedCategoryId = ''
          }
        }
        if (!matchedCategoryId && c.suggested_category && categories.length > 0) {
          const cat = categories.find(
            (catItem) => catItem.name.toLowerCase() === c.suggested_category.toLowerCase(),
          )
          if (cat) matchedCategoryId = String(cat.id)
        }

        // Starting stock: estimated_count || 1 (NEVER default to 5)
        const startingStock = Math.max(0, parseInt(c.estimated_count ?? 1, 10) || 1)

        prepared.push({
          id: c.id || `candidate_${idx}`,
          selected: !c.is_duplicate, // Duplicate rows start unchecked
          name: c.suggested_name || c.name || '',
          original_name: c.suggested_name || c.name || '',
          official_name: c.official_name || null,
          brand: c.brand || '',
          size: c.size || '',
          unit: c.unit || 'pc',
          category_id: matchedCategoryId,
          original_category_id: matchedCategoryId,
          barcode: c.suggested_barcode || c.barcode_text || c.barcode || '',
          // Selling price ALWAYS starts EMPTY (never prefilled by AI, owner must enter it)
          price: '',
          cost: c.suggested_cost !== undefined && c.suggested_cost !== null && c.suggested_cost !== ''
            ? String(c.suggested_cost)
            : '',
          stock: startingStock,
          reorder_level: defaultReorderLevel,
          confidence: c.confidence !== undefined ? Number(c.confidence) : 0.85,
          bounding_box: c.bounding_box,
          is_duplicate: Boolean(c.is_duplicate),
          possible_duplicate: c.possible_duplicate_product || c.possible_duplicate || null,
          cropBlob,
          cropUrl,
          online_image_url: c.online_image_url || null,
          use_online_image: false,
          errors: {},
        })
      }

      if (isMounted) {
        setRows(prepared)
        setExpandedRowIds(new Set())
        // Autofocus first price input after short render tick
        setTimeout(() => {
          firstPriceInputRef.current?.focus()
        }, 180)
      }
    }

    initRows()

    return () => {
      isMounted = false
    }
  }, [open, scanResult, imageBlob, categories, defaultReorderLevel])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      rows.forEach((r) => {
        if (r.cropUrl) URL.revokeObjectURL(r.cropUrl)
      })
    }
  }, [rows])

  // Row field updater (clears any server/validation error on that field)
  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updatedErrors = { ...r.errors }
        delete updatedErrors[field]
        return {
          ...r,
          [field]: value,
          errors: updatedErrors,
        }
      }),
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

  // Toggle advanced collapsible per row
  const toggleAdvanced = (id) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Bulk helper: apply category to all selected rows
  const handleApplyCategoryToSelected = (catId) => {
    if (!catId) return
    setRows((prev) =>
      prev.map((r) => {
        if (!r.selected) return r
        const updatedErrors = { ...r.errors }
        delete updatedErrors.category_id
        return {
          ...r,
          category_id: String(catId),
          errors: updatedErrors,
        }
      }),
    )
    setBulkCategoryVal('')
    notify.info(t('common:success', 'Updated category for selected products.'))
  }

  // Bulk helper: remove selected rows
  const handleRemoveSelected = () => {
    const toKeep = rows.filter((r) => !r.selected)
    setRows(toKeep)
    notify.info(t('products:itemsRemoved', 'Removed selected items.'))
  }

  // Individual row remove
  const handleRemoveRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows])
  const selectedCount = selectedRows.length
  const areAllSelected = rows.length > 0 && selectedCount === rows.length

  // Calculate ready rows among selected
  const readySelectedRows = useMemo(
    () =>
      selectedRows.filter((r) => {
        const s = getRowStatus(r, t).status
        return s === 'ready' || s === 'check'
      }),
    [selectedRows, t],
  )

  const isMoreThanFive = Boolean(
    scanResult?.more_than_five || (scanResult?.products?.length || 0) > 5,
  )

  // Handle Save Ready Items
  const handleSaveReadyItems = async () => {
    if (readySelectedRows.length === 0) {
      // Mark missing errors on selected rows
      setRows((prev) =>
        prev.map((r) => {
          if (!r.selected) return r
          const errors = {}
          if (!r.name.trim()) errors.name = t('products:missingName', 'Missing name')
          if (!r.category_id) errors.category_id = t('products:missingCategory', 'Missing category')
          if (!r.price || Number(r.price) <= 0) errors.price = t('products:missingPrice', 'Price required')
          return { ...r, errors }
        }),
      )
      notify.warning(
        t('products:aiNoReadyItems', 'No ready items selected'),
        t('products:aiFixErrorsFirst', 'Please fill in required fields (Name, Category, and Price) for at least one item.'),
      )
      return
    }

    setIsSaving(true)
    try {
      // Prepare payload with reorder_level, brand, size, unit
      const payload = readySelectedRows.map((r) => ({
        name: r.name.trim(),
        brand: r.brand.trim() || null,
        size: r.size.trim() || null,
        unit: r.unit || 'pc',
        category_id: Number(r.category_id),
        barcode: r.barcode.trim() || null,
        price: Number(r.price),
        cost_price: Number(r.cost || 0),
        stock_quantity: Number(r.stock || 0),
        reorder_level: Number(r.reorder_level || defaultReorderLevel || 5),
        image_url: r.use_online_image && r.online_image_url ? r.online_image_url : null,
      }))

      const res = await aiService.bulkCreateProducts(payload)
      const createdProducts = res?.data || res?.products || []

      // Upload image crops for created products matching index order
      for (let i = 0; i < readySelectedRows.length; i++) {
        const row = readySelectedRows[i]
        const created = createdProducts[i]
        if (created?.id && !row.use_online_image && row.cropBlob) {
          try {
            await productService.uploadImage(created.id, row.cropBlob, 'ai_crop')
          } catch {
            // Non-fatal image upload error
          }
        }
      }

      // Record feedback
      if (scanResult?.scan_id) {
        try {
          const feedbackPayload = buildProductFeedbackLines(rows, scanResult)
          aiService.sendFeedback(scanResult.scan_id, feedbackPayload.lines).catch(() => {})
        } catch {
          // Non-fatal feedback error
        }
      }

      const readyIds = new Set(readySelectedRows.map((r) => r.id))
      const remainingRows = rows.filter((r) => !readyIds.has(r.id))

      if (remainingRows.length === 0) {
        notify.success(
          t('products:aiBulkCreateSuccess', 'Products added'),
          t('products:aiBulkCreateSuccessDesc', {
            count: readySelectedRows.length,
            defaultValue: `Successfully added ${readySelectedRows.length} products to inventory.`,
          }),
        )
        onSaved?.()
        onOpenChange(false)
      } else {
        // Partial save: keep remaining rows open and show notice
        setRows(remainingRows)
        notify.info(
          t('products:aiPartialSaved', {
            count: readySelectedRows.length,
            defaultValue: `${readySelectedRows.length} products added`,
          }),
          t('products:aiRemainingNeedInfo', {
            remaining: remainingRows.length,
            defaultValue: `${remainingRows.length} items still need information.`,
          }),
        )
        onSaved?.()
      }
    } catch (err) {
      // Map 422 server errors to row indices
      const backendErrors =
        err?.response?.data?.errors || err?.errors || null

      if (backendErrors && typeof backendErrors === 'object') {
        const rowErrorMap = {}
        for (const [key, msgs] of Object.entries(backendErrors)) {
          const match = key.match(/^products\.(\d+)\.([a-zA-Z_-]+)$/)
          if (match) {
            const rowIndex = parseInt(match[1], 10)
            const field = match[2]
            const targetRow = readySelectedRows[rowIndex]
            if (targetRow) {
              if (!rowErrorMap[targetRow.id]) rowErrorMap[targetRow.id] = {}
              rowErrorMap[targetRow.id][field] = Array.isArray(msgs) ? msgs[0] : String(msgs)
            }
          }
        }

        if (Object.keys(rowErrorMap).length > 0) {
          setRows((prev) =>
            prev.map((r) => {
              if (rowErrorMap[r.id]) {
                return { ...r, errors: { ...r.errors, ...rowErrorMap[r.id] } }
              }
              return r
            }),
          )
        }
      }

      notify.error(
        t('products:aiBulkCreateError', 'Failed to add products'),
        err?.message || 'Please verify product prices and details.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleScanAgainClick = () => {
    onOpenChange(false)
    onScanAgain?.()
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
          <div>
            <h2 className="text-base font-bold leading-none">
              {t('products:aiStockIn', 'AI Stock-In')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-normal">
              {t('products:aiStockInSubtitle', 'Snap up to 5 new products at once')}
            </p>
          </div>
        </div>
      }
      description={t(
        'products:aiReviewDesc',
        'Review detected products, confirm prices and details, and save them in bulk.',
      )}
      className="sm:max-w-5xl"
    >
      <div className="flex flex-col gap-3 py-1">
        {/* Notice Banner: 5-product limit / more visible */}
        {isMoreThanFive && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
            <Info className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <strong>{t('products:moreThanFiveNotice', 'Showing 5 products. Scan again for the rest.')}</strong>
              <span className="block text-[11px] opacity-90">
                {t('products:aiMaxNotice', 'Gemini AI processes up to 5 products per photo.')}
              </span>
            </div>
            {onScanAgain && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleScanAgainClick}
                className="h-7 text-xs bg-background/80 hover:bg-background shrink-0"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {t('pos:aiScanAgain', 'Scan again')}
              </Button>
            )}
          </div>
        )}

        {/* Top Control Bar with Bulk Helpers */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/40 rounded-lg border border-border/60">
          <div className="flex items-center gap-3">
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
                {t('common:selectAll', 'Select all')} ({selectedCount}/{rows.length})
              </label>
            </div>

            {selectedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveSelected}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {t('products:removeSelected', 'Remove')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Bulk Apply Category */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkCategoryVal}
                  onChange={(e) => handleApplyCategoryToSelected(e.target.value)}
                  className="h-7 text-xs rounded-md border border-input bg-background px-2 font-medium"
                >
                  <option value="">{t('products:applyCategoryToSelected', 'Apply category to selected...')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Badge variant="outline" className="text-xs gap-1 font-mono">
              <Package className="w-3.5 h-3.5 text-primary" />
              {rows.length} {t('products:detectedItems', 'detected')}
            </Badge>
          </div>
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block max-h-[55vh] overflow-y-auto border rounded-xl bg-card">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-md border-b">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3 w-16">{t('products:photoCol', 'Crop')}</th>
                <th className="p-3 min-w-[220px]">{t('products:nameCol', 'Product Name & Barcode')}</th>
                <th className="p-3 w-36">{t('products:categoryCol', 'Category')} *</th>
                <th className="p-3 w-28">{t('products:priceCol', 'Price (₱)')} *</th>
                <th className="p-3 w-20">{t('products:costCol', 'Cost (₱)')}</th>
                <th className="p-3 w-20">{t('products:stockCol', 'Stock')}</th>
                <th className="p-3 w-32 text-right">{t('products:statusCol', 'Status')}</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row, idx) => {
                const statusInfo = getRowStatus(row, t)
                const isExpanded = expandedRowIds.has(row.id)
                const isLowConfidence = row.confidence < 0.75

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.selected
                        ? isLowConfidence
                          ? 'bg-amber-500/5 hover:bg-amber-500/10'
                          : 'bg-background hover:bg-muted/30'
                        : 'bg-muted/20 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <td className="p-3 align-middle">
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={() => toggleSelect(row.id)}
                        aria-label={`Select ${row.name || 'product'}`}
                      />
                    </td>

                    {/* Image Crop & OFF toggle */}
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

                      {row.online_image_url && (
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, 'use_online_image', !row.use_online_image)}
                          className="mt-1 text-[9px] text-primary hover:underline block truncate max-w-[60px]"
                          title="Toggle between cropped camera photo and Open Food Facts online photo"
                        >
                          {row.use_online_image ? 'Use crop' : 'Use web'}
                        </button>
                      )}
                    </td>

                    {/* Name, Suggestions, Duplicate alert */}
                    <td className="p-3 align-middle space-y-1.5">
                      <div className="space-y-1">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                          placeholder="Product name"
                          className={`h-8 text-base md:text-xs font-medium ${
                            row.errors.name ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                        />
                        {row.errors.name && (
                          <p className="text-[10px] text-destructive">{row.errors.name}</p>
                        )}
                      </div>

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

                      {/* Duplicate Alert Banner */}
                      {row.is_duplicate && row.possible_duplicate && (
                        <div className="flex items-center gap-2 p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {t('products:alreadyInCatalog', 'Already in catalog')}: Looks like: <strong>{row.possible_duplicate.name}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateRow(row.id, 'selected', false)
                              onRestockProduct?.(row.possible_duplicate, row.stock)
                            }}
                            className="text-primary hover:underline font-bold text-[10px] shrink-0 ml-auto whitespace-nowrap"
                          >
                            {t('products:restockInstead', 'Add stock instead')} →
                          </button>
                        </div>
                      )}

                      {/* Advanced Collapsible Line */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleAdvanced(row.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-0.5"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          <span>{t('products:advanced', 'Advanced')}</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-2 rounded bg-muted/30 border border-border/60 space-y-2 text-[11px]">
                            <p className="text-muted-foreground font-mono text-[10px]">
                              {t('products:skuAutoGenerated', 'SKU: auto-generated on save')}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground block">Brand</label>
                                <Input
                                  value={row.brand}
                                  onChange={(e) => updateRow(row.id, 'brand', e.target.value)}
                                  placeholder="Brand"
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block">Size / Net</label>
                                <Input
                                  value={row.size}
                                  onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                                  placeholder="e.g. 350ml"
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground block">Unit</label>
                                <select
                                  value={row.unit}
                                  onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                                  className="w-full h-7 text-xs rounded-md border border-input bg-background px-1.5"
                                >
                                  {PRODUCT_UNITS.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {t('products:reorderLevelCol', 'Low-stock alert')}:
                              </label>
                              <Input
                                type="number"
                                min="0"
                                value={row.reorder_level}
                                onChange={(e) => updateRow(row.id, 'reorder_level', Number(e.target.value))}
                                className="h-7 w-20 text-xs tabular-nums"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Category Select (Required, NO silent default) */}
                    <td className="p-3 align-middle">
                      <select
                        value={row.category_id || ''}
                        onChange={(e) => updateRow(row.id, 'category_id', e.target.value)}
                        className={`w-full h-8 text-xs rounded-md border px-2 focus:ring-1 focus:outline-none ${
                          row.errors.category_id || (row.selected && !row.category_id)
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
                      {row.errors.category_id && (
                        <p className="text-[10px] text-destructive mt-1">{row.errors.category_id}</p>
                      )}
                    </td>

                    {/* Price Input (Required, > 0) */}
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
                          row.errors.price || (row.selected && (!row.price || Number(row.price) <= 0))
                            ? 'border-destructive focus-visible:ring-destructive'
                            : ''
                        }`}
                        required
                      />
                      {row.errors.price && (
                        <p className="text-[10px] text-destructive mt-1">{row.errors.price}</p>
                      )}
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

                    {/* Initial Stock (default: estimated_count || 1) */}
                    <td className="p-3 align-middle">
                      <Input
                        type="number"
                        min="0"
                        value={row.stock}
                        onChange={(e) => updateRow(row.id, 'stock', Number(e.target.value))}
                        className="h-8 text-base md:text-xs tabular-nums text-center"
                      />
                    </td>

                    {/* Status Pill */}
                    <td className="p-3 align-middle text-right">
                      {statusInfo.status === 'ready' && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
                          <Check className="w-3 h-3" />
                          {statusInfo.message}
                        </Badge>
                      )}
                      {statusInfo.status === 'check' && (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          {statusInfo.message}
                        </Badge>
                      )}
                      {statusInfo.status === 'needs_info' && (
                        <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-500/30 gap-1 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {statusInfo.message}
                        </Badge>
                      )}
                    </td>

                    {/* Delete button */}
                    <td className="p-3 align-middle text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRow(row.id)}
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        title={t('products:remove', 'Remove')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (< md) */}
        <div className="md:hidden flex flex-col gap-3 max-h-[55vh] overflow-y-auto">
          {rows.map((row, idx) => {
            const statusInfo = getRowStatus(row, t)
            const isExpanded = expandedRowIds.has(row.id)
            const isLowConfidence = row.confidence < 0.75

            return (
              <div
                key={row.id}
                className={`p-3 rounded-xl border flex flex-col gap-2.5 transition-all ${
                  row.selected
                    ? isLowConfidence
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-border bg-card'
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
                      className="text-xs font-semibold cursor-pointer select-none"
                    >
                      {row.selected ? t('products:selectedStatus', 'Selected') : t('products:ignoredStatus', 'Ignored')}
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {statusInfo.status === 'ready' && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                        <Check className="w-3 h-3" />
                        {statusInfo.message}
                      </Badge>
                    )}
                    {statusInfo.status === 'check' && (
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px]">
                        <AlertTriangle className="w-3 h-3" />
                        {statusInfo.message}
                      </Badge>
                    )}
                    {statusInfo.status === 'needs_info' && (
                      <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-500/30 gap-1 text-[10px]">
                        <AlertTriangle className="w-3 h-3" />
                        {statusInfo.message}
                      </Badge>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRow(row.id)}
                      className="w-6 h-6 text-muted-foreground hover:text-destructive ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-neutral-900 border shrink-0 overflow-hidden flex items-center justify-center">
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
                      <Package className="w-6 h-6 text-muted-foreground opacity-50" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Input
                      ref={idx === 0 ? firstPriceInputRef : null}
                      value={row.name}
                      onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                      placeholder="Product name"
                      className="h-9 text-base font-medium"
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
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col gap-1">
                    <span>
                      {t('products:alreadyInCatalog', 'Already in catalog')}: Looks like: <strong>{row.possible_duplicate.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        updateRow(row.id, 'selected', false)
                        onRestockProduct?.(row.possible_duplicate, row.stock)
                      }}
                      className="text-primary hover:underline font-bold text-xs text-left"
                    >
                      {t('products:restockInstead', 'Add stock instead')} →
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
                      onChange={(e) => updateRow(row.id, 'category_id', e.target.value)}
                      className={`w-full h-9 text-base rounded-md border px-2 ${
                        row.errors.category_id || (row.selected && !row.category_id)
                          ? 'border-destructive'
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
                    <label className="text-[10px] text-muted-foreground">
                      {t('products:priceCol', 'Price (₱)')} *
                    </label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={row.price}
                      onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                      placeholder="0.00"
                      className={`h-9 text-base font-semibold tabular-nums ${
                        row.errors.price || (row.selected && (!row.price || Number(row.price) <= 0))
                          ? 'border-destructive'
                          : ''
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground">Barcode</label>
                    <Input
                      value={row.barcode}
                      onChange={(e) => updateRow(row.id, 'barcode', e.target.value)}
                      placeholder="Barcode"
                      className="h-9 text-base font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground">Starting Stock</label>
                    <Input
                      type="number"
                      min="0"
                      value={row.stock}
                      onChange={(e) => updateRow(row.id, 'stock', Number(e.target.value))}
                      className="h-9 text-base tabular-nums"
                    />
                  </div>
                </div>

                {/* Mobile Advanced Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAdvanced(row.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground py-1"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{t('products:advanced', 'Advanced')}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-1 p-2.5 rounded-lg bg-muted/30 border border-border/60 space-y-2 text-xs">
                      <p className="text-muted-foreground font-mono text-[10px]">
                        {t('products:skuAutoGenerated', 'SKU: auto-generated on save')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block">Brand</label>
                          <Input
                            value={row.brand}
                            onChange={(e) => updateRow(row.id, 'brand', e.target.value)}
                            placeholder="Brand"
                            className="h-8 text-base"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block">Size / Net</label>
                          <Input
                            value={row.size}
                            onChange={(e) => updateRow(row.id, 'size', e.target.value)}
                            placeholder="Size"
                            className="h-8 text-base"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block">Unit</label>
                          <select
                            value={row.unit}
                            onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                            className="w-full h-8 text-base rounded-md border border-input bg-background px-2"
                          >
                            {PRODUCT_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block">
                            {t('products:reorderLevelCol', 'Low-stock alert')}
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={row.reorder_level}
                            onChange={(e) => updateRow(row.id, 'reorder_level', Number(e.target.value))}
                            className="h-8 text-base tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border mt-1">
          <div className="flex items-center gap-2">
            {onScanAgain && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleScanAgainClick}
                disabled={isSaving}
                className="gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('pos:aiScanAgain', 'Scan again')}</span>
              </Button>
            )}

            <p className="text-xs text-muted-foreground hidden sm:block">
              {t('products:aiSelectedReady', {
                count: readySelectedRows.length,
                defaultValue: `${readySelectedRows.length} ready to save`,
              })}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
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
              disabled={readySelectedRows.length === 0 || isSaving}
              onClick={handleSaveReadyItems}
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
                  {t('products:aiSaveReadyBtn', {
                    count: readySelectedRows.length,
                    defaultValue: `Save ready items (${readySelectedRows.length})`,
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
