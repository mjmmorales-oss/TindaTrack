import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryService } from '@/services/categoryService'
import { notify } from '@/lib/notify'
import i18n from '@/i18n'

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
      queryClient.invalidateQueries({ queryKey: ['products'] })
      notify.success(i18n.t('categories:createdSuccess', 'Category saved successfully.'), `${res.data.name}`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('categories:createError', 'Failed to create category.'))
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => categoryService.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      notify.success(i18n.t('categories:updatedSuccess', 'Category updated successfully.'), `${res.data.name}`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('categories:updateError', 'Failed to update category.'))
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => categoryService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      notify.success(i18n.t('categories:deletedSuccess', 'Category deleted successfully.'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('categories:deleteError', 'Failed to delete category.'))
    },
  })
}
