import { useEffect } from 'react'
import { Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { useTranslation } from 'react-i18next'

export function ShortcutsHelpDialog({ open, onOpenChange }) {
  const { t } = useTranslation()

  const shortcuts = [
    { key: '⌘K / Ctrl+K', label: t('common:scCommandPalette', 'Command Palette'), description: t('common:scCommandPaletteDesc', 'Quick search and navigation across the app') },
    { key: 'F2', label: t('common:scPosSearch', 'POS Search'), description: t('common:scPosSearchDesc', 'Focus directly on POS search bar') },
    { key: 'F9', label: t('common:scCheckout', 'Pay / Checkout'), description: t('common:scCheckoutDesc', 'Open payment dialog in POS') },
    { key: 'Enter', label: t('common:scConfirm', 'Confirm / Accept'), description: t('common:scConfirmDesc', 'Accept active dialog form or action') },
    { key: 'Esc', label: t('common:scClose', 'Close Dialog'), description: t('common:scCloseDesc', 'Close open modal, drawer, or dropdown') },
    { key: '?', label: t('common:scHelp', 'Shortcuts Help'), description: t('common:scHelpDesc', 'Show keyboard shortcuts guide') },
  ]

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger on '?' when user is NOT typing inside an input or textarea
      if (
        e.key === '?' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault()
        onOpenChange((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-primary" />
            {t('common:keyboardShortcuts', 'Keyboard Shortcuts')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t('common:shortcutsDesc', 'Speed up your store workflow with these keyboard shortcuts:')}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60 py-2">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="flex items-center justify-between py-2.5">
              <div className="space-y-0.5 pr-4">
                <p className="text-sm font-medium text-foreground">{sc.label}</p>
                <p className="text-xs text-muted-foreground">{sc.description}</p>
              </div>
              <Kbd className="font-mono text-xs px-2 py-1 shrink-0">{sc.key}</Kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ShortcutsHelpDialog
