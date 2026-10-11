import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0 w-full',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {breadcrumbs && (
          <div className="text-muted-foreground mb-2 text-sm">
            {breadcrumbs}
          </div>
        )}
        {title && (
          <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl line-clamp-2 sm:truncate">
            {title}
          </h1>
        )}
        {description && (
          <p className="text-muted-foreground text-sm md:text-base break-words">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  )
}
