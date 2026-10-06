import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventoryService'
import { productService } from '@/services/productService'
import { notify } from '@/lib/notify'

export const inventoryKeys = {
  all: ['inventory'],
  overview: () => [...inventoryKeys.all, 'overview'],
  movements: (params) => [...inventoryKeys.all, 'movements', params],
  restock: () => [...inventoryKeys.all, 'restock'],
}

export function useInventoryOverview() {
  return useQuery({
    queryKey: inventoryKeys.overview(),
    queryFn: () => inventoryService.overview(),
  })
}

export function useStockMovements(params = {}) {
  return useQuery({
    queryKey: inventoryKeys.movements(params),
    queryFn: () => inventoryService.movements(params),
    placeholderData: keepPreviousData,
  })
}

export function useRestockList() {
  return useQuery({
    queryKey: inventoryKeys.restock(),
    queryFn: () => inventoryService.restockList(),
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => productService.adjustStock(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      notify.success('Nai-adjust ang stock!', `${res.data.name}: ${res.data.stock_quantity} remaining.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Hindi ma-adjust ang stock.')
    },
  })
}
