import { useState } from 'react'
import { NavLink } from 'react-router'
import {
  LayoutDashboard,
  MoreHorizontal,
  NotebookPen,
  Package,
  ScanBarcode,
} from 'lucide-react'
import { MoreSheet } from '@/components/layout/MoreSheet'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border/80 bg-background/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg"
      >
        <div className="flex h-16 items-center justify-around px-2">
          {/* Home */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 w-14 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Home</span>
          </NavLink>

          {/* Products */}
          <NavLink
            to="/products"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 w-14 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Package className="h-5 w-5" />
            <span>Products</span>
          </NavLink>

          {/* Raised Center POS */}
          <div className="relative -top-3 flex flex-col items-center">
            <NavLink
              to="/pos"
              aria-label="Open Point of Sale"
              className={({ isActive }) =>
                cn(
                  'flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 ring-4 ring-background',
                  isActive ? 'ring-primary/30' : '',
                )
              }
            >
              <ScanBarcode className="h-6 w-6 stroke-[2.5]" />
            </NavLink>
            <span className="text-[10px] font-bold text-primary mt-0.5">POS</span>
          </div>

          {/* Utang */}
          <NavLink
            to="/utang"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 w-14 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <NotebookPen className="h-5 w-5" />
            <span>Utang</span>
          </NavLink>

          {/* More */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 w-14 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  )
}
