import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { saleService } from '@/services/saleService'
import { notify } from '@/lib/notify'

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
      notify.success(
        'Matagumpay na naitala ang benta!',
        `Resibo ${res.data.sale_no} · ₱${res.data.total_amount.toFixed(2)}`,
      )
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong itala ang benta.')
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
      notify.success('Nai-void ang benta!', `Resibo ${res.data.sale_no} has been voided.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-void ang benta.')
    },
  })
}
