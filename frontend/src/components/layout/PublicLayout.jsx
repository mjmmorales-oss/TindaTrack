import { Link, Outlet } from 'react-router'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/common/ModeToggle'
import { useAuth } from '@/hooks/useAuth'

export function PublicLayout() {
  const { user } = useAuth()
  const homePath = user?.role === 'cashier' ? '/pos' : '/dashboard'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md md:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">TindaTrack</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ModeToggle />
          {user ? (
            <Button asChild size="sm">
              <Link to={homePath}>Go to App</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 TindaTrack · Tindahan ni Aling Nena</p>
          <div className="flex items-center gap-3">
            <span>SDG 1 No Poverty</span>
            <span>•</span>
            <span>SDG 8 Decent Work & Economic Growth</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
