import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router'
import { ArrowLeft, Clock, Store, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { getAvatarUrl, getInitials } from '@/lib/avatar'
import { ModeToggle } from '@/components/common/ModeToggle'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { ShortcutsHelpDialog } from '@/components/layout/ShortcutsHelpDialog'

export function PosLayout() {
  const { user } = useAuth()
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [cmdOpen, setCmdOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((prev) => !prev)
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault()
        setShortcutsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const avatarUrl = getAvatarUrl(user?.name || 'Cashier')
  const initials = getInitials(user?.name || 'Cashier')

  const timeString = currentTime.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Slim Focus Header */}
      <header className="border-border/80 bg-background/95 sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-md print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground -ml-2 gap-2"
          >
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden font-medium sm:inline">Dashboard</span>
            </Link>
          </Button>

          <div className="border-border flex items-center gap-2 border-l pl-3">
            <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <p className="text-foreground text-sm leading-tight font-bold">
                Tindahan ni Aling Nena
              </p>
              <p className="text-muted-foreground hidden text-[11px] sm:block">
                Point of Sale Terminal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Clock & Online Status */}
          <div className="text-muted-foreground hidden items-center gap-3 text-xs md:flex">
            <span className="flex items-center gap-1.5 font-medium tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {timeString}
            </span>
            <span className="text-success flex items-center gap-1.5 font-medium">
              <span className="bg-success h-2 w-2 animate-pulse rounded-full" />
              Online
            </span>
          </div>

          {/* Cashier avatar */}
          <div className="flex items-center gap-2 pl-2">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={avatarUrl} alt={user?.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-xs leading-tight font-semibold">
                {user?.name || 'Cashier'}
              </p>
              <p className="text-muted-foreground text-[10px] capitalize">
                {user?.role || 'Staff'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShortcutsOpen(true)}
            className="text-muted-foreground hover:text-foreground h-9 w-9"
            aria-label="Mga Keyboard Shortcut (?)"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          <ModeToggle />
        </div>
      </header>

      {/* POS Viewport */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <ShortcutsHelpDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}
