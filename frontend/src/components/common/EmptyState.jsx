import { FolderSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon = FolderSearch,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'border-border/80 bg-card/40 flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center',
        className,
      )}
    >
      <div className="bg-primary/10 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-foreground text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
