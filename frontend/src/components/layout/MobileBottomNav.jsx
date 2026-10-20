import { useState, useEffect } from 'react'
import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  MoreHorizontal,
  NotebookPen,
  Package,
  ScanBarcode,
} from 'lucide-react'
import { MoreSheet } from '@/components/layout/MoreSheet'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { useOverlayStore } from '@/stores/overlayStore'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const { t } = useTranslation(['nav'])
  const [moreOpen, setMoreOpen] = useState(false)
  const isAnyModalOpen = useOverlayStore((s) => s.activeModalCount > 0)
  const { isKeyboardOpen: isKeyboardFromHook } = useVisualViewport()

  const [isKeyboardFromDataset, setIsKeyboardFromDataset] = useState(() => {
    return (
      typeof document !== 'undefined' &&
      document.documentElement.dataset.keyboard === 'open'
    )
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const check = () => {
      setIsKeyboardFromDataset(document.documentElement.dataset.keyboard === 'open')
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-keyboard'],
    })
    return () => observer.disconnect()
  }, [])

  const isHidden = isKeyboardFromHook || isKeyboardFromDataset || isAnyModalOpen

  return (
    <>
      <nav
        aria-label={t('nav:mobileNav')}
        data-state={isHidden ? 'hidden' : 'visible'}
        className={cn(
          'border-border/80 bg-background/95 fixed right-0 bottom-0 left-0 z-40 border-t pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md transition-all duration-200 md:hidden',
          isHidden && 'hidden pointer-events-none opacity-0 translate-y-full',
        )}
      >
        <div className="flex h-16 items-center justify-around px-2">
          {/* Home */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                'flex w-14 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>{t('nav:home')}</span>
          </NavLink>

          {/* Products */}
          <NavLink
            to="/products"
            className={({ isActive }) =>
              cn(
                'flex w-14 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Package className="h-5 w-5" />
            <span>{t('nav:products')}</span>
          </NavLink>

          {/* Raised Center POS */}
          <div className="relative -top-3 flex flex-col items-center">
            <NavLink
              to="/pos"
              aria-label={t('nav:openPos')}
              className={({ isActive }) =>
                cn(
                  'bg-primary text-primary-foreground ring-background flex h-13 w-13 items-center justify-center rounded-full shadow-lg ring-4 transition-transform active:scale-95',
                  isActive ? 'ring-primary/30' : '',
                )
              }
            >
              <ScanBarcode className="h-6 w-6 stroke-[2.5]" />
            </NavLink>
            <span className="text-primary mt-0.5 text-[10px] font-bold">
              POS
            </span>
          </div>

          {/* Utang */}
          <NavLink
            to="/utang"
            className={({ isActive }) =>
              cn(
                'flex w-14 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <NotebookPen className="h-5 w-5" />
            <span>{t('nav:utangShort')}</span>
          </NavLink>

          {/* More */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="text-muted-foreground hover:text-foreground flex w-14 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>{t('nav:more')}</span>
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  )
}

export default MobileBottomNav
