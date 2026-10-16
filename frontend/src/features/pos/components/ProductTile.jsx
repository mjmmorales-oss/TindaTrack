import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Eye, ShoppingCart } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { useCartStore } from '@/stores/cartStore'
import { cn } from '@/lib/utils'

/**
 * Image-first POS product tile with aspect-square cover, floating in-cart & stock badges,
 * and high-contrast price display.
 *
 * @param {object} props
 * @param {object} props.product - Product object
 * @param {(product: object) => void} props.onAddToCart - Click handler
 * @param {(product: object) => void} [props.onViewProduct] - View details handler
 */
export function ProductTile({ product, onAddToCart, onViewProduct }) {
  const { t } = useTranslation(['pos', 'common'])
  const [isPressed, setIsPressed] = useState(false)
  const inCartQty = useCartStore((state) =>
    state.items.find((i) => i.product_id === product.id)?.quantity ?? 0
  )

  const isOutOfStock = (product.stock_quantity ?? 0) <= 0
  const isLowStock =
    !isOutOfStock && product.stock_quantity <= (product.reorder_level ?? 5)

  const handleClick = () => {
    if (isOutOfStock) return
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 150)
    onAddToCart?.(product)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const stockLabel = isOutOfStock
    ? t('pos:outOfStockBadge', 'Ubos na')
    : isLowStock
      ? t('pos:lowStockBadge', '{{count}} left', { count: product.stock_quantity })
      : `${product.stock_quantity} in stock`

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={isOutOfStock ? -1 : 0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          data-sku={product.sku}
          className={cn(
            'group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-xs transition-all duration-150 active:scale-[0.98] select-none touch-manipulation text-left',
            isOutOfStock
              ? 'opacity-60 grayscale-[30%] cursor-not-allowed bg-muted/20'
              : 'cursor-pointer hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isPressed && 'ring-2 ring-primary bg-primary/5',
          )}
          aria-label={`${product.name}, ₱${product.price}, ${stockLabel}`}
        >
          {/* Top visual area: full-width aspect-square packshot with floating badges */}
          <div className="relative w-full aspect-square overflow-hidden bg-muted/20">
            <ProductThumb
              name={product.name}
              imageUrl={product.image_url}
              variant="cover"
            />

            {/* In-cart quantity badge (top-right) */}
            {inCartQty > 0 && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute top-2 right-2 z-10 rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground shadow-md pointer-events-none select-none"
              >
                ×{inCartQty}
              </motion.span>
            )}

            {/* Stock chip (top-left) - only rendered on low or out-of-stock */}
            {isOutOfStock && (
              <span className="absolute top-2 left-2 z-10 rounded-md bg-destructive/90 px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground backdrop-blur-xs pointer-events-none select-none shadow-xs">
                {t('pos:outOfStockBadge', 'Ubos na')}
              </span>
            )}
            {isLowStock && (
              <span className="absolute top-2 left-2 z-10 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs pointer-events-none select-none shadow-xs">
                {t('pos:lowStockBadge', '{{count}} left', { count: product.stock_quantity })}
              </span>
            )}
          </div>

          {/* Content area below image */}
          <div className="p-2.5 flex flex-col justify-between flex-1">
            <h3
              className="line-clamp-2 text-xs font-medium text-foreground/90 leading-snug min-h-[2.4em] sm:text-sm"
              title={product.name}
            >
              {product.name}
            </h3>

            <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-border/40">
              <div className="flex items-baseline">
                <Money
                  amount={product.price}
                  size="sm"
                  className="text-base font-bold text-foreground"
                />
                <span className="text-[10px] text-muted-foreground font-normal ml-1">
                  / {product.unit || 'pc'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem
          disabled={isOutOfStock}
          onClick={() => onAddToCart?.(product)}
          className="gap-2 text-xs"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {t('pos:addToCart', 'Add to cart')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onViewProduct?.(product)}
          className="gap-2 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          {t('pos:viewDetails', 'View details')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default ProductTile
