import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Standard error display component with an optional retry button.
 *
 * @component
 * @param {object} props
 * @param {string} [props.title] - Error title
 * @param {string} [props.message] - Explanatory error message
 * @param {Error|object|string} [props.error] - Error object or string
 * @param {() => void} [props.onRetry] - Callback invoked when the user clicks Retry
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function ErrorState({
  title,
  message,
  description,
  error,
  onRetry,
  actionText,
  onAction,
  className,
}) {
  const { t } = useTranslation()
  const displayTitle = title || t('common:error', 'An error occurred')
  const errorMessage =
    message ||
    description ||
    (typeof error === 'string' ? error : error?.message) ||
    t('common:somethingWentWrongDesc', 'Could not load data. Please try again.')

  const handleAction = onRetry || onAction
  const actionLabel = actionText || t('common:retry', 'Retry')

  return (
    <Alert
      variant="destructive"
      className={cn(
        'flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="text-destructive mt-0.5 h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <AlertTitle className="text-sm font-semibold">{displayTitle}</AlertTitle>
          <AlertDescription className="text-xs opacity-90">
            {errorMessage}
          </AlertDescription>
        </div>
      </div>
      {handleAction && (
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/40 hover:bg-destructive/10 text-destructive shrink-0 self-start sm:self-auto"
          onClick={handleAction}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {actionLabel}
        </Button>
      )}
    </Alert>
  )
}

export default ErrorState
