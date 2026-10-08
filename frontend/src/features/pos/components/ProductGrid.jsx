import { PackageSearch } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { ProductTile } from '@/features/pos/components/ProductTile'

/**
 * Responsive product grid for POS terminal.
 *
 * @param {object} props
 * @param {Array<object>} props.products - List of products
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {(product: object) => void} props.onAddToCart - Add to cart callback
 * @param {(product: object) => void} [props.onViewProduct] - View product details callback
 * @param {() => void} [props.onClearFilter] - Callback when clearing filters
 */
export function ProductGrid({
  products = [],
  isLoading = false,
  onAddToCart,
  onViewProduct,
  onClearFilter,
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="flex min-h-[148px] flex-col justify-between p-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5 my-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="py-12 flex items-center justify-center">
        <EmptyState
          icon={PackageSearch}
          title="Walang nahanap na produkto"
          description="Subukang maghanap ng ibang pangalan o pumili ng ibang kategorya sa itaas."
          actionText={onClearFilter ? 'Ibalik sa Lahat' : undefined}
          onAction={onClearFilter}
          className="max-w-md"
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
