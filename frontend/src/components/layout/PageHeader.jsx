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
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="space-y-1">
        {breadcrumbs && (
          <div className="mb-2 text-sm text-muted-foreground">{breadcrumbs}</div>
        )}
        {title && (
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
        )}
        {description && (
          <p className="text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  )
}
