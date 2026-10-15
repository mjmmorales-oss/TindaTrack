import { KeyRound, ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function MustChangePasswordBanner() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user?.must_change_password || location.pathname === '/account') {
    return null
  }

  return (
    <div className="bg-warning text-warning-foreground px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs border-b border-warning/30">
      <div className="flex items-center gap-2 min-w-0">
        <KeyRound className="h-4 w-4 shrink-0 text-warning-foreground" />
        <span className="truncate">
          <strong>Security Notice:</strong> You are using a temporary password. Please set a new password.
        </span>
      </div>
      <Button
        asChild
        size="sm"
        variant="secondary"
        className="h-7 px-2.5 text-xs shrink-0 gap-1 bg-white/90 text-stone-900 hover:bg-white shadow-xs font-semibold"
      >
        <Link to="/account">
          Update Now
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
    </div>
  )
}

export default MustChangePasswordBanner
