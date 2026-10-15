import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { scannerService } from '@/services/scannerService'
import { notify } from '@/lib/notify'
import i18n from '@/i18n'

export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (params) => [...productKeys.lists(), params],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
  lowStock: () => [...productKeys.all, 'low-stock'],
}

export function useUnknownBarcodes() {
  return useQuery({
    queryKey: ['scanner', 'unknown-barcodes'],
    queryFn: () => scannerService.getUnknownBarcodes(),
  })
}

export function useProducts(params = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productService.get(id),
    enabled: !!id,
  })
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: productKeys.lowStock(),
    queryFn: () => productService.lowStock(),
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => productService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['scanner', 'unknown-barcodes'] })
      notify.success(i18n.t('products:createdSuccess'), `${res.data.name} has been added.`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('products:createError'))
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => productService.update(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notify.success(i18n.t('products:updatedSuccess'), `${res.data.name} has been updated.`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('products:updateError'))
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => productService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      notify.success(i18n.t('products:deletedSuccess'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('products:deleteError'))
    },
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => productService.adjustStock(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      notify.success(i18n.t('products:stockAdjustedSuccess'), `${i18n.t('products:newStock')}: ${res.data.stock_quantity}`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('products:stockAdjustedError'))
    },
  })
}

export function useUploadProductImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file, source }) => productService.uploadImage(id, file, source),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      notify.success(i18n.t('products:imageUploadSuccess'), `${res.data.name} image updated.`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('products:imageOptimizeError'))
    },
  })
}

export function useImportProductImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, url }) => productService.importImage(id, url),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      notify.success(i18n.t('products:imageImportSuccess'), `${res.data.name} image imported.`)
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('products:imageImportError'))
    },
  })
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => productService.deleteImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      notify.success(i18n.t('products:imageDeleteSuccess'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('products:imageDeleteError'))
    },
  })
}

