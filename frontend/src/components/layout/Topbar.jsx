import { Link, useMatches } from 'react-router'
import { Bell, Search, Store } from 'lucide-react'
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
    <header className="border-border/80 bg-background/95 sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1 hidden md:flex" />
        <Separator
          orientation="vertical"
          className="mr-2 hidden h-4 md:block"
        />

        {/* Brand logo shown on mobile topbar */}
        <Link
          to="/dashboard"
          className="text-foreground flex items-center gap-2 font-bold md:hidden"
        >
          <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
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
                    <BreadcrumbPage className="text-foreground font-semibold">
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
          className="border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground hidden h-9 items-center gap-2 rounded-lg px-3 text-xs sm:flex"
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
              className="text-muted-foreground hover:text-foreground relative h-9 w-9"
              aria-label="View notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="bg-highlight absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                <span className="bg-highlight relative inline-flex h-2 w-2 rounded-full"></span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <Badge variant="outline" className="text-xs font-normal">
                2 new
              </Badge>
            </div>
            <div className="divide-border divide-y text-sm">
              <div className="hover:bg-muted/50 p-3 transition-colors">
                <p className="text-warning text-xs font-medium">Running Low</p>
                <p className="text-foreground mt-0.5 text-xs">
                  Coca-Cola Mismo 295ml has only 3 bottles remaining.
                </p>
                <span className="text-muted-foreground mt-1 block text-[10px]">
                  15m ago
                </span>
              </div>
              <div className="hover:bg-muted/50 p-3 transition-colors">
                <p className="text-utang text-xs font-medium">Utang Aging</p>
                <p className="text-foreground mt-0.5 text-xs">
                  Aling Rosing has an overdue balance of ₱320.00 (34 days).
                </p>
                <span className="text-muted-foreground mt-1 block text-[10px]">
                  2h ago
                </span>
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
