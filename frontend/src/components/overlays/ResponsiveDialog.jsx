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
import { cn } from '@/lib/utils'

/**
 * Responsive modal component: renders a Dialog on tablet/desktop (md+),
 * and a touch-friendly bottom Drawer on mobile (< md).
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
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className={cn('flex max-h-[90dvh] flex-col', className)}>
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
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer && (
            <DrawerFooter className="border-border bg-muted/20 border-t px-4 py-3">
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
