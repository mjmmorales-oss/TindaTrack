import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ShoppingCart,
  Search,
  X,
  Package,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Money } from '@/components/common/Money'
import { ProductThumb } from '@/components/common/ProductThumb'
import { useCartStore } from '@/stores/cartStore'
import { useProducts } from '@/features/products/hooks/useProducts'
import { aiService } from '@/services/aiService'
import { notify } from '@/lib/notify'
import { buildBasketFeedbackLines } from '@/lib/aiContract.js'

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
 * BasketReviewSheet Component.
 * Review modal with interactive SVG bounding-box overlay, matched and unmatched product lists,
 * stock validation, item swapping, missed item adder, and fire-and-forget feedback submission.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {object} props.scanResult
 * @param {string} props.imageSrc - Captured photo data/blob URL
 * @param {() => void} [props.onConfirmed]
 */
export function BasketReviewSheet({
  open,
  onOpenChange,
  scanResult,
  imageSrc,
  onConfirmed,
}) {
  const { t } = useTranslation(['pos', 'common'])
  const { data: productsData } = useProducts({ per_page: 200 })
  const allProducts = productsData?.data || []

  // Internal state for reviewable items
  const [confirmedItems, setConfirmedItems] = useState([])
  const [unmatchedItems, setUnmatchedItems] = useState([])
  const [hoveredItemId, setHoveredItemId] = useState(null)

  // Sub-modal / picker state
  const [pickerMode, setPickerMode] = useState(null) // 'swap' | 'add' | 'match'
  const [activePickerTargetId, setActivePickerTargetId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Sync state whenever scanResult changes
  useEffect(() => {
    if (scanResult && open) {
      const initialConfirmed = (scanResult.items || []).map((item, idx) => ({
        id: item.id || `item_${idx}`,
        matched_product_id: item.matched_product_id,
        matched_product: item.matched_product,
        label: item.label,
        quantity: Math.max(1, Number(item.quantity) || 1),
        confidence: item.confidence || 0.9,
        bounding_box: item.bounding_box || null,
        original_product_id: item.matched_product_id,
        original_quantity: item.quantity,
        is_manual: false,
      }))

      const initialUnmatched = (scanResult.unmatched_items || []).map((item, idx) => ({
        id: item.id || `unmatched_${idx}`,
        label: item.label,
        quantity: Math.max(1, Number(item.quantity) || 1),
        confidence: item.confidence || 0.7,
        bounding_box: item.bounding_box || null,
      }))

      setConfirmedItems(initialConfirmed)
      setUnmatchedItems(initialUnmatched)
      setHoveredItemId(null)
      setPickerMode(null)
      setActivePickerTargetId(null)
    }
  }, [scanResult, open])

  // Filter products for swap/add dialog
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return allProducts.filter((p) => p.is_active).slice(0, 30)
    return allProducts
      .filter(
        (p) =>
          p.is_active &&
          (p.name?.toLowerCase().includes(q) ||
            p.barcode?.includes(q) ||
            p.category?.name?.toLowerCase().includes(q)),
      )
      .slice(0, 30)
  }, [allProducts, searchQuery])

  // Quantity handlers
  const handleQuantityChange = (id, delta) => {
    setConfirmedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const stock =
            item.matched_product?.stock_quantity ?? item.matched_product?.stock ?? 999
          const newQty = Math.max(1, Math.min(stock, item.quantity + delta))
          return { ...item, quantity: newQty }
        }
        return item
      }),
    )
  }

  // Remove confirmed item
  const handleRemoveItem = (id) => {
    setConfirmedItems((prev) => prev.filter((item) => item.id !== id))
    if (hoveredItemId === id) setHoveredItemId(null)
  }

  // Dismiss unmatched item
  const handleDismissUnmatched = (id) => {
    setUnmatchedItems((prev) => prev.filter((item) => item.id !== id))
    if (hoveredItemId === id) setHoveredItemId(null)
  }

  // Open product picker for swap, match, or new item
  const handleOpenPicker = (mode, targetId = null) => {
    setPickerMode(mode)
    setActivePickerTargetId(targetId)
    setSearchQuery('')
  }

  // Select product from picker
  const handleSelectProduct = (product) => {
    if (pickerMode === 'swap' && activePickerTargetId) {
      setConfirmedItems((prev) =>
        prev.map((item) => {
          if (item.id === activePickerTargetId) {
            return {
              ...item,
              matched_product_id: product.id,
              matched_product: product,
              label: product.name,
            }
          }
          return item
        }),
      )
    } else if (pickerMode === 'match' && activePickerTargetId) {
      const unmatchedItem = unmatchedItems.find((i) => i.id === activePickerTargetId)
      if (unmatchedItem) {
        setUnmatchedItems((prev) => prev.filter((i) => i.id !== activePickerTargetId))
        setConfirmedItems((prev) => [
          ...prev,
          {
            id: `matched_${Date.now()}`,
            matched_product_id: product.id,
            matched_product: product,
            label: product.name,
            quantity: unmatchedItem.quantity || 1,
            confidence: 1.0,
            bounding_box: unmatchedItem.bounding_box,
            original_product_id: null,
            original_quantity: unmatchedItem.quantity,
            is_manual: false,
          },
        ])
      }
    } else if (pickerMode === 'add') {
      setConfirmedItems((prev) => [
        ...prev,
        {
          id: `added_${Date.now()}`,
          matched_product_id: product.id,
          matched_product: product,
          label: product.name,
          quantity: 1,
          confidence: 1.0,
          bounding_box: null,
          original_product_id: null,
          original_quantity: 0,
          is_manual: true,
        },
      ])
    }

    setPickerMode(null)
    setActivePickerTargetId(null)
  }

  // Totals
  const totalItemCount = useMemo(() => {
    return confirmedItems.reduce((sum, item) => sum + item.quantity, 0)
  }, [confirmedItems])

  const estimatedTotal = useMemo(() => {
    return confirmedItems.reduce((sum, item) => {
      const price = Number(item.matched_product?.price || 0)
      return sum + price * item.quantity
    }, 0)
  }, [confirmedItems])

  // Confirm and add to POS Cart with feedback logging
  const handleAddToCart = async () => {
    if (confirmedItems.length === 0) {
      notify.error(t('pos:aiNoItemsToConfirm', 'No items selected to add to cart.'))
      return
    }

    const { add } = useCartStore.getState()

    // 1. Add each confirmed item to cart with add_method: 'ai'
    for (const item of confirmedItems) {
      if (item.matched_product) {
        add(item.matched_product, item.quantity, 'ai')
      }
    }

    // 2. Prepare & send feedback matching backend schema
    if (scanResult?.scan_id) {
      const feedbackPayload = buildBasketFeedbackLines(
        confirmedItems,
        unmatchedItems,
        scanResult,
      )
      aiService.sendFeedback(scanResult.scan_id, feedbackPayload.lines).catch(() => {})
    }

    notify.success(
      t('pos:aiAddedToCartTitle', 'Items added to cart'),
      t('pos:aiAddedToCartDesc', {
        count: totalItemCount,
        defaultValue: `Added ${totalItemCount} items from AI scan.`,
      }),
    )

    onConfirmed?.()
    onOpenChange(false)
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
          <span>{t('pos:aiReviewTitle', 'Review AI Basket Scan')}</span>
        </div>
      }
      description={t(
        'pos:aiReviewDesc',
        'Verify detected items and quantities before adding them to the cart.',
      )}
      className="sm:max-w-4xl"
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Photo with Interactive SVG Bounding Box Overlay */}
          <div className="md:col-span-5 flex flex-col gap-2">
            <div className="relative w-full aspect-square bg-neutral-900 rounded-xl overflow-hidden border border-border shadow-inner flex items-center justify-center">
              {imageSrc ? (
                <>
                  <img
                    src={imageSrc}
                    alt="Captured basket"
                    className="w-full h-full object-cover"
                  />
                  {/* SVG Overlay: coordinate space 0..1000 */}
                  <svg
                    viewBox="0 0 1000 1000"
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                  >
                    {[...confirmedItems, ...unmatchedItems].map((item) => {
                      if (!item.bounding_box || item.bounding_box.length !== 4) return null
                      const [ymin, xmin, ymax, xmax] = item.bounding_box
                      const isHovered = hoveredItemId === item.id
                      const isUnmatched = !item.matched_product_id

                      return (
                        <g
                          key={item.id}
                          className="cursor-pointer transition-all duration-150"
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          onClick={() => {
                            const el = document.getElementById(`review-item-${item.id}`)
                            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                          }}
                        >
                          <rect
                            x={xmin}
                            y={ymin}
                            width={Math.max(10, xmax - xmin)}
                            height={Math.max(10, ymax - ymin)}
                            rx={12}
                            fill={
                              isHovered
                                ? isUnmatched
                                  ? 'rgba(239, 68, 68, 0.25)'
                                  : 'rgba(59, 130, 246, 0.25)'
                                : isUnmatched
                                  ? 'rgba(239, 68, 68, 0.08)'
                                  : 'rgba(59, 130, 246, 0.1)'
                            }
                            stroke={
                              isHovered
                                ? isUnmatched
                                  ? '#ef4444'
                                  : '#3b82f6'
                                : isUnmatched
                                  ? '#f87171'
                                  : '#60a5fa'
                            }
                            strokeWidth={isHovered ? 6 : 3}
                            strokeDasharray={isUnmatched ? '6 6' : undefined}
                          />
                          <rect
                            x={xmin}
                            y={Math.max(0, ymin - 35)}
                            width={Math.min(260, Math.max(60, (xmax - xmin) * 0.9))}
                            height={32}
                            rx={6}
                            fill={isHovered ? '#1e293b' : 'rgba(15, 23, 42, 0.85)'}
                          />
                          <text
                            x={xmin + 8}
                            y={Math.max(22, ymin - 13)}
                            fill="#ffffff"
                            fontSize="22"
                            fontWeight="bold"
                          >
                            {item.quantity > 1 ? `${item.quantity}x ` : ''}
                            {item.label?.slice(0, 16)}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-2 p-6">
                  <Package className="w-10 h-10 opacity-40" />
                  <span className="text-xs">No image preview available</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Hover over items or click boxes to locate detected products.
            </p>
          </div>

          {/* Detected Products List */}
          <div className="md:col-span-7 flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1">
            {/* Matched Products */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('pos:aiMatchedProducts', 'Matched Products')} ({confirmedItems.length})
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleOpenPicker('add')}
              >
                <Plus className="w-3.5 h-3.5" />
                {t('pos:aiAddMissedItem', '+ Add Missed Item')}
              </Button>
            </div>

            {confirmedItems.length === 0 && (
              <div className="p-4 text-center rounded-lg border border-dashed text-xs text-muted-foreground">
                {t('pos:aiNoMatchedItems', 'No matched products in this scan.')}
              </div>
            )}

            <div className="space-y-2">
              {confirmedItems.map((item) => {
                const isHovered = hoveredItemId === item.id
                const stock =
                  item.matched_product?.stock_quantity ?? item.matched_product?.stock ?? 999
                const isLowStock = item.quantity > stock
                const confStyle = getConfidenceStyle(item.confidence)

                return (
                  <div
                    key={item.id}
                    id={`review-item-${item.id}`}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    className={`p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                      isHovered
                        ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ProductThumb
                        src={item.matched_product?.image_url}
                        name={item.matched_product?.name || item.label}
                        className="w-10 h-10 rounded-lg shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm truncate text-foreground">
                            {item.matched_product?.name || item.label}
                          </p>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${confStyle.className}`}
                            title={`AI Confidence: ${confStyle.text}`}
                          >
                            {confStyle.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Money amount={Number(item.matched_product?.price || 0)} />
                          <span>•</span>
                          <span>
                            {t('pos:stock', 'Stock')}: {stock}
                          </span>
                          {isLowStock && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              Max {stock}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stepper & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border rounded-lg overflow-hidden bg-background">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center text-xs hover:bg-muted disabled:opacity-30"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          disabled={item.quantity >= stock}
                          className="w-7 h-7 flex items-center justify-center text-xs hover:bg-muted disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenPicker('swap', item.id)}
                        title={t('pos:aiSwapProduct', 'Swap with another product')}
                        aria-label="Swap product"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveItem(item.id)}
                        title={t('common:remove', 'Remove')}
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Unmatched Items (if any) */}
            {unmatchedItems.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                  {t('pos:aiUnmatchedProducts', 'Unmatched Detections')} ({unmatchedItems.length})
                </h4>
                <div className="space-y-2">
                  {unmatchedItems.map((item) => {
                    const isHovered = hoveredItemId === item.id
                    return (
                      <div
                        key={item.id}
                        id={`review-item-${item.id}`}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                        className={`p-2.5 rounded-xl border border-dashed transition-all flex items-center justify-between gap-3 ${
                          isHovered
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-amber-500/40 bg-amber-500/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs text-foreground truncate">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Not found in active inventory.
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs"
                            onClick={() => handleOpenPicker('match', item.id)}
                          >
                            {t('pos:aiMatchWithProduct', 'Match')}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-muted-foreground"
                            onClick={() => handleDismissUnmatched(item.id)}
                            aria-label="Dismiss unmatched item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Picker Modal (Swap / Match / Add Missed) */}
        {pickerMode && (
          <div className="p-3 border rounded-xl bg-muted/40 flex flex-col gap-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                {pickerMode === 'swap'
                  ? t('pos:aiPickerSwapTitle', 'Select replacement product')
                  : pickerMode === 'match'
                    ? t('pos:aiPickerMatchTitle', 'Match detected item with product')
                    : t('pos:aiPickerAddTitle', 'Add missed product')}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={() => setPickerMode(null)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('pos:searchProductPlaceholder', 'Search by name or barcode...')}
                className="pl-8 h-9 text-base md:text-xs"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-border/50 rounded-lg border bg-card">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProduct(p)}
                  className="w-full text-left p-2 text-xs flex items-center justify-between hover:bg-muted/80 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.category?.name || 'General'} • Stock: {p.stock_quantity ?? p.stock ?? 0}
                    </p>
                  </div>
                  <Money amount={Number(p.price || 0)} className="font-semibold text-xs shrink-0" />
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No matching products found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Checkout Actions Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {t('pos:aiTotalItemsReady', {
                count: totalItemCount,
                defaultValue: `${totalItemCount} items ready`,
              })}
            </p>
            <div className="text-base font-bold text-foreground">
              <Money amount={estimatedTotal} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={confirmedItems.length === 0}
              onClick={handleAddToCart}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ShoppingCart className="w-4 h-4" />
              {t('pos:aiAddToCartBtn', 'Add to Cart')}
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default BasketReviewSheet
