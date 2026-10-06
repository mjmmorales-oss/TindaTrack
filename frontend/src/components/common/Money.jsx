import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

const toneClasses = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  success: 'text-success font-medium',
  utang: 'text-utang font-semibold',
  destructive: 'text-destructive font-medium',
  highlight: 'text-highlight-foreground font-semibold',
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-semibold',
  xl: 'text-2xl font-bold',
  '2xl': 'text-3xl font-bold tracking-tight',
}

/**
 * Formats a currency amount with Philippine Peso symbol and tabular numbers.
 *
 * @component
 * @param {object} props
 * @param {number|string} [props.amount=0] - The numeric amount to format
 * @param {number|string} [props.value] - Alias for amount
 * @param {'default'|'muted'|'success'|'utang'|'destructive'|'highlight'} [props.tone='default'] - Semantic color tone
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} [props.size='md'] - Text size variant
 * @param {string} [props.className] - Additional CSS class names
 * @returns {React.JSX.Element}
 */
export function Money({
  amount,
  value,
  tone = 'default',
  size = 'md',
  className,
  ...props
}) {
  const val = value !== undefined ? value : amount
  const formatted = formatCurrency(val)

  return (
    <span
      className={cn(
        'inline-block font-mono tabular-nums',
        toneClasses[tone] || toneClasses.default,
        sizeClasses[size] || sizeClasses.md,
        className,
      )}
      {...props}
    >
      {formatted}
    </span>
  )
}

export default Money
