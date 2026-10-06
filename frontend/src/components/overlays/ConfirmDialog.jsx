import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Confirmation dialog built on AlertDialog with semantic tone styling,
 * optional required reason input (e.g. for voids/cancellations), and async confirmation states.
 *
 * @component
 * @param {object} props
 * @param {boolean} props.open - Controlled open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state change handler
 * @param {React.ReactNode} props.title - Dialog title
 * @param {React.ReactNode} [props.description] - Dialog descriptive warning/explanation
 * @param {string} [props.confirmText='Kumpirmahin (Confirm)'] - Confirm button label
 * @param {string} [props.cancelText='Kanselahin (Cancel)'] - Cancel button label
 * @param {'default'|'destructive'} [props.tone='default'] - Visual tone of the action
 * @param {boolean} [props.requireReason=false] - Whether a text reason must be provided
 * @param {string} [props.reasonLabel='Dahilan (Reason)'] - Label for the reason textarea
 * @param {string} [props.reasonPlaceholder='Ibigay ang dahilan... (Provide a reason)'] - Reason placeholder
 * @param {number} [props.minReasonLength=4] - Minimum characters required for reason
 * @param {(reason?: string) => Promise<void> | void} props.onConfirm - Callback triggered on confirmation
 * @param {boolean} [props.isLoading=false] - Optional controlled loading state
 * @returns {React.JSX.Element}
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Kumpirmahin (Confirm)',
  cancelText = 'Kanselahin (Cancel)',
  tone = 'default',
  requireReason = false,
  reasonLabel = 'Dahilan (Reason)',
  reasonPlaceholder = 'Ibigay ang dahilan... (Provide a reason)',
  minReasonLength = 4,
  onConfirm,
  isLoading = false,
}) {
  const [reason, setReason] = useState('')
  const [internalLoading, setInternalLoading] = useState(false)

  // Reset reason when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setReason('')
      setInternalLoading(false)
    }
  }, [open])

  const loading = isLoading || internalLoading
  const isReasonValid =
    !requireReason || reason.trim().length >= minReasonLength

  const handleConfirm = async () => {
    if (!isReasonValid || loading) return

    try {
      setInternalLoading(true)
      const result = onConfirm?.(requireReason ? reason.trim() : undefined)
      if (result instanceof Promise) {
        await result
      }
      onOpenChange?.(false)
    } catch {
      // Keep open on error so user can review
    } finally {
      setInternalLoading(false)
    }
  }

  const isDestructive = tone === 'destructive'

  return (
    <AlertDialog open={open} onOpenChange={loading ? () => {} : onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            {isDestructive && (
              <div className="bg-destructive/15 text-destructive mt-0.5 shrink-0 rounded-full p-2">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 space-y-1 text-left">
              <AlertDialogTitle className="text-lg font-bold">
                {title}
              </AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        {requireReason && (
          <div className="space-y-2 py-2">
            <Label
              htmlFor="confirm-reason"
              className="text-foreground text-xs font-semibold"
            >
              {reasonLabel}{' '}
              <span className="text-destructive font-normal">*</span>
            </Label>
            <Textarea
              id="confirm-reason"
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              className="min-h-[72px] resize-none text-sm"
            />
            {reason.trim().length > 0 &&
              reason.trim().length < minReasonLength && (
                <p className="text-destructive text-xs">
                  Kailangan ng hindi bababa sa {minReasonLength} mga karakter (
                  {reason.trim().length}/{minReasonLength}).
                </p>
              )}
          </div>
        )}

        <AlertDialogFooter className="mt-2 gap-2 sm:justify-end">
          <AlertDialogCancel
            disabled={loading}
            onClick={() => onOpenChange?.(false)}
            className="h-10"
          >
            {cancelText}
          </AlertDialogCancel>
          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            disabled={!isReasonValid || loading}
            onClick={handleConfirm}
            className="h-10 min-w-28 gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ConfirmDialog
