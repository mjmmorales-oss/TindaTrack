import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Skeleton loader for card grids (e.g. product tiles, KPI metrics).
 *
 * @component
 * @param {object} props
 * @param {number} [props.count=4] - Number of skeleton cards to render
 * @param {string} [props.className] - Additional grid class names
 * @returns {React.JSX.Element}
 */
export function CardGridSkeleton({ count = 4, className }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={`card-skel-${i}`} className="p-4">
          <CardContent className="space-y-3 p-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default CardGridSkeleton
