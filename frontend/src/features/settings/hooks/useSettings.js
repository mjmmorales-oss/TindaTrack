import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settingsService'
import { notify } from '@/lib/notify'
import i18n from '@/i18n'

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
      notify.success(
        i18n.t('settings:settingsSavedSuccess'),
        i18n.t('settings:settingsUpdatedDetail'),
      )
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('settings:saveSettingsError'))
    },
  })
}

export function useResetDemoData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => settingsService.resetDemoData(),
    onSuccess: () => {
      queryClient.clear()
      notify.success(
        i18n.t('settings:demoResetSuccess'),
        i18n.t('settings:demoResetDetail'),
      )
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('settings:demoResetError'))
    },
  })
}
