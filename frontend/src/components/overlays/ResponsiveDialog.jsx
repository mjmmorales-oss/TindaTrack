import { useEffect } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { useOverlayStore } from '@/stores/overlayStore'
import { cn } from '@/lib/utils'

/**
 * Responsive modal component: renders a Dialog on tablet/desktop (md+),
 * and a touch-friendly bottom Drawer on mobile (< md).
 *
 * Implements iOS visual-viewport aware sizing, sticky footer, overscroll-contain,
 * and smooth focus centering.
 *
 * @component
 * @param {object} props
 * @param {boolean} props.open - Controlled open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state change handler
 * @param {React.ReactNode} props.title - Modal title text or node
 * @param {React.ReactNode} [props.description] - Modal subtitle or explanation
 * @param {React.ReactNode} props.children - Modal body content
 * @param {React.ReactNode} [props.footer] - Modal footer actions
 * @param {React.ReactNode} [props.trigger] - Optional trigger element
 * @param {string} [props.className] - Additional content classes
 * @param {boolean} [props.dismissible=true] - false: clicks/focus outside and swipe-down don't
 *   close it (Esc and the X still call onOpenChange(false), so the caller can confirm first)
 * @returns {React.JSX.Element}
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  className,
  dismissible = true,
}) {
  const isMobile = useIsMobile()
  // Data-holding sheets (AI reviews) must only close through an explicit action
  const keepOpen = (e) => e.preventDefault()
  const outsideGuards = dismissible
    ? {}
    : { onInteractOutside: keepOpen, onPointerDownOutside: keepOpen, onFocusOutside: keepOpen }

  // Register open state in overlayStore to coordinate hiding bottom navigation
  useEffect(() => {
    if (open) {
      const unregister = useOverlayStore.getState().registerModal()
      return unregister
    }
  }, [open])

  // Center input into view smoothly after iOS keyboard appears (~250ms)
  const handleBodyFocusIn = (e) => {
    const target = e.target
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      setTimeout(() => {
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      }, 250)
    }
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false} dismissible={dismissible}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent
          {...outsideGuards}
          className={cn(
            'flex max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top)-12px)] flex-col',
            className,
          )}
        >
          <DrawerHeader className="border-border border-b px-4 pt-3 pb-2 text-left">
            <DrawerTitle className="text-foreground text-lg font-bold">
              {title}
            </DrawerTitle>
            {description && (
              <DrawerDescription className="text-muted-foreground mt-0.5 text-xs">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-3"
            onFocus={handleBodyFocusIn}
          >
            {children}
          </div>
          {footer && (
            <DrawerFooter className="sticky bottom-0 z-10 border-border bg-background/95 backdrop-blur-xs border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        {...outsideGuards}
        className={cn(
          'flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg',
          className,
        )}
      >
        <DialogHeader className="border-border border-b px-6 py-4 text-left">
          <DialogTitle className="text-foreground text-lg font-bold">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-muted-foreground mt-1 text-sm">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <DialogFooter className="border-border bg-muted/20 gap-2 border-t px-6 py-3.5 sm:justify-end">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ResponsiveDialog
