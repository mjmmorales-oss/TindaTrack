import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffService } from '@/services/staffService'
import { notify } from '@/lib/notify'

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
      notify.success('Nai-dagdag ang staff!', `${res.data.name} is now registered.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong idagdag ang staff.')
    },
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => staffService.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success('Na-update ang staff!', `${res.data.name} profile updated.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-update ang profile ng staff.')
    },
  })
}

export function useToggleStaffActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.toggleActive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success(
        res.data.is_active ? 'Na-activate ang staff' : 'Na-deactivate ang staff',
        `${res.data.name} is now ${res.data.is_active ? 'active' : 'inactive'}.`,
      )
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong baguhin ang estado ng staff.')
    },
  })
}

export function useResetStaffPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => staffService.resetPassword(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success('Na-reset ang password!', 'Naitakda ang bagong password ng staff.')
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-reset ang password.')
    },
  })
}

export function useRevokeStaffSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.revokeSessions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success('Na-revoke ang mga sesyon!', 'Lahat ng aktibong device at sesyon ay na-sign out.')
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-revoke ang mga sesyon.')
    },
  })
}

export function useArchiveStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success('Na-archive ang staff', 'Inilipat ang staff sa archived tab.')
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-archive ang staff.')
    },
  })
}

export function useRestoreStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.restore(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success('Na-restore ang staff', `${res.data.name} is now restored.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-restore ang staff.')
    },
  })
}
