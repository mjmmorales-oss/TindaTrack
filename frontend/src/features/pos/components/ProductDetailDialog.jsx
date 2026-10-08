import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

/**
 * Quick product detail preview modal triggered from desktop context menu.
 *
 * @param {object} props
 * @param {object|null} props.product - Selected product
 * @param {boolean} props.open - Modal open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {(product: object) => void} [props.onAddToCart] - Quick add callback
 */
export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
  onAddToCart,
}) {
  if (!product) return null

  const isOutOfStock = (product.stock_quantity ?? 0) <= 0
  const isLowStock =
    !isOutOfStock && product.stock_quantity <= (product.reorder_level ?? 5)
  const stockVariant = isOutOfStock ? 'out' : isLowStock ? 'low' : 'in'

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={product.name}
      description="Detalye ng Produkto"
      className="sm:max-w-sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Isara
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isOutOfStock}
            onClick={() => {
              onAddToCart?.(product)
              onOpenChange(false)
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Idagdag sa Cart
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductThumb name={product.name} size="lg" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-foreground">
              {product.name}
            </h4>
            <StatusBadge type="stock" variant={stockVariant} />
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Presyo (Selling Price):</span>
            <Money amount={product.price} size="sm" tone="default" />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kasalukuyang Stock:</span>
            <span className="font-mono font-bold">
              {product.stock_quantity} {product.unit || 'pcs'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reorder Level:</span>
            <span className="font-mono">
              {product.reorder_level} {product.unit || 'pcs'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SKU:</span>
            <span className="font-mono">{product.sku || 'N/A'}</span>
          </div>
          {product.barcode && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Barcode:</span>
              <span className="font-mono">{product.barcode}</span>
            </div>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  )
}

export default ProductDetailDialog
