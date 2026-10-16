import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { resolveImageUrl } from '@/lib/images'

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
 * Fast, offline-friendly product thumbnail tile with image support and initials fallback.
 *
 * @component
 * @param {object} props
 * @param {string} props.name - Product name
 * @param {string} [props.imageUrl] - Product image URL
 * @param {string} [props.categoryColor='bg-primary/15 text-primary'] - Category background/text classes
 * @param {React.ComponentType<{ className?: string }>} [props.categoryIcon] - Optional category icon
 * @param {string} [props.initials] - Custom initials override
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Dimensions for standard thumbnails
 * @param {'default'|'cover'} [props.variant='default'] - Display variant ('cover' fills parent aspect-square container)
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function ProductThumb({
  name = '',
  imageUrl,
  categoryColor,
  categoryIcon: CategoryIcon,
  initials,
  size = 'md',
  variant = 'default',
  className,
}) {
  const [imgError, setImgError] = useState(false)
  const resolvedUrl = resolveImageUrl(imageUrl)

  useEffect(() => {
    setImgError(false)
  }, [resolvedUrl])

  const letters = initials || getProductInitials(name)
  const defaultColors = 'bg-primary/10 text-primary border border-primary/20'
  const isSvg = typeof resolvedUrl === 'string' && (resolvedUrl.endsWith('.svg') || resolvedUrl.includes('.svg'))

  if (variant === 'cover') {
    if (resolvedUrl && !imgError) {
      return (
        <div
          className={cn(
            'relative flex w-full aspect-square shrink-0 items-center justify-center overflow-hidden bg-muted/20 select-none',
            className,
          )}
          aria-hidden="true"
        >
          <img
            src={resolvedUrl}
            alt={name}
            className={cn(
              'h-full w-full transition-transform duration-200 group-hover:scale-105',
              isSvg ? 'object-contain p-2' : 'object-cover',
            )}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      )
    }

    return (
      <div
        className={cn(
          'relative flex w-full aspect-square shrink-0 items-center justify-center overflow-hidden font-bold tracking-tight select-none bg-gradient-to-br from-primary/10 via-muted/20 to-muted/40 text-primary',
          className,
        )}
        aria-hidden="true"
      >
        {CategoryIcon ? (
          <CategoryIcon className="h-10 w-10 opacity-70 mb-1" />
        ) : (
          <span className="font-mono text-xl uppercase tracking-wider">{letters}</span>
        )}
      </div>
    )
  }

  if (resolvedUrl && !imgError) {
    return (
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden border border-border/80 bg-muted/40 select-none',
          sizeStyles[size] || sizeStyles.md,
          className,
        )}
        aria-hidden="true"
      >
        <img
          src={resolvedUrl}
          alt={name}
          className={cn(
            'h-full w-full',
            isSvg ? 'object-contain p-1' : 'object-cover',
          )}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    )
  }

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
