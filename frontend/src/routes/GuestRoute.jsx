import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

export function GuestRoute({ children }) {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Checking session...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    const destination = user?.role === 'cashier' ? '/pos' : '/dashboard'
    return <Navigate to={destination} replace />
  }

  return children ? children : <Outlet />
}
