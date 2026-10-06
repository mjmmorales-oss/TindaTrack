import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settingsService'
import { notify } from '@/lib/notify'

export const settingsKeys = {
  all: ['settings'],
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => settingsService.get(),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => settingsService.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      notify.success('Nai-save ang mga setting!', 'Na-update ang tindahan info.')
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-save ang mga setting.')
    },
  })
}

export function useResetDemoData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => settingsService.resetDemoData(),
    onSuccess: () => {
      queryClient.clear()
      notify.success('Na-reset ang demo data!', 'Lahat ng datos ay ibinalik sa panimulang estado.')
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-reset ang demo data.')
    },
  })
}
