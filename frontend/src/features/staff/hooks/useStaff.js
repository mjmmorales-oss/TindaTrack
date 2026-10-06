import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffService } from '@/services/staffService'
import { notify } from '@/lib/notify'

export const staffKeys = {
  all: ['staff'],
  lists: () => [...staffKeys.all, 'list'],
}

export function useStaff() {
  return useQuery({
    queryKey: staffKeys.lists(),
    queryFn: () => staffService.list(),
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

export function useToggleStaffActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => staffService.toggleActive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      notify.success(
        res.data.is_active ? 'Na-activate ang staff' : 'Na-deactivate ang staff',
        `${res.data.name} is now ${res.data.is_active ? 'active' : 'inactive'}.`
      )
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong baguhin ang estado ng staff.')
    },
  })
}
