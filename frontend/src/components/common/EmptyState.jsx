import { isValidElement } from 'react'
import { FolderSearch } from 'lucide-react'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Standard empty state component wrapping shadcn/ui Empty.
 *
 * @component
 * @param {object} props
 * @param {React.ComponentType<{ className?: string }>} [props.icon=FolderSearch] - Lucide icon component
 * @param {string} [props.illustration] - Optional image URL or SVG path for illustration
 * @param {string} [props.title='Walang nahanap'] - Main heading
 * @param {string} [props.description='Walang tala o rekord na maipakita sa ngayon.'] - Explanatory message
 * @param {React.ReactNode} [props.action] - Action button or CTA slot
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function EmptyState({
  icon: Icon = FolderSearch,
  illustration,
  title = 'Walang nahanap',
  description = 'Walang tala o rekord na maipakita sa ngayon.',
  action,
  className,
}) {
  return (
    <Empty
      className={cn(
        'border-border/80 bg-card/30 min-h-[280px] rounded-xl border border-dashed',
        className,
      )}
    >
      <EmptyHeader>
        {illustration ? (
          <img
            src={illustration}
            alt="Empty illustration"
            className="mb-2 h-28 w-28 object-contain opacity-80"
          />
        ) : (
          <EmptyMedia
            variant="icon"
            className="bg-primary/10 text-primary border-primary/20 border"
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </EmptyMedia>
        )}
        <EmptyTitle className="text-base font-semibold">{title}</EmptyTitle>
        {description && (
          <EmptyDescription className="text-muted-foreground max-w-xs text-xs">
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {action && (
        <EmptyContent>
          {isValidElement(action) ? (
            action
          ) : typeof action === 'object' && (action.label || action.text) ? (
            <Button
              variant={action.variant || 'default'}
              size={action.size || 'sm'}
              onClick={action.onClick}
            >
              {action.label || action.text}
            </Button>
          ) : (
            action
          )}
        </EmptyContent>
      )}
    </Empty>
  )
}

export default EmptyState
