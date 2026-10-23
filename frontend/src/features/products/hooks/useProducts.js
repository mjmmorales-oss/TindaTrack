import { useContext } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  QueryClientContext,
  QueryClient,
} from '@tanstack/react-query'
import { productService } from '@/services/productService'
import { scannerService } from '@/services/scannerService'
import { notify } from '@/lib/notify'
import i18n from '@/i18n'
import { hasApiSession } from '@/lib/api'

export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (params) => [...productKeys.lists(), params],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
  lowStock: () => [...productKeys.all, 'low-stock'],
}

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
})

export function useUnknownBarcodes() {
  const contextClient = useContext(QueryClientContext)
  return useQuery(
    {
      queryKey: ['scanner', 'unknown-barcodes'],
      queryFn: () => scannerService.getUnknownBarcodes(),
    },
    contextClient ? undefined : fallbackQueryClient,
  )
}

export function useProducts(params = {}, { enabled = true } = {}) {
  const contextClient = useContext(QueryClientContext)
  return useQuery(
    {
      queryKey: productKeys.list(params),
      queryFn: () => productService.list(params),
      placeholderData: keepPreviousData,
      enabled: enabled && hasApiSession(),
    },
    contextClient ? undefined : fallbackQueryClient,
  )
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
      const subtitle = res?.data?.sku
        ? `Saved ${res.data.name} · ${res.data.sku}`
        : `${res?.data?.name || ''} has been added.`
      notify.success(i18n.t('products:createdSuccess'), subtitle)
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

export function useRestoreProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => productService.restore(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      const barcodeLost = res?.barcode_restored === false && !res?.data?.barcode
      notify.success(
        i18n.t('products:restoredSuccess', { name: res?.data?.name || '' }),
        barcodeLost ? i18n.t('products:restoredBarcodeTaken') : undefined,
      )
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('products:restoreError'))
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

