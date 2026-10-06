import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

/**
 * Card container for data charts with loading skeleton and empty state handling.
 *
 * @component
 * @param {object} props
 * @param {string} props.title - Title of the chart
 * @param {string} [props.description] - Subtitle or period description
 * @param {React.ReactNode} [props.actions] - Action buttons or filters slot in header
 * @param {React.ReactNode} props.children - Chart component (Recharts or custom)
 * @param {boolean} [props.loading=false] - Whether chart is loading
 * @param {boolean} [props.empty=false] - Whether chart data is empty
 * @param {string} [props.className] - Additional class names
 * @returns {React.JSX.Element}
 */
export function ChartCard({
  title,
  description,
  actions,
  children,
  loading = false,
  empty = false,
  className,
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {loading ? (
          <div className="space-y-3 pt-2">
            <Skeleton className="h-[240px] w-full rounded-lg" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : empty ? (
          <div className="flex h-[240px] items-center justify-center">
            <EmptyState
              title="Walang datos sa panahong ito"
              description="Walang naitalang transaksyon para sa napiling petsa."
              className="min-h-0 border-none bg-transparent p-0"
            />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

export default ChartCard
