import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

/**
 * Route guard checking permissions by ability or role list.
 * @param {{ ability?: string, roles?: string[], children?: React.ReactNode }} props
 */
export function RoleRoute({ ability, roles, children }) {
  const { status, role } = useAuth()
  const { can } = usePermissions()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm">
            Checking authorization...
          </p>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check ability if specified
  if (ability && !can(ability)) {
    return <Navigate to="/403" replace />
  }

  // Check roles if specified
  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/403" replace />
  }

  return children ? children : <Outlet />
}
