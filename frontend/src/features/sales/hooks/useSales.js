import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { saleService } from '@/services/saleService'
import { notify } from '@/lib/notify'
import i18n from '@/i18n'
import { formatCurrency } from '@/lib/format'

export const saleKeys = {
  all: ['sales'],
  lists: () => [...saleKeys.all, 'list'],
  list: (params) => [...saleKeys.lists(), params],
  details: () => [...saleKeys.all, 'detail'],
  detail: (id) => [...saleKeys.details(), id],
}

export function useSales(params = {}) {
  return useQuery({
    queryKey: saleKeys.list(params),
    queryFn: () => saleService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useSale(id) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: () => saleService.get(id),
    enabled: !!id,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cartItems, payment }) => saleService.create(cartItems, payment),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['utang'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      notify.success(
        i18n.t('pos:saleRecordedSuccess'),
        i18n.t('pos:saleRecordedDetail', {
          receipt: res.data.sale_no,
          amount: formatCurrency(res.data.total_amount),
        }),
      )
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('pos:recordSaleError'))
    },
  })
}

export function useVoidSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => saleService.void(id, reason),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['utang'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      notify.success(
        i18n.t('pos:saleVoidedSuccess'),
        i18n.t('pos:saleVoidedDetail', { receipt: res.data.sale_no }),
      )
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('pos:voidSaleError'))
    },
  })
}
