import { useState, useCallback, useRef } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * @typedef {object} ConfirmOptions
 * @property {React.ReactNode} title - Dialog title
 * @property {React.ReactNode} [description] - Dialog descriptive warning/explanation
 * @property {string} [confirmText] - Confirm button text
 * @property {string} [cancelText] - Cancel button text
 * @property {'default'|'destructive'} [tone='default'] - Tone of the action
 * @property {boolean} [requireReason=false] - Whether reason is required
 * @property {string} [reasonLabel] - Label for reason textarea
 * @property {string} [reasonPlaceholder] - Placeholder for reason textarea
 * @property {number} [minReasonLength=4] - Minimum characters for reason
 */

/**
 * Imperative confirm dialog hook that returns a promise-based `confirm()` trigger
 * and a `ConfirmDialog` JSX component to render in the tree.
 *
 * @returns {{
 *   confirm: (options: ConfirmOptions) => Promise<boolean|string>,
 *   ConfirmDialog: () => React.JSX.Element
 * }}
 */
export function useConfirm() {
  const [config, setConfig] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Kumpirmahin',
    cancelText: 'Kanselahin',
    tone: 'default',
    requireReason: false,
    reasonLabel: 'Dahilan',
    reasonPlaceholder: '',
    minReasonLength: 4,
  })

  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setConfig({
        open: true,
        title: options.title || 'Kumpirmahin ang aksyon (Confirm action)',
        description: options.description || '',
        confirmText: options.confirmText || 'Kumpirmahin',
        cancelText: options.cancelText || 'Kanselahin',
        tone: options.tone || 'default',
        requireReason: options.requireReason || false,
        reasonLabel: options.reasonLabel || 'Dahilan',
        reasonPlaceholder: options.reasonPlaceholder || '',
        minReasonLength: options.minReasonLength || 4,
      })
    })
  }, [])

  const handleOpenChange = useCallback((open) => {
    if (!open) {
      setConfig((prev) => ({ ...prev, open: false }))
      if (resolverRef.current) {
        resolverRef.current(false)
        resolverRef.current = null
      }
    }
  }, [])

  const handleConfirmAction = useCallback(
    (reason) => {
      if (resolverRef.current) {
        resolverRef.current(config.requireReason ? reason || true : true)
        resolverRef.current = null
      }
    },
    [config.requireReason],
  )

  const ConfirmDialogComponent = useCallback(
    () => (
      <ConfirmDialog
        open={config.open}
        onOpenChange={handleOpenChange}
        title={config.title}
        description={config.description}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        tone={config.tone}
        requireReason={config.requireReason}
        reasonLabel={config.reasonLabel}
        reasonPlaceholder={config.reasonPlaceholder}
        minReasonLength={config.minReasonLength}
        onConfirm={handleConfirmAction}
      />
    ),
    [config, handleOpenChange, handleConfirmAction],
  )

  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
  }
}

export default useConfirm
