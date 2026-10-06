import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryService } from '@/services/categoryService'
import { notify } from '@/lib/notify'

export const categoryKeys = {
  all: ['categories'],
  lists: () => [...categoryKeys.all, 'list'],
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: () => categoryService.list(),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => categoryService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      notify.success('Nai-save ang kategorya!', `${res.data.name} has been added.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong lumikha ng kategorya.')
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => categoryService.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      notify.success('Na-update ang kategorya!', `${res.data.name} has been updated.`)
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong i-update ang kategorya.')
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => categoryService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      notify.success('Nabura ang kategorya.')
    },
    onError: (err) => {
      notify.error(err.message || 'Nabigong burahin ang kategorya.')
    },
  })
}
