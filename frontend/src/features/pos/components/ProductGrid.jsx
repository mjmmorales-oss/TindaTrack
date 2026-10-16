import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { PackageSearch } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { ProductTile } from '@/features/pos/components/ProductTile'
import { useCartStore } from '@/stores/cartStore'
import { cn } from '@/lib/utils'

/**
 * Compact list row for POS terminal (optional dense view mode).
 */
function ProductListRow({ product, onAddToCart }) {
  const { t } = useTranslation(['pos', 'common'])
  const inCartQty = useCartStore((state) =>
    state.items.find((i) => i.product_id === product.id)?.quantity ?? 0
  )
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0
  const isLowStock =
    !isOutOfStock && product.stock_quantity <= (product.reorder_level ?? 5)

  const handleClick = () => {
    if (isOutOfStock) return
    onAddToCart?.(product)
  }

  const stockLabel = isOutOfStock
    ? t('pos:outOfStockBadge', 'Ubos na')
    : isLowStock
      ? t('pos:lowStockBadge', '{{count}} left', { count: product.stock_quantity })
      : `${product.stock_quantity} ${product.unit || 'pc'}`

  return (
    <button
      type="button"
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      disabled={isOutOfStock}
      onClick={handleClick}
      data-sku={product.sku}
      className={cn(
        'group flex w-full min-h-[44px] items-center justify-between gap-3 px-3 py-2 text-left transition-colors select-none touch-manipulation',
        isOutOfStock
          ? 'opacity-60 grayscale-[30%] cursor-not-allowed bg-muted/10'
          : 'hover:bg-muted/50 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
      aria-label={`${product.name}, ₱${product.price}, ${stockLabel}`}
    >
      <div className="relative flex items-center gap-2.5 min-w-0 flex-1">
        <ProductThumb
          name={product.name}
          imageUrl={product.image_url}
          size="sm"
          className="shrink-0 h-9 w-9 rounded-md"
        />
        {inCartQty > 0 && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1 -left-1 z-10 rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs"
          >
            ×{inCartQty}
          </motion.span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground sm:text-sm">
            {product.name}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[10px]',
                isOutOfStock
                  ? 'text-destructive font-semibold'
                  : isLowStock
                    ? 'text-amber-500 font-medium'
                    : 'text-muted-foreground',
              )}
            >
              {stockLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-1 shrink-0 text-right">
        <Money
          amount={product.price}
          size="sm"
          className="font-bold text-sm text-foreground"
        />
        <span className="text-[10px] text-muted-foreground">/{product.unit || 'pc'}</span>
      </div>
    </button>
  )
}

/**
 * Responsive product grid for POS terminal supporting grid & compact list views.
 *
 * @param {object} props
 * @param {Array<object>} props.products - List of products
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {'grid'|'list'} [props.viewMode='grid'] - Active view mode
 * @param {(product: object) => void} props.onAddToCart - Add to cart callback
 * @param {(product: object) => void} [props.onViewProduct] - View product details callback
 * @param {() => void} [props.onClearFilter] - Callback when clearing filters
 */
export function ProductGrid({
  products = [],
  isLoading = false,
  viewMode = 'grid',
  onAddToCart,
  onViewProduct,
  onClearFilter,
}) {
  const { t } = useTranslation(['pos', 'common'])

  if (isLoading) {
    if (viewMode === 'list') {
      return (
        <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2">
              <div className="flex items-center gap-2.5 flex-1">
                <Skeleton className="h-9 w-9 rounded-md shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs"
          >
            <Skeleton className="w-full aspect-square rounded-none" />
            <div className="p-2.5 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
              <div className="pt-2 border-t border-border/40 flex justify-between">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="py-12 flex items-center justify-center">
        <EmptyState
          icon={PackageSearch}
          title={t('pos:noProductsFound', 'No products found')}
          description={t(
            'pos:noProductsSearchDesc',
            'Try searching for a different name or select another category above.',
          )}
          actionText={onClearFilter ? t('pos:resetFilters', 'Reset to All') : undefined}
          onAction={onClearFilter}
          className="max-w-md"
        />
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
        {products.map((product) => (
          <ProductListRow
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:gap-3">
      {products.map((product) => (
        <ProductTile
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onViewProduct={onViewProduct}
        />
      ))}
    </div>
  )
}

export default ProductGrid
