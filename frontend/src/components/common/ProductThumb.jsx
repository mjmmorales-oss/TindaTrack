import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const sizeStyles = {
  sm: 'h-8 w-8 text-[10px] rounded-md',
  md: 'h-10 w-10 text-xs rounded-lg',
  lg: 'h-14 w-14 text-sm rounded-xl',
  xl: 'h-20 w-20 text-base rounded-2xl',
}

/**
 * Extracts 2-letter uppercase initials from product name (e.g. "Pancit Canton" -> "PC").
 * @param {string} name
 * @returns {string}
 */
function getProductInitials(name = '') {
  if (!name) return 'PR'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return parts[0].slice(0, 2).toUpperCase()
}

/**
 * Fast, offline-friendly product thumbnail tile with category styling and initials.
 *
 * @component
 * @param {object} props
 * @param {string} props.name - Product name
 * @param {string} [props.categoryColor='bg-primary/15 text-primary'] - Category background/text classes
 * @param {React.ComponentType<{ className?: string }>} [props.categoryIcon] - Optional category icon
 * @param {string} [props.initials] - Custom initials override
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Dimensions
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function ProductThumb({
  name = '',
  categoryColor,
  categoryIcon: CategoryIcon,
  initials,
  size = 'md',
  className,
}) {
  const letters = initials || getProductInitials(name)
  const defaultColors = 'bg-primary/10 text-primary border border-primary/20'

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden font-bold tracking-tight select-none',
        sizeStyles[size] || sizeStyles.md,
        categoryColor || defaultColors,
        className,
      )}
      aria-hidden="true"
    >
      {CategoryIcon && size !== 'sm' && (
        <CategoryIcon className="pointer-events-none absolute -right-1 -bottom-1 h-1/2 w-1/2 opacity-20" />
      )}
      <span className="font-mono uppercase">{letters}</span>
    </div>
  )
}

export default ProductThumb
