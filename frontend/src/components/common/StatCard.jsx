import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendBadge } from '@/components/common/TrendBadge'
import { NumberTicker } from '@/components/ui/number-ticker'
import { cn } from '@/lib/utils'

const toneIconColors = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  utang: 'bg-utang/10 text-utang',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
  highlight: 'bg-highlight/15 text-highlight-foreground',
}

/**
 * KPI metric display card with icon, animated value, delta indicator, and loading skeleton.
 *
 * @component
 * @param {object} props
 * @param {React.ComponentType<{ className?: string }>} [props.icon] - Lucide icon component
 * @param {string} props.label - KPI label (e.g. "Kabuuang Benta")
 * @param {number|string|React.ReactNode} props.value - Metric value
 * @param {'currency'|'number'|'none'} [props.format='none'] - Formatting type
 * @param {number} [props.delta] - Percentage change vs previous period
 * @param {string} [props.deltaLabel] - Context for delta (e.g. "vs yesterday")
 * @param {'default'|'success'|'warning'|'utang'|'info'|'destructive'|'highlight'} [props.tone='default'] - Semantic tone
 * @param {boolean} [props.loading=false] - Whether card is in loading state
 * @param {string} [props.description] - Optional sub-copy or helper text
 * @param {string} [props.className] - Additional class names
 * @returns {React.JSX.Element}
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  format = 'none',
  delta,
  deltaLabel,
  tone = 'default',
  loading = false,
  description,
  className,
}) {
  if (loading) {
    return (
      <Card className={cn('p-5', className)}>
        <CardContent className="space-y-3 p-0">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-28" />
        </CardContent>
      </Card>
    )
  }


  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200 hover:shadow-xs',
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          {Icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                toneIconColors[tone] || toneIconColors.default,
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          {format === 'currency' && typeof value === 'number' ? (
            <div className="text-foreground flex items-baseline font-mono text-2xl font-bold tracking-tight tabular-nums md:text-3xl">
              <span className="mr-0.5 font-sans text-xl font-semibold md:text-2xl">
                ₱
              </span>
              <NumberTicker value={value} decimalPlaces={2} />
            </div>
          ) : format === 'number' && typeof value === 'number' ? (
            <div className="text-foreground font-mono text-2xl font-bold tracking-tight tabular-nums md:text-3xl">
              <NumberTicker value={value} decimalPlaces={0} />
            </div>
          ) : (
            <div className="text-foreground font-mono text-2xl font-bold tracking-tight tabular-nums md:text-3xl">
              {value}
            </div>
          )}
        </div>

        {(delta !== undefined || description) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            {delta !== undefined && (
              <TrendBadge value={delta} label={deltaLabel} />
            )}
            {description && (
              <span className="text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StatCard
