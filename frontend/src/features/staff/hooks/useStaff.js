import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffService } from '@/services/staffService'
import { notify } from '@/lib/notify'
import i18n from '@/i18n'

export const staffKeys = {
  all: ['staff'],
  lists: () => [...staffKeys.all, 'list'],
  list: (params) => [...staffKeys.lists(), params],
  details: () => [...staffKeys.all, 'detail'],
  detail: (id) => [...staffKeys.details(), id],
}

export function useStaff(params = { status: 'active', search: '' }) {
  return useQuery({
    queryKey: staffKeys.list(params),
    queryFn: () => staffService.list(params),
  })
}

export function useStaffMember(id) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => staffService.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => staffService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success(i18n.t('users:staffCreatedSuccess', 'Staff member added successfully.'), `${res.data.name}`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('users:staffCreatedError', 'Failed to add staff member.'))
    },
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => staffService.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success(i18n.t('users:staffUpdatedSuccess', 'Staff profile updated successfully.'), `${res.data.name}`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('users:staffUpdatedError', 'Failed to update staff profile.'))
    },
  })
}

export function useToggleStaffActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.toggleActive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      const label = res.data.is_active
        ? i18n.t('users:activatedSuccess', 'Staff member activated.')
        : i18n.t('users:deactivatedSuccess', 'Staff member deactivated and sessions revoked.')
      notify.success(label, `${res.data.name}`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('users:staffStatusError', 'Failed to change staff status.'))
    },
  })
}

export function useResetStaffPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => staffService.resetPassword(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success(i18n.t('users:passwordResetSuccess', 'Password reset successfully.'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('users:passwordResetError', 'Failed to reset password.'))
    },
  })
}

export function useRevokeStaffSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.revokeSessions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success(i18n.t('users:sessionsRevokedSuccess', 'All active sessions revoked.'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('users:sessionsRevokedError', 'Failed to revoke sessions.'))
    },
  })
}

export function useArchiveStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success(i18n.t('users:staffArchivedSuccess', 'Staff member archived.'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('users:staffArchivedError', 'Failed to archive staff member.'))
    },
  })
}

export function useRestoreStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.restore(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success(i18n.t('users:staffRestoredSuccess', 'Staff member restored.'), `${res.data.name}`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('users:staffRestoredError', 'Failed to restore staff member.'))
    },
  })
}
