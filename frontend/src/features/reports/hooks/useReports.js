import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'

export const reportKeys = {
  all: ['reports'],
  sales: (params) => [...reportKeys.all, 'sales', params],
  bestSellers: (params) => [...reportKeys.all, 'best-sellers', params],
  categories: (params) => [...reportKeys.all, 'categories', params],
  hourly: (params) => [...reportKeys.all, 'hourly', params],
}

export function useSalesReport(params = {}) {
  return useQuery({
    queryKey: reportKeys.sales(params),
    queryFn: () => reportService.sales(params),
  })
}

export function useBestSellers(params = {}) {
  return useQuery({
    queryKey: reportKeys.bestSellers(params),
    queryFn: () => reportService.bestSellers(params),
  })
}

export function useCategoryBreakdown(params = {}) {
  return useQuery({
    queryKey: reportKeys.categories(params),
    queryFn: () => reportService.categoryBreakdown(params),
  })
}

export function useHourlyBreakdown(params = {}) {
  return useQuery({
    queryKey: reportKeys.hourly(params),
    queryFn: () => reportService.hourly(params),
  })
}

