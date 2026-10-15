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
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Standard empty state component wrapping shadcn/ui Empty.
 *
 * @component
 * @param {object} props
 * @param {React.ComponentType<{ className?: string }>} [props.icon=FolderSearch] - Lucide icon component
 * @param {string} [props.illustration] - Optional image URL or SVG path for illustration
 * @param {string} [props.title] - Main heading
 * @param {string} [props.description] - Explanatory message
 * @param {React.ReactNode} [props.action] - Action button or CTA slot
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function EmptyState({
  icon: Icon = FolderSearch,
  illustration,
  title,
  description,
  action,
  actionText,
  onAction,
  className,
}) {
  const { t } = useTranslation()
  const displayTitle = title || t('common:noRecords', 'No records found')
  const displayDescription = description || t('common:noRecordsDesc', 'No records to display at this time.')
  const ctaAction =
    action ||
    (actionText ? (
      <Button size="sm" onClick={onAction}>
        {actionText}
      </Button>
    ) : null)

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
        <EmptyTitle className="text-base font-semibold">{displayTitle}</EmptyTitle>
        {displayDescription && (
          <EmptyDescription className="text-muted-foreground max-w-xs text-xs">
            {displayDescription}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {ctaAction && (
        <EmptyContent>
          {isValidElement(ctaAction) ? (
            ctaAction
          ) : typeof ctaAction === 'object' && (ctaAction.label || ctaAction.text) ? (
            <Button
              variant={ctaAction.variant || 'default'}
              size={ctaAction.size || 'sm'}
              onClick={ctaAction.onClick}
            >
              {ctaAction.label || ctaAction.text}
            </Button>
          ) : (
            ctaAction
          )}
        </EmptyContent>
      )}
    </Empty>
  )
}

export default EmptyState
