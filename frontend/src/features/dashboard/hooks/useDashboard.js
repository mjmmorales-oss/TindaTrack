import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'

export const dashboardKeys = {
  all: ['dashboard'],
  range: (range) => [...dashboardKeys.all, range],
}

export function useDashboard(range = 'today') {
  return useQuery({
    queryKey: dashboardKeys.range(range),
    queryFn: () => dashboardService.get({ range }),
  })
}
