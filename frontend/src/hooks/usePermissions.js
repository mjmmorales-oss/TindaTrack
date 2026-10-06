import { useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hasAbility } from '@/config/permissions'

export function usePermissions() {
  const { user, isOwner } = useAuth()
  const role = user?.role

  const can = useCallback(
    (ability) => {
      if (!role) return false
      return hasAbility(role, ability)
    },
    [role],
  )

  return useMemo(
    () => ({
      can,
      role,
      isOwner,
    }),
    [can, role, isOwner],
  )
}
