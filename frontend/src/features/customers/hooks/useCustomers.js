import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { customerService } from '@/services/customerService'
import { notify } from '@/lib/notify'

export const customerKeys = {
  all: ['customers'],
  lists: () => [...customerKeys.all, 'list'],
  list: (params) => [...customerKeys.lists(), params],
  details: () => [...customerKeys.all, 'detail'],
  detail: (id) => [...customerKeys.details(), id],
  ledgers: () => [...customerKeys.all, 'ledger'],
  ledger: (id) => [...customerKeys.ledgers(), id],
}

export function useCustomers(params = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerService.get(id),
    enabled: !!id,
  })
}

export function useCustomerLedger(id) {
  return useQuery({
    queryKey: customerKeys.ledger(id),
    queryFn: () => customerService.ledger(id),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => customerService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      queryClient.invalidateQueries({ queryKey: ['utang'] })
      notify.success('Nai-save ang bagong suki!', `${res.data.name} is now registered.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong lumikha ng kustomer.')
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => customerService.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      queryClient.invalidateQueries({ queryKey: ['utang'] })
      notify.success('Na-update ang detalye ng suki!', `${res.data.name} has been updated.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-update ang kustomer.')
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => customerService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all })
      queryClient.invalidateQueries({ queryKey: ['utang'] })
      notify.success('Nabura ang rekord ng suki.')
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong burahin ang kustomer.')
    },
  })
}
