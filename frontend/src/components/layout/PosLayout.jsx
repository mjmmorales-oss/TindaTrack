import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router'
import { ArrowLeft, Clock, Store, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { getAvatarUrl, getInitials } from '@/lib/avatar'
import { ModeToggle } from '@/components/common/ModeToggle'

export function PosLayout() {
  const { user } = useAuth()
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const avatarUrl = getAvatarUrl(user?.name || 'Cashier')
  const initials = getInitials(user?.name || 'Cashier')

  const timeString = currentTime.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Slim Focus Header */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">Dashboard</span>
            </Link>
          </Button>

          <div className="flex items-center gap-2 border-l border-border pl-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-foreground">
                Tindahan ni Aling Nena
              </p>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Point of Sale Terminal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Clock & Online Status */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {timeString}
            </span>
            <span className="flex items-center gap-1.5 text-success font-medium">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Online
            </span>
          </div>

          {/* Cashier avatar */}
          <div className="flex items-center gap-2 pl-2">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={avatarUrl} alt={user?.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold leading-tight">{user?.name || 'Cashier'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user?.role || 'Staff'}</p>
            </div>
          </div>

          <ModeToggle />
        </div>
      </header>

      {/* POS Viewport */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
