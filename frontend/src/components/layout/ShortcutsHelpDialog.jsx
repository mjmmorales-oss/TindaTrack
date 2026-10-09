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

const SHORTCUTS = [
  { key: '⌘K / Ctrl+K', label: 'Command Palette', description: 'Mabilisang paghahanap at nabigasyon sa buong app' },
  { key: 'F2', label: 'Paghahanap sa POS', description: 'Direktang tumutok sa search bar ng POS' },
  { key: 'F9', label: 'Magbayad / Checkout', description: 'Buksan ang dialog para sa pagbabayad sa POS' },
  { key: 'Enter', label: 'Kumpirmahin / Tanggapin', description: 'Tanggapin ang aktibong aksyon o dialog form' },
  { key: 'Esc', label: 'Isara ang Dialog', description: 'Isara ang bukas na modal, drawer, o dropdown' },
  { key: '?', label: 'Tulong sa Shortcuts', description: 'Ipakita ang gabay na ito para sa mga keyboard shortcuts' },
]

export function ShortcutsHelpDialog({ open, onOpenChange }) {
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
            Mga Keyboard Shortcut
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pabilisin ang paggamit sa tindahan gamit ang mga sumusunod na keyboard shortcuts:
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60 py-2">
          {SHORTCUTS.map((sc) => (
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
