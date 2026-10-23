import { useContext } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClientContext,
  QueryClient,
} from '@tanstack/react-query'
import { settingsService } from '@/services/settingsService'
import { notify } from '@/lib/notify'
import i18n from '@/i18n'
import { hasApiSession } from '@/lib/api'

export const settingsKeys = {
  all: ['settings'],
}

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
})

export function useSettings() {
  const contextClient = useContext(QueryClientContext)
  return useQuery(
    {
      queryKey: settingsKeys.all,
      queryFn: () => settingsService.get(),
      enabled: hasApiSession(),
    },
    contextClient ? undefined : fallbackQueryClient,
  )
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

export function useRestoreDemoImages() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => settingsService.restoreDemoImages(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      const count = res?.updated ?? res?.data?.updated ?? 0
      notify.success(
        i18n.t('settings:restoreDemoImagesSuccess'),
        i18n.t('settings:restoreDemoImagesDetail', { count }),
      )
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('settings:restoreDemoImagesError'))
    },
  })
}

