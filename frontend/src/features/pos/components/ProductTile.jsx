import { useState } from 'react'
import { Eye, Plus, ShoppingCart } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/utils'

/**
 * Interactive POS product tile with touch feedback, stock badge, and desktop context menu.
 *
 * @param {object} props
 * @param {object} props.product - Product object
 * @param {(product: object) => void} props.onAddToCart - Click handler
 * @param {(product: object) => void} [props.onViewProduct] - View details handler
 */
export function ProductTile({ product, onAddToCart, onViewProduct }) {
  const [isPressed, setIsPressed] = useState(false)
  const isOutOfStock = (product.stock_quantity ?? 0) <= 0
  const isLowStock =
    !isOutOfStock && product.stock_quantity <= (product.reorder_level ?? 5)

  const handleClick = () => {
    if (isOutOfStock) return
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 200)
    onAddToCart?.(product)
  }

  const stockVariant = isOutOfStock ? 'out' : isLowStock ? 'low' : 'in'

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleClick}
          className={cn(
            'group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3 text-left shadow-xs transition-all outline-none',
            'min-h-[148px] select-none',
            isOutOfStock
              ? 'opacity-50 cursor-not-allowed bg-muted/30'
              : 'hover:border-primary/50 hover:shadow-sm active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-primary',
            isPressed && 'ring-2 ring-primary bg-primary/5',
          )}
          aria-label={`${product.name}, ₱${product.price}, ${isOutOfStock ? 'Out of stock' : `${product.stock_quantity} in stock`}`}
        >
          {/* Top Row: Thumbnail & Stock Pill */}
          <div className="flex items-start justify-between gap-2 w-full">
            <ProductThumb
              name={product.name}
              size="md"
              className="shrink-0 transition-transform group-hover:scale-105"
            />
            <div className="shrink-0">
              <StatusBadge
                type="stock"
                variant={stockVariant}
                className="text-[10px] px-1.5 py-0.5"
              />
            </div>
          </div>

          {/* Middle: Product Name */}
          <div className="my-2 flex-1 min-w-0">
            <h3
              className="text-foreground line-clamp-2 text-xs font-semibold leading-snug sm:text-sm"
              title={product.name}
            >
              {product.name}
            </h3>
            {product.sku && (
              <p className="text-muted-foreground mt-0.5 truncate text-[10px] font-mono">
                {product.sku}
              </p>
            )}
          </div>

          {/* Bottom Row: Price & Quick Action indicator */}
          <div className="flex items-center justify-between border-t border-border/50 pt-2 w-full">
            <Money
              amount={product.price}
              size="sm"
              tone="default"
              className="font-bold text-sm sm:text-base text-foreground"
            />
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                {product.stock_quantity} {product.unit || 'pc'}
              </span>
              {!isOutOfStock && (
                <span className="hidden sm:inline-flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem
          disabled={isOutOfStock}
          onClick={() => onAddToCart?.(product)}
          className="gap-2 text-xs"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Idagdag sa cart
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onViewProduct?.(product)}
          className="gap-2 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          Tingnan ang detalye
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default ProductTile
