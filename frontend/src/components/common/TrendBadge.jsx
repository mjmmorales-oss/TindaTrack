import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Trend badge displaying positive or negative delta with an accessible indicator.
 *
 * @component
 * @param {object} props
 * @param {number|string} props.value - Percentage or delta value (e.g. 14.5 or -5.2)
 * @param {string} [props.suffix='%'] - Suffix string (default: %)
 * @param {string} [props.label] - Context label (e.g. "vs previous week")
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function TrendBadge({ value, suffix = '%', label, className }) {
  const numericVal = Number(value) || 0
  const isPositive = numericVal > 0
  const isNeutral = numericVal === 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        isPositive && 'bg-success/15 text-success dark:bg-success/20',
        numericVal < 0 &&
          'bg-destructive/15 text-destructive dark:bg-destructive/20',
        isNeutral && 'bg-muted text-muted-foreground',
        className,
      )}
      aria-label={`${numericVal >= 0 ? 'Increase of' : 'Decrease of'} ${Math.abs(numericVal)}${suffix}${label ? ` ${label}` : ''}`}
    >
      {isPositive && (
        <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {numericVal < 0 && (
        <TrendingDown className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {isNeutral && <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span className="font-mono tabular-nums">
        {numericVal > 0 ? `+${numericVal}` : numericVal}
        {suffix}
      </span>
      {label && (
        <span className="text-muted-foreground/80 ml-0.5 font-sans font-normal">
          {label}
        </span>
      )}
    </span>
  )
}

export default TrendBadge
