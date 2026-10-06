import { Link, useMatches } from 'react-router'
import {
  Bell,
  Search,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ModeToggle } from '@/components/common/ModeToggle'
import { Kbd } from '@/components/common/Kbd'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function Topbar() {
  const matches = useMatches()

  // Collect breadcrumbs from matched routes
  const breadcrumbs = matches
    .filter((match) => Boolean(match.handle?.breadcrumb))
    .map((match) => ({
      title: match.handle.breadcrumb,
      path: match.pathname,
    }))

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-background/95 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hidden md:flex -ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="hidden md:block mr-2 h-4" />

        {/* Brand logo shown on mobile topbar */}
        <Link to="/dashboard" className="flex md:hidden items-center gap-2 font-bold text-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">TindaTrack</span>
        </Link>

        {/* Breadcrumbs for desktop */}
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <BreadcrumbItem key={crumb.path}>
                  {index > 0 && <BreadcrumbSeparator />}
                  {isLast ? (
                    <BreadcrumbPage className="font-semibold text-foreground">
                      {crumb.title}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.path}>{crumb.title}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2">
        {/* Search trigger placeholder */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex h-9 items-center gap-2 rounded-lg border-border/80 bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          onClick={() => {}}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search tindahan...</span>
          <Kbd className="ml-2 font-semibold">⌘K</Kbd>
        </Button>

        {/* Notifications Popover placeholder */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="View notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-highlight opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-highlight"></span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-semibold text-sm">Notifications</span>
              <Badge variant="outline" className="text-xs font-normal">
                2 new
              </Badge>
            </div>
            <div className="divide-y divide-border text-sm">
              <div className="p-3 hover:bg-muted/50 transition-colors">
                <p className="font-medium text-xs text-warning">Running Low</p>
                <p className="text-xs text-foreground mt-0.5">
                  Coca-Cola Mismo 295ml has only 3 bottles remaining.
                </p>
                <span className="text-[10px] text-muted-foreground mt-1 block">15m ago</span>
              </div>
              <div className="p-3 hover:bg-muted/50 transition-colors">
                <p className="font-medium text-xs text-utang">Utang Aging</p>
                <p className="text-xs text-foreground mt-0.5">
                  Aling Rosing has an overdue balance of ₱320.00 (34 days).
                </p>
                <span className="text-[10px] text-muted-foreground mt-1 block">2h ago</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme mode toggle */}
        <ModeToggle />
      </div>
    </header>
  )
}
