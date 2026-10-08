import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowDownUp,
  Copy,
  Eye,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
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
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { AdjustStockDialog } from '@/features/products/components/AdjustStockDialog'
import { useProducts, useDeleteProduct } from '@/features/products/hooks/useProducts'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { formatRelative } from '@/lib/format'

/**
 * Product catalog management page with server-filtered data table,
 * category & stock faceted filters, responsive mobile cards, and full CRUD workflows.
 */
export function ProductsPage() {
  useDocumentTitle('Products')
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

  // Queries
  const {
    data: productsRes,
    isLoading,
    isError,
    refetch,
  } = useProducts(params)

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

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustingProduct, setAdjustingProduct] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState(null)

  const handleCreate = () => {
    setEditingProduct(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (prod) => {
    setEditingProduct(prod)
    setFormDialogOpen(true)
  }

  const handleDuplicate = (prod) => {
    setEditingProduct({
      ...prod,
      name: `${prod.name} (Kopya)`,
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
    { label: 'In Stock', value: 'in' },
    { label: 'Low Stock', value: 'low' },
    { label: 'Out of Stock', value: 'out' },
  ]

  const statusFilterOptions = [
    { label: 'Aktibo (Active)', value: 'true' },
    { label: 'Hindi Aktibo (Inactive)', value: 'false' },
  ]

  const isFiltered = Boolean(
    params.q || params.category_id || params.stock || params.is_active,
  )

  const filters = [
    {
      columnId: 'category_id',
      title: 'Kategorya',
      options: categoryFilterOptions,
      selectedValues: params.category_id ? [String(params.category_id)] : [],
      onChange: (vals) =>
        setParams({ category_id: vals.length ? vals[0] : '', page: 1 }),
    },
    {
      columnId: 'stock',
      title: 'Stock Level',
      options: stockFilterOptions,
      selectedValues: params.stock ? [params.stock] : [],
      onChange: (vals) =>
        setParams({ stock: vals.length ? vals[0] : '', page: 1 }),
    },
    {
      columnId: 'is_active',
      title: 'Katayuan',
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
          <DataTableColumnHeader column={column} title="Produkto" />
        ),
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex items-center gap-3 py-1">
              <ProductThumb name={p.name} size="md" className="shrink-0" />
              <div className="min-w-0">
                <Link
                  to={`/products/${p.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                >
                  {p.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>{p.sku || 'WALANG-SKU'}</span>
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
          <DataTableColumnHeader column={column} title="Kategorya" />
        ),
        cell: ({ row }) => {
          const catName = categoryMap[row.original.category_id] || 'Iba pa'
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
          <DataTableColumnHeader column={column} title="Presyo" />
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
          <DataTableColumnHeader column={column} title="Puhunan (Cost)" />
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
          <DataTableColumnHeader column={column} title="Stock" />
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
          <DataTableColumnHeader column={column} title="Katayuan" />
        ),
        cell: ({ row }) => (
          <StatusBadge
            type="active"
            variant={row.original.is_active ? 'active' : 'inactive'}
          />
        ),
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Huling Na-update" />
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
                  aria-label="Buksan ang menu ng produkto"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => navigate(`/products/${p.id}`)}
                  className="gap-2 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Tingnan (View)
                </DropdownMenuItem>

                {canManage && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleEdit(p)}
                      className="gap-2 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      I-edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAdjust(p)}
                      className="gap-2 text-xs"
                    >
                      <ArrowDownUp className="h-3.5 w-3.5" />
                      I-adjust ang Stock
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDuplicate(p)}
                      className="gap-2 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Kopyahin (Duplicate)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(p)}
                      className="gap-2 text-xs text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Burahin (Delete)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    )

    return cols
  }, [categoryMap, canViewCost, canManage, navigate])

  // Mobile card renderer for screens below md
  const renderMobileCard = (row) => {
    const p = row.original
    const catName = categoryMap[p.category_id] || 'Iba pa'

    return (
      <div
        key={p.id}
        className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ProductThumb name={p.name} size="md" className="shrink-0" />
            <div className="min-w-0">
              <Link
                to={`/products/${p.id}`}
                className="font-semibold text-sm text-foreground truncate block hover:text-primary"
              >
                {p.name}
              </Link>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {p.sku || 'WALANG-SKU'}
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
                aria-label="Aksyon sa produkto"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => navigate(`/products/${p.id}`)}
                className="gap-2 text-xs"
              >
                <Eye className="h-4 w-4" />
                Tingnan ang Detalye
              </DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleEdit(p)}
                    className="gap-2 text-xs"
                  >
                    <Pencil className="h-4 w-4" />
                    I-edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAdjust(p)}
                    className="gap-2 text-xs"
                  >
                    <ArrowDownUp className="h-4 w-4" />
                    I-adjust ang Stock
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDuplicate(p)}
                    className="gap-2 text-xs"
                  >
                    <Copy className="h-4 w-4" />
                    Kopyahin
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(p)}
                    className="gap-2 text-xs text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Burahin
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Details row: Price, Cost, Category, Status */}
        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2.5">
          <div>
            <span className="text-muted-foreground block text-[11px]">Presyo ng Benta</span>
            <Money amount={p.price} size="sm" tone="default" className="font-bold" />
          </div>

          {canViewCost && (
            <div>
              <span className="text-muted-foreground block text-[11px]">Puhunan (Cost)</span>
              <Money amount={p.cost_price} size="sm" tone="muted" />
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
              {catName}
            </Badge>
          </div>

          <div className="flex items-center justify-end pt-1">
            <StatusBadge
              type="active"
              variant={p.is_active ? 'active' : 'inactive'}
              className="text-[10px] px-1.5 py-0"
            />
          </div>
        </div>

        {/* Stock Level Bar */}
        <div className="border-t border-border/50 pt-2 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground text-[11px]">Kasalukuyang Stock:</span>
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
        title="Mga Paninda at Imbentaryo"
        description="Pamamahala ng mga produkto, presyo ng benta, puhunan, at dami ng stock"
        actions={
          canManage && (
            <Button onClick={handleCreate} className="gap-1.5 shadow-xs w-full sm:w-auto h-11 sm:h-9">
              <Plus className="h-4 w-4" />
              Magdagdag ng Produkto
            </Button>
          )
        }
      />

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
            searchPlaceholder="Maghanap ng pangalan, SKU, barcode..."
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
            title={isFiltered ? 'Walang nahanap na tugmang produkto' : 'Walang nakatalang paninda'}
            description={
              isFiltered
                ? 'Subukang alisin ang mga filter o maghanap ng ibang salita.'
                : 'Magsimula sa pamamagitan ng pagdaragdag ng unang produkto sa iyong tindahan.'
            }
            actionText={isFiltered ? 'I-clear ang mga Filter' : canManage ? 'Magdagdag ng Produkto' : undefined}
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
        title={`Burahin ang "${deletingProduct?.name}"?`}
        description="Kapag may nakaraang benta na ito, mamarkahan ito bilang hindi aktibo (inactive) upang mapanatili ang integridad ng mga ulat."
        confirmText="Oo, Burahin"
        cancelText="Kanselahin"
        tone="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  )
}

export default ProductsPage
