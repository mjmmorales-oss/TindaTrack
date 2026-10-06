import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { utangService } from '@/services/utangService'
import { notify } from '@/lib/notify'

export const utangKeys = {
  all: ['utang'],
  summary: () => [...utangKeys.all, 'summary'],
  debtors: (params) => [...utangKeys.all, 'debtors', params],
}

export function useUtangSummary() {
  return useQuery({
    queryKey: utangKeys.summary(),
    queryFn: () => utangService.summary(),
  })
}

export function useDebtors(params = {}) {
  return useQuery({
    queryKey: utangKeys.debtors(params),
    queryFn: () => utangService.debtors(params),
    placeholderData: keepPreviousData,
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ customerId, data }) => utangService.recordPayment(customerId, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: utangKeys.all })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      notify.success(
        'Naitala ang bayad!',
        `Bayad: ₱${res.data.payment.amount.toFixed(2)} · Natitirang Utang: ₱${res.data.new_balance.toFixed(2)}`,
      )
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong itala ang bayad.')
    },
  })
}
