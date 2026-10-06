import { usePermissions } from '@/hooks/usePermissions'

/**
 * Conditional render component based on user ability or role.
 * @param {{ ability?: string, roles?: string[], fallback?: React.ReactNode, children: React.ReactNode }} props
 */
export function Can({ ability, roles, fallback = null, children }) {
  const { can, role } = usePermissions()

  if (ability && !can(ability)) {
    return fallback
  }

  if (roles && (!role || !roles.includes(role))) {
    return fallback
  }

  return children
}
