import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  AlertCircle,
  ArchiveRestore,
  ArrowDownUp,
  Copy,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  ScanBarcode,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'
import { useTableParams } from '@/components/data-table/useTableParams'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { StockLevelBar } from '@/components/common/StockLevelBar'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { AddByBarcodeDialog } from '@/features/products/components/AddByBarcodeDialog'
import { AiProductReviewTable } from '@/features/products/components/AiProductReviewTable'
import { AiCapture } from '@/components/ai/AiCapture'
import { FirstUseAiConsentDialog } from '@/components/ai/FirstUseAiConsentDialog'
import { useAiConsent } from '@/hooks/useAiConsent'
import { aiService } from '@/services/aiService'
import { notify } from '@/lib/notify'
import { DEFAULT_PRODUCT } from '@/features/products/schemas'
import { AdjustStockDialog } from '@/features/products/components/AdjustStockDialog'
import {
  useProducts,
  useDeleteProduct,
  useRestoreProduct,
  useUnknownBarcodes,
} from '@/features/products/hooks/useProducts'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { formatRelative } from '@/lib/format'
import { useTranslation } from 'react-i18next'

/**
 * Product catalog management page with server-filtered data table,
 * category & stock faceted filters, responsive mobile cards, and full CRUD workflows.
 */
export function ProductsPage() {
  const { t } = useTranslation(['products', 'common'])
  useDocumentTitle(t('products:pageTitle', 'Products & Inventory'))
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canViewCost = can('products.view_cost')
  const canManage = can('products.manage')

  // Table params synced with URL
  const { params, setParams, resetParams } = useTableParams({
    q: '',
    category_id: '',
    stock: '',
    is_active: '',
    sort: 'name',
    page: 1,
    per_page: 15,
  })

  // "Archived" lives in the Status filter but is sent to the API as archived=1 (owner only)
  const showArchived = canManage && params.is_active === 'archived'
  const queryParams = useMemo(
    () => (showArchived ? { ...params, is_active: '', archived: 1 } : params),
    [params, showArchived],
  )

  // Queries
  const {
    data: productsRes,
    isLoading,
    isError,
    refetch,
  } = useProducts(queryParams)

  const { data: categoriesRes } = useCategories()
  const categories = useMemo(() => categoriesRes?.data || [], [categoriesRes?.data])
  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((c) => {
      map[c.id] = c.name
    })
    return map
  }, [categories])

  const deleteMutation = useDeleteProduct()
  const restoreMutation = useRestoreProduct()

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustingProduct, setAdjustingProduct] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [addByBarcodeOpen, setAddByBarcodeOpen] = useState(false)
  const [addByBarcodeInitialCode, setAddByBarcodeInitialCode] = useState('')
  const [dismissedUnknownCard, setDismissedUnknownCard] = useState(false)

  // AI First-Use Privacy Consent
  const {
    isConsentOpen,
    setIsConsentOpen,
    withConsent,
    acceptConsent,
    declineConsent,
  } = useAiConsent()

  // AI Bulk Product Add states
  const [isAiCaptureOpen, setIsAiCaptureOpen] = useState(false)
  const [isAiScanning, setIsAiScanning] = useState(false)
  const [aiScanningStep, setAiScanningStep] = useState('')
  const [isReviewTableOpen, setIsReviewTableOpen] = useState(false)
  const [productScanResult, setProductScanResult] = useState(null)
  const [capturedImageBlob, setCapturedImageBlob] = useState(null)

  const handleProductPhotoCapture = async (blob, captureMode = 'manual') => {
    setIsAiScanning(true)
    setAiScanningStep(t('products:aiPreparingPhoto', 'Preparing photo for AI analysis...'))
    setCapturedImageBlob(blob)
    try {
      setAiScanningStep(t('products:aiDetectingProducts', 'Detecting products and GTIN barcodes...'))
      const result = await aiService.productScan(blob, { capture_mode: captureMode })
      setProductScanResult(result)
      setIsAiCaptureOpen(false)
      setIsReviewTableOpen(true)
    } catch (err) {
      notify.error(
        t('products:aiScanFailed', 'Product scan failed'),
        err?.message || 'Could not analyze product photo.',
      )
    } finally {
      setIsAiScanning(false)
      setAiScanningStep('')
    }
  }

  // Unknown barcodes for owner
  const { data: unknownBarcodesRes } = useUnknownBarcodes()
  const unknownBarcodes = useMemo(() => unknownBarcodesRes?.data || [], [unknownBarcodesRes?.data])

  const handleCreate = () => {
    setEditingProduct(DEFAULT_PRODUCT)
    setFormDialogOpen(true)
  }

  const handleRegisterBarcode = (barcode) => {
    setAddByBarcodeInitialCode(barcode)
    setAddByBarcodeOpen(true)
  }

  const handleEdit = (prod) => {
    setEditingProduct(prod)
    setFormDialogOpen(true)
  }

  const handleDuplicate = (prod) => {
    setEditingProduct({
      ...prod,
      name: `${prod.name} ${t('products:copySuffix', '(Copy)')}`,
      sku: prod.sku ? `${prod.sku}-COPY` : '',
      barcode: '',
      __isDuplicate: true,
    })
    setFormDialogOpen(true)
  }

  const handleAdjust = (prod) => {
    setAdjustingProduct(prod)
    setAdjustDialogOpen(true)
  }

  const handleDelete = (prod) => {
    setDeletingProduct(prod)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingProduct) return
    await deleteMutation.mutateAsync(deletingProduct.id)
    setDeleteDialogOpen(false)
    setDeletingProduct(null)
  }

  // Faceted filter configurations
  const categoryFilterOptions = useMemo(
    () =>
      categories.map((c) => ({
        label: c.name,
        value: String(c.id),
        count: c.product_count,
      })),
    [categories],
  )

  const stockFilterOptions = [
    { label: t('products:inStock', 'In Stock'), value: 'in' },
    { label: t('products:lowStock', 'Low Stock'), value: 'low' },
    { label: t('products:outOfStock', 'Out of Stock'), value: 'out' },
  ]

  const statusFilterOptions = [
    { label: t('products:active', 'Active'), value: 'true' },
    { label: t('products:inactive', 'Inactive'), value: 'false' },
    ...(canManage ? [{ label: t('products:archivedFilter', 'Archived (deleted)'), value: 'archived' }] : []),
  ]

  const isFiltered = Boolean(
    params.q || params.category_id || params.stock || params.is_active,
  )

  const filters = [
    {
      columnId: 'category_id',
      title: t('products:categoryFilter', 'Category'),
      options: categoryFilterOptions,
      selectedValues: params.category_id ? [String(params.category_id)] : [],
      onChange: (vals) =>
        setParams({ category_id: vals.length ? vals[0] : '', page: 1 }),
    },
    {
      columnId: 'stock',
      title: t('products:stockLevelFilter', 'Stock Level'),
      options: stockFilterOptions,
      selectedValues: params.stock ? [params.stock] : [],
      onChange: (vals) =>
        setParams({ stock: vals.length ? vals[0] : '', page: 1 }),
    },
    {
      columnId: 'is_active',
      title: t('products:statusFilter', 'Status'),
      options: statusFilterOptions,
      selectedValues: params.is_active !== '' ? [String(params.is_active)] : [],
      onChange: (vals) =>
        setParams({ is_active: vals.length ? vals[0] : '', page: 1 }),
    },
  ]

  // Columns definition
  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('products:productCol', 'Product')} />
        ),
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex items-center gap-3 py-1">
              <ProductThumb
                name={p.name}
                imageUrl={p.image_url}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0">
                <Link
                  to={`/products/${p.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                >
                  {p.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>{p.sku || t('products:noSku', 'NO-SKU')}</span>
                  {p.barcode && <span>· {p.barcode}</span>}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'category_id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('products:categoryCol', 'Category')} />
        ),
        cell: ({ row }) => {
          const p = row?.original || row || {}
          const catName = (p.category_id && categoryMap[p.category_id]) || t('products:otherCategory', 'Other')
          return (
            <Badge variant="outline" className="text-xs font-normal">
              {catName}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'price',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('products:priceCol', 'Price')} />
        ),
        cell: ({ row }) => (
          <Money amount={row.original.price} size="sm" tone="default" />
        ),
      },
    ]

    if (canViewCost) {
      cols.push({
        accessorKey: 'cost_price',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('products:costCol', 'Cost')} />
        ),
        cell: ({ row }) => (
          <Money amount={row.original.cost_price} size="sm" tone="muted" />
        ),
      })
    }

    cols.push(
      {
        accessorKey: 'stock_quantity',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('products:stockCol', 'Stock')} />
        ),
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="w-[140px] space-y-1">
              <StockLevelBar
                stock={p.stock_quantity}
                reorderLevel={p.reorder_level}
                showLabel={false}
              />
              <div className="flex justify-between text-[11px] font-mono">
                <span className="font-semibold">{p.stock_quantity} {p.unit || 'pcs'}</span>
                <span className="text-muted-foreground">Min: {p.reorder_level}</span>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'is_active',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('products:statusCol', 'Status')} />
        ),
        cell: ({ row }) =>
          row.original.archived ? (
            <Badge variant="secondary">{t('products:archivedBadge', 'Archived')}</Badge>
          ) : (
            <StatusBadge
              type="active"
              variant={row.original.is_active ? 'active' : 'inactive'}
            />
          ),
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('products:updatedCol', 'Last Updated')} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelative(row.original.updated_at || row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const p = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  aria-label={t('products:openProductMenu', 'Open product menu')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {p.archived ? (
                  canManage && (
                    <DropdownMenuItem
                      onClick={() => restoreMutation.mutate(p.id)}
                      disabled={restoreMutation.isPending}
                      className="gap-2 text-xs"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      {t('products:restore', 'Restore')}
                    </DropdownMenuItem>
                  )
                ) : (<>
                <DropdownMenuItem
                  onClick={() => navigate(`/products/${p.id}`)}
                  className="gap-2 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t('products:view', 'View')}
                </DropdownMenuItem>

                {canManage && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleEdit(p)}
                      className="gap-2 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t('products:edit', 'Edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAdjust(p)}
                      className="gap-2 text-xs"
                    >
                      <ArrowDownUp className="h-3.5 w-3.5" />
                      {t('products:adjustStock', 'Adjust Stock')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicate(p)}
                      className="gap-2 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {t('products:duplicate', 'Duplicate')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(p)}
                      className="gap-2 text-xs text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('products:delete', 'Delete')}
                    </DropdownMenuItem>
                  </>
                )}
                </>)}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    )

    return cols
  }, [categoryMap, canViewCost, canManage, navigate, t, restoreMutation])

  // Mobile card renderer for screens below md
  const renderMobileCard = (row) => {
    const p = row?.original || row || {}
    const catName = (p.category_id && categoryMap[p.category_id]) || t('products:otherCategory', 'Other')

    return (
      <div
        key={p.id}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ProductThumb
              name={p.name}
              imageUrl={p.image_url}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <Link
                to={`/products/${p.id}`}
                className="font-semibold text-sm text-foreground truncate block hover:text-primary"
              >
                {p.name}
              </Link>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {p.sku || t('products:noSku', 'NO-SKU')}
              </p>
            </div>
          </div>

          {/* 44px touch target action button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 p-0"
                aria-label={t('products:openProductMenu', 'Open product menu')}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {p.archived ? (
                canManage && (
                  <DropdownMenuItem
                    onClick={() => restoreMutation.mutate(p.id)}
                    disabled={restoreMutation.isPending}
                    className="gap-2 text-xs"
                  >
                    <ArchiveRestore className="h-4 w-4" />
                    {t('products:restore', 'Restore')}
                  </DropdownMenuItem>
                )
              ) : (<>
              <DropdownMenuItem
                onClick={() => navigate(`/products/${p.id}`)}
                className="gap-2 text-xs"
              >
                <Eye className="h-4 w-4" />
                {t('products:viewDetails', 'View Details')}
              </DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleEdit(p)}
                    className="gap-2 text-xs"
                  >
                    <Pencil className="h-4 w-4" />
                    {t('products:edit', 'Edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAdjust(p)}
                    className="gap-2 text-xs"
                  >
                    <ArrowDownUp className="h-4 w-4" />
                    {t('products:adjustStock', 'Adjust Stock')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDuplicate(p)}
                    className="gap-2 text-xs"
                  >
                    <Copy className="h-4 w-4" />
                    {t('products:duplicate', 'Duplicate')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(p)}
                    className="gap-2 text-xs text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('products:delete', 'Delete')}
                  </DropdownMenuItem>
                </>
              )}
              </>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Details row: Price, Cost, Category, Status */}
        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2.5">
          <div>
            <span className="text-muted-foreground block text-[11px]">{t('products:sellingPrice', 'Selling Price')}</span>
            <Money amount={p.price} size="sm" tone="default" className="font-bold" />
          </div>

          {canViewCost && (
            <div>
              <span className="text-muted-foreground block text-[11px]">{t('products:costPrice', 'Cost (Puhunan)')}</span>
              <Money amount={p.cost_price} size="sm" tone="muted" />
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
              {catName}
            </Badge>
          </div>

          <div className="flex items-center justify-end pt-1">
            {p.archived ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {t('products:archivedBadge', 'Archived')}
              </Badge>
            ) : (
              <StatusBadge
                type="active"
                variant={p.is_active ? 'active' : 'inactive'}
                className="text-[10px] px-1.5 py-0"
              />
            )}
          </div>
        </div>

        {/* Stock Level Bar */}
        <div className="border-t border-border/50 pt-2 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground text-[11px]">{t('products:currentStock', 'Current Stock:')}</span>
            <span className="font-mono font-bold text-foreground">
              {p.stock_quantity} / {p.reorder_level} {p.unit || 'pcs'}
            </span>
          </div>
          <StockLevelBar
            stock={p.stock_quantity}
            reorderLevel={p.reorder_level}
            showLabel={false}
          />
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <PageHeader
        title={t('products:pageTitle', 'Products & Inventory')}
        description={t('products:subtitle', 'Manage product catalog, selling prices, costs, and stock levels')}
        actions={
          canManage && (
            <>
              {/* Desktop / Tablet actions */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddByBarcodeInitialCode('')
                    setAddByBarcodeOpen(true)
                  }}
                  className="gap-1.5 shadow-xs h-9 font-medium text-xs"
                >
                  <ScanBarcode className="h-4 w-4" />
                  <span>{t('products:addByBarcode', 'Add by barcode')}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => withConsent(() => setIsAiCaptureOpen(true))}
                  className="gap-1.5 shadow-xs h-9 font-medium text-xs border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
                >
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span>{t('products:addFromPhotoAi', 'AI Stock-In')}</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleCreate}
                  className="gap-1.5 shadow-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('products:addProduct', 'Add Product')}</span>
                </Button>
              </div>

              {/* Mobile (< sm): Tidy single dropdown menu */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="gap-1.5 shadow-xs h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs"
                      aria-label={t('products:addMenuButton', 'Add...')}
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t('products:addMenuButton', 'Add...')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1">
                    <DropdownMenuItem
                      onClick={() => withConsent(() => setIsAiCaptureOpen(true))}
                      className="gap-2.5 py-2 cursor-pointer font-medium text-xs text-primary"
                    >
                      <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                      <div>
                        <div className="font-semibold">{t('products:addFromPhotoAi', 'AI Stock-In')}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {t('products:addFromPhotoAiDesc', 'Snap up to 5 new products at once')}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setAddByBarcodeInitialCode('')
                        setAddByBarcodeOpen(true)
                      }}
                      className="gap-2.5 py-2 cursor-pointer text-xs"
                    >
                      <ScanBarcode className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="font-medium">{t('products:addByBarcode', 'Add by barcode')}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {t('products:addByBarcodeDesc', 'Quick GTIN auto-fill')}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCreate}
                      className="gap-2.5 py-2 cursor-pointer text-xs"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="font-medium">{t('products:addProduct', 'Add Product')}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {t('products:addProductDesc', 'Fill manual details')}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )
        }
      />

      {/* Unknown Barcodes Panel for Owner */}
      {canManage && unknownBarcodes.length > 0 && !dismissedUnknownCard && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning shrink-0" />
              <h3 className="font-semibold text-sm">
                {t('products:unknownBarcodesTitle', { count: unknownBarcodes.length, defaultValue: `Unregistered barcodes (${unknownBarcodes.length})` })}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setDismissedUnknownCard(true)}
              aria-label={t('products:closeAlert', 'Close alert')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('products:unknownBarcodesDesc', 'Barcodes scanned at POS that are not yet in your inventory. Click "Register" to add them quickly.')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1">
            {unknownBarcodes.map((item) => (
              <div
                key={item.barcode}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-background/80 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-mono font-bold block truncate">{item.barcode}</span>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {t('products:scannedTimes', { count: item.scan_count, time: formatRelative(item.last_seen_at), defaultValue: `Scanned ${item.scan_count}× · ${formatRelative(item.last_seen_at)}` })}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  onClick={() => handleRegisterBarcode(item.barcode)}
                >
                  {t('products:register', 'Register')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={productsRes?.data || []}
        meta={productsRes?.meta}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        params={params}
        onParamsChange={setParams}
        renderMobileCard={renderMobileCard}
        toolbar={
          <DataTableToolbar
            searchPlaceholder={t('products:searchPlaceholder', 'Search name, SKU, barcode...')}
            searchValue={params.q}
            onSearchChange={(q) => setParams({ q, page: 1 })}
            filters={filters}
            isFiltered={isFiltered}
            onReset={resetParams}
          />
        }
        emptyState={
          <EmptyState
            icon={Package}
            title={isFiltered ? t('products:emptyFilteredTitle', 'No matching products found') : t('products:emptyDefaultTitle', 'No products registered yet')}
            description={
              isFiltered
                ? t('products:emptyFilteredDesc', 'Try clearing filters or searching for different keywords.')
                : t('products:emptyDefaultDesc', 'Get started by adding the first product to your store.')
            }
            actionText={isFiltered ? t('products:clearFilters', 'Clear Filters') : canManage ? t('products:addProduct', 'Add Product') : undefined}
            onAction={isFiltered ? resetParams : canManage ? handleCreate : undefined}
          />
        }
      />

      {/* Product Form Modal (Create / Edit / Duplicate) */}
      <ProductFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        product={editingProduct}
        categories={categories}
        onSuccess={refetch}
      />

      {/* Stock Adjustment Modal */}
      <AdjustStockDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        product={adjustingProduct}
        onSuccess={refetch}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('products:deleteConfirmTitle', { name: deletingProduct?.name, defaultValue: `Delete "${deletingProduct?.name}"?` })}
        description={t('products:deleteConfirmDesc', 'If this product has previous sales, it will be marked as inactive to preserve report integrity.')}
        confirmText={t('products:confirmDelete', 'Yes, Delete')}
        cancelText={t('products:cancel', 'Cancel')}
        tone="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Add by Barcode Modal */}
      <AddByBarcodeDialog
        open={addByBarcodeOpen}
        onOpenChange={setAddByBarcodeOpen}
        categories={categories}
        initialBarcode={addByBarcodeInitialCode}
        onSuccess={refetch}
        onEditProduct={handleEdit}
        onRestockProduct={handleAdjust}
      />

      {/* AI Product Intake Camera Modal */}
      <ResponsiveDialog
        open={isAiCaptureOpen}
        onOpenChange={setIsAiCaptureOpen}
        title={t('products:aiCaptureTitle', 'AI Stock-In')}
        description={t('products:aiCaptureDesc', 'Place up to 5 different products, labels facing the camera.')}
        className="sm:max-w-lg p-2"
      >
        <AiCapture
          onCapture={handleProductPhotoCapture}
          isAnalyzing={isAiScanning}
          analyzingStep={aiScanningStep}
          onCancel={() => setIsAiCaptureOpen(false)}
          title={t('products:aiCaptureTitle', 'AI Stock-In')}
          hint={t('products:aiCaptureDesc', 'Place up to 5 different products, labels facing the camera, then hold still.')}
          autoCaptureEnabled={true}
          featureKey="stockin"
        />
      </ResponsiveDialog>

      {/* AI First-Use Privacy Consent Dialog */}
      <FirstUseAiConsentDialog
        open={isConsentOpen}
        onOpenChange={setIsConsentOpen}
        onAccept={acceptConsent}
        onDecline={declineConsent}
      />

      {/* AI Product Intake Review Table */}
      <AiProductReviewTable
        open={isReviewTableOpen}
        onOpenChange={setIsReviewTableOpen}
        scanResult={productScanResult}
        imageBlob={capturedImageBlob}
        onRestockProduct={handleAdjust}
        onScanAgain={() => {
          setIsReviewTableOpen(false)
          setIsAiCaptureOpen(true)
        }}
        onSaved={refetch}
      />
    </PageContainer>
  )
}

export default ProductsPage
