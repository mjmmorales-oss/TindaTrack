import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { utangService } from '@/services/utangService'
import { notify } from '@/lib/notify'
import i18n from '@/i18n'
import { formatCurrency } from '@/lib/format'

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
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      notify.success(
        i18n.t('utang:paymentRecordedTitle'),
        i18n.t('utang:paymentRecordedDetail', {
          amount: formatCurrency(res.data.payment.amount),
          balance: formatCurrency(res.data.new_balance),
        }),
      )
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('utang:recordPaymentError'))
    },
  })
}
