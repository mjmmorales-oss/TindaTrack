import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Plus,
  ReceiptText,
  Eye,
  Ban,
  MoreVertical,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react'
import { subDays, startOfToday, endOfToday, parseISO } from 'date-fns'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSales, useVoidSale } from '@/features/sales/hooks/useSales'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useTableParams } from '@/components/data-table/useTableParams'
import { usePermissions } from '@/hooks/usePermissions'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime } from '@/lib/format'

export function SalesPage() {
  useDocumentTitle('Kasaysayan ng Benta (Sales History)')
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canViewAll = can('sales.view_all')
  const canVoid = can('sales.void')

  // Date range defaults: last 7 days
  const defaultFrom = useMemo(() => subDays(startOfToday(), 6).toISOString(), [])
  const defaultTo = useMemo(() => endOfToday().toISOString(), [])

  // Table params synced with URL
  const { params, setParams, resetParams } = useTableParams({
    q: '',
    from: defaultFrom,
    to: defaultTo,
    payment_type: '',
    status: '',
    user_id: '',
    sort: '-created_at',
    page: 1,
    per_page: 15,
  })

  // Queries
  const { data: salesRes, isLoading, isError, refetch } = useSales(params)
  const { data: staffRes } = useStaff()
  const voidMutation = useVoidSale()

  // Void dialog state
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [voidingSale, setVoidingSale] = useState(null)

  const handleOpenVoid = (sale) => {
    setVoidingSale(sale)
    setVoidDialogOpen(true)
  }

  const handleConfirmVoid = async (reason) => {
    if (!voidingSale) return
    await voidMutation.mutateAsync({ id: voidingSale.id, reason })
    setVoidDialogOpen(false)
    setVoidingSale(null)
  }

  // Cashier filter options (for owner)
  const cashierFilterOptions = useMemo(() => {
    if (!staffRes?.data) return []
    return staffRes.data.map((u) => ({
      label: u.name,
      value: String(u.id),
    }))
  }, [staffRes?.data])

  // Faceted filter configurations
  const facetedFilters = useMemo(() => {
    const filters = [
      {
        columnId: 'payment_type',
        title: 'Paraan (Payment)',
        options: [
          { label: 'Cash (Salapi)', value: 'cash', icon: CreditCard },
          { label: 'Utang (Pautang)', value: 'utang', icon: ReceiptText },
        ],
      },
      {
        columnId: 'status',
        title: 'Katayuan (Status)',
        options: [
          { label: 'Completed (Tapos)', value: 'completed', icon: CheckCircle2 },
          { label: 'Voided (Kanselado)', value: 'voided', icon: XCircle },
        ],
      },
    ]

    if (canViewAll && cashierFilterOptions.length > 0) {
      filters.push({
        columnId: 'user_id',
        title: 'Kahera (Cashier)',
        options: cashierFilterOptions,
      })
    }

    return filters
  }, [canViewAll, cashierFilterOptions])

  // Selected date range for DateRangePicker
  const selectedDateRange = useMemo(() => {
    if (!params.from) return undefined
    return {
      from: parseISO(params.from),
      to: params.to ? parseISO(params.to) : undefined,
    }
  }, [params.from, params.to])

  const handleDateRangeChange = (range) => {
    if (range?.from) {
      setParams({
        from: range.from.toISOString(),
        to: range.to ? range.to.toISOString() : range.from.toISOString(),
        page: 1,
      })
    } else {
      setParams({
        from: '',
        to: '',
        page: 1,
      })
    }
  }

  // Summary strip data
  const summary = salesRes?.summary || {
    total_amount: 0,
    total_count: 0,
    average_sale: 0,
  }

  // Table columns definition
  const columns = useMemo(
    () => [
      {
        id: 'sale_no',
        accessorKey: 'sale_no',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Resibo No." />,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => navigate(`/sales/${row.original.id}`)}
            className="font-mono text-xs font-semibold text-primary hover:underline"
          >
            {row.original.sale_no}
          </button>
        ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Petsa at Oras" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'user_id',
        accessorKey: 'user_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Kahera" />,
        cell: ({ row }) => {
          const cashier = row.original.cashier
          return (
            <div className="flex items-center gap-2">
              <UserAvatar name={cashier?.name || 'Juan'} size="xs" />
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {cashier?.name || 'Juan'}
              </span>
            </div>
          )
        },
      },
      {
        id: 'customer',
        accessorKey: 'customer_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Kustomer / Suki" />,
        cell: ({ row }) => {
          const cust = row.original.customer
          if (!cust) {
            return <span className="text-xs text-muted-foreground italic">Walk-in</span>
          }
          return (
            <Link
              to={`/customers/${cust.id}`}
              className="text-xs font-medium text-foreground hover:text-primary hover:underline truncate max-w-[130px] block"
            >
              {cust.nickname ? `${cust.name} (${cust.nickname})` : cust.name}
            </Link>
          )
        },
      },
      {
        id: 'items_count',
        header: 'Mga Item',
        cell: ({ row }) => {
          const count = row.original.items?.length || 0
          return <span className="text-xs text-muted-foreground">{count} items</span>
        },
      },
      {
        id: 'payment_type',
        accessorKey: 'payment_type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Paraan" />,
        cell: ({ row }) => {
          const type = row.original.payment_type
          return (
            <StatusBadge
              status={type === 'utang' ? 'utang' : 'completed'}
              label={type === 'utang' ? 'Utang' : 'Cash'}
            />
          )
        },
      },
      {
        id: 'total_amount',
        accessorKey: 'total_amount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Halaga" />,
        cell: ({ row }) => {
          const isVoided = row.original.status === 'voided'
          const amt = row.original.total_amount ?? row.original.total ?? 0
          return (
            <div className="font-medium">
              <Money
                amount={amt}
                size="sm"
                className={isVoided ? 'line-through text-muted-foreground' : 'text-foreground font-semibold'}
              />
            </div>
          )
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Katayuan" />,
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <StatusBadge
              status={status === 'voided' ? 'archived' : 'success'}
              label={status === 'voided' ? 'Voided' : 'Completed'}
            />
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const sale = row.original
          const canVoidThis = canVoid && sale.status !== 'voided'

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label={`Aksyon para sa resibo ${sale.sale_no}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/sales/${sale.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Tingnan ang Resibo
                  </DropdownMenuItem>
                  {canVoidThis && (
                    <DropdownMenuItem
                      onClick={() => handleOpenVoid(sale)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      I-void ang Benta
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [navigate, canVoid],
  )

  // Mobile card renderer below md
  const renderMobileCard = (sale) => {
    const isVoided = sale.status === 'voided'
    const amt = sale.total_amount ?? sale.total ?? 0
    const canVoidThis = canVoid && !isVoided
    const cust = sale.customer

    return (
      <Card
        key={sale.id}
        className="p-3.5 space-y-3 border-border shadow-xs hover:border-primary/40 transition-colors"
      >
        {/* Top: Sale No, Time, Total */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate(`/sales/${sale.id}`)}
              className="font-mono text-sm font-bold text-primary hover:underline truncate block"
            >
              {sale.sale_no}
            </button>
            <span className="text-[11px] text-muted-foreground block">
              {formatDateTime(sale.created_at)}
            </span>
          </div>
          <div className="text-right shrink-0">
            <Money
              amount={amt}
              size="base"
              className={isVoided ? 'line-through text-muted-foreground' : 'text-foreground font-bold'}
            />
            <span className="text-[10px] text-muted-foreground block">
              {sale.items?.length || 0} items
            </span>
          </div>
        </div>

        {/* Middle: Customer & Cashier */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
          <div className="truncate max-w-[55%]">
            <span className="font-medium text-foreground">
              {cust ? (cust.nickname ? `${cust.name} (${cust.nickname})` : cust.name) : 'Walk-in'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <UserAvatar name={sale.cashier?.name || 'Juan'} size="xs" />
            <span className="text-[11px] truncate max-w-[90px]">
              {sale.cashier?.name || 'Juan'}
            </span>
          </div>
        </div>

        {/* Bottom: Badges & 44px thumb action */}
        <div className="flex items-center justify-between border-t border-border/60 pt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge
              status={sale.payment_type === 'utang' ? 'utang' : 'completed'}
              label={sale.payment_type === 'utang' ? 'Utang' : 'Cash'}
            />
            <StatusBadge
              status={isVoided ? 'archived' : 'success'}
              label={isVoided ? 'Voided' : 'Completed'}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground touch-manipulation"
                aria-label={`Aksyon sa resibo ${sale.sale_no}`}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/sales/${sale.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Tingnan ang Resibo
              </DropdownMenuItem>
              {canVoidThis && (
                <DropdownMenuItem
                  onClick={() => handleOpenVoid(sale)}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  I-void ang Benta
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Kasaysayan ng Benta"
        description="Subaybayan ang mga transaksyon, resibo, paraan ng bayad, at talaan ng void"
        actions={
          <Button asChild size="sm" className="gap-1.5 h-9">
            <Link to="/pos">
              <Plus className="h-4 w-4" />
              Bagong Benta (New Sale)
            </Link>
          </Button>
        }
      />

      {/* Summary Strip (3-item KPI row, 3-cols compact on phones) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 border-border bg-card">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] sm:text-xs font-medium truncate">Kabuuang Benta</span>
          </div>
          <Money
            amount={summary.total_amount}
            size="sm"
            className="sm:text-lg font-bold text-foreground block truncate"
          />
          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
            mga validong benta
          </span>
        </Card>

        <Card className="p-3 sm:p-4 border-border bg-card">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] sm:text-xs font-medium truncate">Transaksyon</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-foreground block truncate">
            {summary.total_count}
          </span>
          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
            kabuuang resibo
          </span>
        </Card>

        <Card className="p-3 sm:p-4 border-border bg-card">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <ReceiptText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] sm:text-xs font-medium truncate">Karaniwang Benta</span>
          </div>
          <Money
            amount={summary.average_sale}
            size="sm"
            className="sm:text-lg font-bold text-foreground block truncate"
          />
          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
            average per resibo
          </span>
        </Card>
      </div>

      {/* Main Sales Table & Filter Kit */}
      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={salesRes?.data || []}
          total={salesRes?.meta?.total || 0}
          page={params.page}
          perPage={params.per_page}
          onPageChange={(page) => setParams({ page })}
          onPerPageChange={(per_page) => setParams({ per_page, page: 1 })}
          sort={params.sort}
          onSortChange={(sort) => setParams({ sort, page: 1 })}
          search={params.q}
          onSearchChange={(q) => setParams({ q, page: 1 })}
          searchPlaceholder="Hanapin sa Resibo No. (hal. TT-202610...)"
          facetedFilters={facetedFilters}
          activeFilters={params}
          onFilterChange={(colId, val) => setParams({ [colId]: val, page: 1 })}
          onResetFilters={() =>
            resetParams({
              q: '',
              from: defaultFrom,
              to: defaultTo,
              payment_type: '',
              status: '',
              user_id: '',
              sort: '-created_at',
              page: 1,
              per_page: 15,
            })
          }
          extraFilterComponent={
            <div className="w-full sm:w-auto">
              <DateRangePicker
                value={selectedDateRange}
                onChange={handleDateRangeChange}
                placeholder="Pumili ng petsa"
                className="w-full sm:w-[260px] h-9 text-xs"
              />
            </div>
          }
          renderMobileCard={renderMobileCard}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyIcon={ReceiptText}
          emptyTitle="Walang natagpuang rekord ng benta"
          emptyDescription="Subukang baguhin ang napiling petsa, tagasala (filter), o mag-record ng bagong benta sa POS."
          emptyAction={
            <Button asChild size="sm">
              <Link to="/pos">Pumunta sa POS</Link>
            </Button>
          }
        />
      </div>

      {/* Void Confirmation Dialog with required reason */}
      <ConfirmDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        title="I-void ang Resibo (Void Sale)"
        description={`Sigurado ka bang nais mong i-void ang resibo ${voidingSale?.sale_no}? Ibabalik nito ang stock sa imbentaryo at ibabawas ang utang kung pautang ang transaksyon.`}
        confirmText="Oo, I-void ang Benta"
        cancelText="Huwag Ituloy"
        tone="destructive"
        requireReason={true}
        minReasonLength={5}
        reasonLabel="Dahilan ng Pag-void (Required)"
        reasonPlaceholder="Hal. Maling item ang na-punch sa POS o ibinalik ng kustomer..."
        onConfirm={handleConfirmVoid}
        isLoading={voidMutation.isPending}
      />
    </PageContainer>
  )
}

export default SalesPage
