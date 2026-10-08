import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Plus,
  Users,
  Eye,
  Edit2,
  Trash2,
  HandCoins,
  MoreVertical,
  Phone,
  MapPin,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useCustomers,
  useDeleteCustomer,
} from '@/features/customers/hooks/useCustomers'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { RecordPaymentDialog } from '@/features/utang/components/RecordPaymentDialog'
import { useTableParams } from '@/components/data-table/useTableParams'
import { usePermissions } from '@/hooks/usePermissions'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function CustomersPage() {
  useDocumentTitle('Mga Suki at Kustomer (Customers)')
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canManage = can('customers.manage')
  const canDelete = can('customers.delete')
  const canCollect = can('utang.record_payment')

  // Table params synced with URL
  const { params, setParams, resetParams } = useTableParams({
    q: '',
    with_balance: '',
    over_limit: '',
    sort: 'name',
    page: 1,
    per_page: 15,
  })

  // Queries
  const { data: customersRes, isLoading, isError, refetch } = useCustomers(params)
  const deleteMutation = useDeleteCustomer()

  // Dialog States
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [payingCustomer, setPayingCustomer] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCustomer, setDeletingCustomer] = useState(null)
  const [blockedAlertOpen, setBlockedAlertOpen] = useState(false)
  const [blockedCustomer, setBlockedCustomer] = useState(null)

  const handleCreate = () => {
    setEditingCustomer(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (customer) => {
    setEditingCustomer(customer)
    setFormDialogOpen(true)
  }

  const handleOpenPayment = (customer) => {
    setPayingCustomer(customer)
    setPaymentDialogOpen(true)
  }

  const handleDeleteClick = (customer) => {
    if (customer.credit_balance > 0) {
      setBlockedCustomer(customer)
      setBlockedAlertOpen(true)
      return
    }
    setDeletingCustomer(customer)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return
    await deleteMutation.mutateAsync(deletingCustomer.id)
    setDeleteDialogOpen(false)
    setDeletingCustomer(null)
  }

  // Quick filter helpers
  const handleQuickFilter = (type) => {
    if (type === 'all') {
      setParams({ with_balance: '', over_limit: '', page: 1 })
    } else if (type === 'balance') {
      setParams({
        with_balance: params.with_balance === 'true' ? '' : 'true',
        over_limit: '',
        page: 1,
      })
    } else if (type === 'over_limit') {
      setParams({
        over_limit: params.over_limit === 'true' ? '' : 'true',
        with_balance: '',
        page: 1,
      })
    }
  }

  // Helper to render balance badge
  const renderBalanceBadge = (customer) => {
    const bal = customer.credit_balance || 0
    const limit = customer.credit_limit || 0

    if (bal <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          ₱0.00 (Walang Utang)
        </span>
      )
    }

    if (bal > limit) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive border border-destructive/30">
          <AlertCircle className="h-3 w-3" />
          <Money amount={bal} size="xs" tone="destructive" /> (Over Limit)
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-utang/15 px-2.5 py-0.5 text-xs font-semibold text-utang border border-utang/30">
        <Money amount={bal} size="xs" tone="utang" /> Utang
      </span>
    )
  }

  // Columns definition
  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Pangalan ng Suki" />,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex items-center gap-3">
              <UserAvatar name={c.name} style="notionists" size="md" />
              <div className="min-w-0">
                <Link
                  to={`/customers/${c.id}`}
                  className="font-medium text-sm text-foreground hover:text-primary hover:underline truncate block"
                >
                  {c.name}
                </Link>
                {c.nickname && (
                  <span className="text-xs text-muted-foreground block truncate">
                    "{c.nickname}"
                  </span>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: 'contact_number',
        accessorKey: 'contact_number',
        header: 'Telepono',
        cell: ({ row }) => {
          const phone = row.original.contact_number
          return phone ? (
            <span className="text-xs font-mono text-muted-foreground">{phone}</span>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          )
        },
      },
      {
        id: 'address',
        accessorKey: 'address',
        header: 'Tirahan',
        cell: ({ row }) => {
          const addr = row.original.address
          return (
            <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
              {addr || '—'}
            </span>
          )
        },
      },
      {
        id: 'credit_balance',
        accessorKey: 'credit_balance',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Balanse ng Utang" />,
        cell: ({ row }) => renderBalanceBadge(row.original),
      },
      {
        id: 'last_activity',
        accessorKey: 'last_activity',
        header: 'Huling Transaksyon',
        cell: ({ row }) => {
          const date = row.original.last_activity || row.original.created_at
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(date)}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label={`Aksyon para kay ${c.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Tingnan ang Profile
                  </DropdownMenuItem>

                  {canCollect && c.credit_balance > 0 && (
                    <DropdownMenuItem
                      onClick={() => handleOpenPayment(c)}
                      className="text-utang focus:text-utang"
                    >
                      <HandCoins className="mr-2 h-4 w-4" />
                      Kolektahin ang Bayad
                    </DropdownMenuItem>
                  )}

                  {canManage && (
                    <DropdownMenuItem onClick={() => handleEdit(c)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      I-edit ang Impormasyon
                    </DropdownMenuItem>
                  )}

                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(c)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Burahin ang Rekord
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [navigate, canManage, canDelete, canCollect],
  )

  // Mobile card renderer below md
  const renderMobileCard = (customer) => {
    return (
      <Card
        key={customer.id}
        className="p-3.5 space-y-3 border-border shadow-xs hover:border-primary/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={customer.name} style="notionists" size="md" />
            <div className="min-w-0">
              <Link
                to={`/customers/${customer.id}`}
                className="font-semibold text-sm text-foreground hover:text-primary hover:underline truncate block"
              >
                {customer.name}
              </Link>
              {customer.nickname && (
                <span className="text-xs text-muted-foreground block truncate">
                  "{customer.nickname}"
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground touch-manipulation shrink-0"
                aria-label={`Aksyon para kay ${customer.name}`}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Tingnan ang Profile
              </DropdownMenuItem>
              {canCollect && customer.credit_balance > 0 && (
                <DropdownMenuItem
                  onClick={() => handleOpenPayment(customer)}
                  className="text-utang focus:text-utang"
                >
                  <HandCoins className="mr-2 h-4 w-4" />
                  Kolektahin ang Bayad
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem onClick={() => handleEdit(customer)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  I-edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(customer)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Burahin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact and address metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground border-t border-border/60 pt-2">
          {customer.contact_number && (
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="font-mono">{customer.contact_number}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.address}</span>
            </div>
          )}
        </div>

        {/* Balance & Quick Collect Action */}
        <div className="flex items-center justify-between border-t border-border/60 pt-2">
          <div>{renderBalanceBadge(customer)}</div>
          {canCollect && customer.credit_balance > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenPayment(customer)}
              className="h-8 gap-1.5 text-xs text-utang hover:text-utang border-utang/40 hover:bg-utang/10"
            >
              <HandCoins className="h-3.5 w-3.5" />
              Kolektahin
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Direktoryo ng Suki (Customers)"
        description="Pamahalaan ang mga profile ng kustomer, contact number, credit limit, at utang"
        actions={
          canManage && (
            <Button size="sm" onClick={handleCreate} className="gap-1.5 h-9">
              <Plus className="h-4 w-4" />
              Magdagdag ng Suki (Add Customer)
            </Button>
          )
        }
      />

      {/* Quick Filters Toggle Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-muted-foreground font-medium shrink-0 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" />
          Filter:
        </span>
        <button
          type="button"
          onClick={() => handleQuickFilter('all')}
          className={cn(
            'inline-flex h-8 items-center rounded-full px-3 font-medium transition-colors border',
            !params.with_balance && !params.over_limit
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-muted',
          )}
        >
          Lahat (All)
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('balance')}
          className={cn(
            'inline-flex h-8 items-center rounded-full px-3 font-medium transition-colors border',
            params.with_balance === 'true'
              ? 'bg-utang text-white border-utang'
              : 'bg-card text-muted-foreground border-border hover:bg-muted',
          )}
        >
          May Utang (With Balance)
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('over_limit')}
          className={cn(
            'inline-flex h-8 items-center rounded-full px-3 font-medium transition-colors border',
            params.over_limit === 'true'
              ? 'bg-destructive text-destructive-foreground border-destructive'
              : 'bg-card text-muted-foreground border-border hover:bg-muted',
          )}
        >
          Lampas sa Limit (Over Limit)
        </button>
      </div>

      {/* Data Table */}
      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={customersRes?.data || []}
          total={customersRes?.meta?.total || 0}
          page={params.page}
          perPage={params.per_page}
          onPageChange={(page) => setParams({ page })}
          onPerPageChange={(per_page) => setParams({ per_page, page: 1 })}
          sort={params.sort}
          onSortChange={(sort) => setParams({ sort, page: 1 })}
          search={params.q}
          onSearchChange={(q) => setParams({ q, page: 1 })}
          searchPlaceholder="Maghanap sa pangalan, palayaw, o telepono..."
          activeFilters={params}
          onResetFilters={() =>
            resetParams({
              q: '',
              with_balance: '',
              over_limit: '',
              sort: 'name',
              page: 1,
              per_page: 15,
            })
          }
          renderMobileCard={renderMobileCard}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyIcon={Users}
          emptyTitle="Walang natagpuang kustomer"
          emptyDescription="Maaaring magdagdag ng bagong suki o baguhin ang mga filter sa paghahanap."
          emptyAction={
            canManage && (
              <Button size="sm" onClick={handleCreate}>
                Magdagdag ng Suki
              </Button>
            )
          }
        />
      </div>

      {/* Customer Form Dialog */}
      <CustomerFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        customer={editingCustomer}
        onSuccess={() => refetch()}
      />

      {/* Shared Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customer={payingCustomer}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Burahin ang Rekord ng Suki"
        description={`Sigurado ka bang nais mong burahin ang rekord ni ${deletingCustomer?.name}? Hindi na ito maibabalik.`}
        confirmText="Oo, Burahin"
        cancelText="Huwag Ituloy"
        tone="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Blocked Delete Explanation Dialog */}
      <ResponsiveDialog
        open={blockedAlertOpen}
        onOpenChange={setBlockedAlertOpen}
        title="Hindi Maaaring Burahin ang Suki"
        description="Mayroon pang natitirang utang ang kustomer."
        className="sm:max-w-md"
      >
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">May Natitirang Balanse</p>
              <p className="text-xs mt-1 text-destructive/90">
                May natitirang utang pa na{' '}
                <strong className="underline">
                  ₱{blockedCustomer?.credit_balance?.toFixed(2)}
                </strong>{' '}
                si {blockedCustomer?.name}. Kailangang makolekta o ma-clear muna ang utang bago
                burahin ang kanyang account.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setBlockedAlertOpen(false)}
            >
              Isara (Close)
            </Button>
            {canCollect && (
              <Button
                onClick={() => {
                  setBlockedAlertOpen(false)
                  handleOpenPayment(blockedCustomer)
                }}
                className="gap-1.5"
              >
                <HandCoins className="h-4 w-4" />
                Kolektahin ang Bayad
              </Button>
            )}
          </div>
        </div>
      </ResponsiveDialog>
    </PageContainer>
  )
}

export default CustomersPage
