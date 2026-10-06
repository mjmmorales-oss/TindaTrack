import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Loading skeleton matching data table layout rows and columns.
 *
 * @component
 * @param {object} props
 * @param {number} [props.rows=5] - Number of skeleton rows to render
 * @param {number} [props.cols=4] - Number of columns per row
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function TableSkeleton({ rows = 5, cols = 4, className }) {
  return (
    <div
      className={cn(
        'bg-card w-full space-y-3 rounded-lg border p-4',
        className,
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4 border-b pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={`th-${i}`}
            className={cn(
              'h-4',
              i === 0 ? 'w-28' : i === cols - 1 ? 'w-16' : 'w-20',
            )}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`tr-${rowIdx}`}
          className="flex items-center justify-between gap-4 border-b py-2 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton
              key={`td-${rowIdx}-${colIdx}`}
              className={cn(
                'h-4',
                colIdx === 0 ? 'w-36' : colIdx === cols - 1 ? 'w-16' : 'w-24',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default TableSkeleton
