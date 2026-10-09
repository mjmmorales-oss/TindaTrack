import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import {
  ArrowLeft,
  HandCoins,
  Edit2,
  Trash2,
  ShoppingBag,
  ReceiptText,
  Phone,
  MapPin,
  AlertCircle,
  Clock,
} from 'lucide-react'

import { PageContainer } from '@/components/layout/PageContainer'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Timeline } from '@/components/common/Timeline'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import {
  useCustomer,
  useCustomerLedger,
  useDeleteCustomer,
} from '@/features/customers/hooks/useCustomers'
import { useSales } from '@/features/sales/hooks/useSales'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { RecordPaymentDialog } from '@/features/utang/components/RecordPaymentDialog'
import { usePermissions } from '@/hooks/usePermissions'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime, formatDate } from '@/lib/format'

export function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canManage = can('customers.manage')
  const canDelete = can('customers.delete')
  const canCollect = can('utang.record_payment')

  // Queries
  const {
    data: customerRes,
    isLoading: isCustLoading,
    isError: isCustError,
    refetch: refetchCust,
  } = useCustomer(id)
  const customer = customerRes?.data

  const {
    data: ledgerRes,
    isLoading: isLedgerLoading,
    refetch: refetchLedger,
  } = useCustomerLedger(id)
  const ledgerTimeline = ledgerRes?.data?.timeline || []

  const {
    data: salesRes,
    isLoading: isSalesLoading,
  } = useSales({ customer_id: id, per_page: 20 })
  const customerSales = salesRes?.data || []

  const deleteMutation = useDeleteCustomer()

  useDocumentTitle(customer ? `${customer.name} - Profile` : 'Suki Profile')

  // Dialog States
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [blockedAlertOpen, setBlockedAlertOpen] = useState(false)

  const handleDeleteClick = () => {
    if ((customer?.credit_balance || 0) > 0) {
      setBlockedAlertOpen(true)
      return
    }
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!customer?.id) return
    await deleteMutation.mutateAsync(customer.id)
    setDeleteDialogOpen(false)
    navigate('/customers')
  }

  const handleRefreshAll = () => {
    refetchCust()
    refetchLedger()
  }

  if (isCustLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </PageContainer>
    )
  }

  if (isCustError || !customer) {
    return (
      <PageContainer>
        <ErrorState
          title="Hindi mahanap ang suki"
          message="Maaaring nabura o maling customer ID ang inilagay."
          onRetry={refetchCust}
        />
      </PageContainer>
    )
  }

  const balance = Number(customer.credit_balance || 0)
  const limit = Number(customer.credit_limit || 0)
  const utilization = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 100
  const isOverLimit = balance > limit

  // Prepare Timeline items
  const timelineItems = ledgerTimeline.map((item) => ({
    id: item.id,
    icon: item.type === 'sale' ? ShoppingBag : HandCoins,
    title: item.title,
    description: item.meta,
    timestamp: formatDateTime(item.date),
    amount: item.amount,
    runningBalance: item.balance,
    tone: item.type === 'sale' ? 'utang' : 'success',
  }))

  return (
    <PageContainer>
      {/* Back button */}
      <div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="gap-1.5 h-8 text-xs mb-4"
        >
          <Link to="/customers">
            <ArrowLeft className="h-3.5 w-3.5" />
            Bumalik sa mga Suki
          </Link>
        </Button>
      </div>

      {/* Customer Header Card: Stacks on phones */}
      <Card className="border-border p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Identity: Avatar + Names + Contacts */}
          <div className="flex items-start gap-4">
            <UserAvatar name={customer.name} style="notionists" size="xl" />
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {customer.name}
                </h1>
                {customer.nickname && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    "{customer.nickname}"
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {customer.contact_number && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {customer.contact_number}
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {customer.address}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Suki simula {formatDate(customer.created_at)}
                </span>
              </div>

              {customer.notes && (
                <p className="text-xs text-muted-foreground/90 italic pt-1 line-clamp-2">
                  Tala: {customer.notes}
                </p>
              )}
            </div>
          </div>

          {/* Big Balance & Credit Limit Progress */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 min-w-[260px] sm:min-w-[300px]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Kasalukuyang Utang
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Limit: <Money amount={limit} size="xs" />
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <Money
                amount={balance}
                size="xl"
                tone={balance === 0 ? 'success' : isOverLimit ? 'destructive' : 'utang'}
                className="text-2xl sm:text-3xl font-extrabold"
              />
              {isOverLimit && (
                <span className="text-[11px] font-bold text-destructive flex items-center gap-0.5">
                  <AlertCircle className="h-3 w-3" /> Lampas Limit
                </span>
              )}
            </div>

            {/* Credit Limit Progress */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Paggamit sa Limit:</span>
                <span className={isOverLimit ? 'font-bold text-destructive' : 'font-medium'}>
                  {utilization}%
                </span>
              </div>
              <Progress
                value={Math.min(100, utilization)}
                className={`h-2 ${isOverLimit ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
              />
            </div>
          </div>
        </div>

        {/* Action buttons: full width in row of 2 on phones, flex on desktop */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          {canCollect && (
            <Button
              onClick={() => setPaymentDialogOpen(true)}
              disabled={balance <= 0}
              className="flex-1 sm:flex-none gap-2 h-11 sm:h-9"
            >
              <HandCoins className="h-4 w-4" />
              Kolektahin ang Bayad
            </Button>
          )}

          {canManage && (
            <Button
              variant="outline"
              onClick={() => setFormDialogOpen(true)}
              className="flex-1 sm:flex-none gap-2 h-11 sm:h-9"
            >
              <Edit2 className="h-4 w-4" />
              I-edit ang Profile
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDeleteClick}
              className="w-full sm:w-auto ml-auto text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-2 h-11 sm:h-9"
            >
              <Trash2 className="h-4 w-4" />
              Burahin ang Rekord
            </Button>
          )}
        </div>
      </Card>

      {/* Secondary Sections in Tabs (Scroll horizontally on mobile) */}
      <div className="mt-6">
        <Tabs defaultValue="ledger" className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-10 w-full sm:w-auto inline-flex min-w-[320px]">
              <TabsTrigger value="ledger" className="flex-1 sm:flex-none gap-2">
                <ReceiptText className="h-4 w-4" />
                Ledger ng Utang ({timelineItems.length})
              </TabsTrigger>
              <TabsTrigger value="purchases" className="flex-1 sm:flex-none gap-2">
                <ShoppingBag className="h-4 w-4" />
                Kasaysayan ng Bili ({customerSales.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Ledger Timeline Tab */}
          <TabsContent value="ledger">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Kronolohiya ng Utang at Bayad (Running Balance)</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Pinakabago muna
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {isLedgerLoading ? (
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : timelineItems.length === 0 ? (
                  <EmptyState
                    icon={ReceiptText}
                    title="Walang naitalang transaksyon ng utang"
                    description="Kasalukuyang walang utang o naitalang bayad para sa kustomer na ito."
                  />
                ) : (
                  <Timeline items={timelineItems} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Lahat ng Binili ni {customer.nickname || customer.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSalesLoading ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : customerSales.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title="Walang natagpuang rekord ng pagbili"
                    description="Wala pang nakatalang benta sa ilalim ng pangalan ng kustomer na ito."
                  />
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-border/80 text-muted-foreground font-medium">
                          <tr>
                            <th className="py-2.5">Resibo No.</th>
                            <th className="py-2.5">Petsa</th>
                            <th className="py-2.5">Mga Item</th>
                            <th className="py-2.5">Paraan</th>
                            <th className="py-2.5 text-right">Kabuuang Halaga</th>
                            <th className="py-2.5">Katayuan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {customerSales.map((s) => (
                            <tr key={s.id} className="hover:bg-muted/30">
                              <td className="py-2.5">
                                <Link
                                  to={`/sales/${s.id}`}
                                  className="font-mono font-medium text-primary hover:underline"
                                >
                                  {s.sale_no}
                                </Link>
                              </td>
                              <td className="py-2.5 text-muted-foreground">
                                {formatDateTime(s.created_at)}
                              </td>
                              <td className="py-2.5 text-muted-foreground">
                                {s.items?.length || 0} items
                              </td>
                              <td className="py-2.5">
                                <StatusBadge
                                  status={s.payment_type === 'utang' ? 'utang' : 'completed'}
                                  label={s.payment_type === 'utang' ? 'Utang' : 'Cash'}
                                />
                              </td>
                              <td className="py-2.5 text-right font-medium">
                                <Money
                                  amount={s.total_amount ?? s.total}
                                  size="sm"
                                  className={s.status === 'voided' ? 'line-through text-muted-foreground' : ''}
                                />
                              </td>
                              <td className="py-2.5">
                                <StatusBadge
                                  status={s.status === 'voided' ? 'archived' : 'success'}
                                  label={s.status === 'voided' ? 'Voided' : 'Completed'}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards below md */}
                    <div className="md:hidden space-y-3">
                      {customerSales.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border border-border p-3 space-y-2 bg-card"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <Link
                                to={`/sales/${s.id}`}
                                className="font-mono text-xs font-bold text-primary hover:underline"
                              >
                                {s.sale_no}
                              </Link>
                              <span className="text-[11px] text-muted-foreground block">
                                {formatDateTime(s.created_at)}
                              </span>
                            </div>
                            <Money
                              amount={s.total_amount ?? s.total}
                              size="sm"
                              className={s.status === 'voided' ? 'line-through text-muted-foreground' : 'font-bold'}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                            <span className="text-muted-foreground">
                              {s.items?.length || 0} items
                            </span>
                            <div className="flex items-center gap-1.5">
                              <StatusBadge
                                status={s.payment_type === 'utang' ? 'utang' : 'completed'}
                                label={s.payment_type === 'utang' ? 'Utang' : 'Cash'}
                              />
                              <StatusBadge
                                status={s.status === 'voided' ? 'archived' : 'success'}
                                label={s.status === 'voided' ? 'Voided' : 'Completed'}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Customer Dialog */}
      <CustomerFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        customer={customer}
        onSuccess={handleRefreshAll}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customer={customer}
        onSuccess={handleRefreshAll}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Burahin ang Rekord ng Suki"
        description={`Sigurado ka bang nais mong burahin ang profile ni ${customer.name}? Hindi na ito maibabalik.`}
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
        title="Hindi Maaaring Burahin"
        description="Mayroon pang natitirang utang ang kustomer."
        className="sm:max-w-md"
      >
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">May Natitirang Utang si {customer.name}</p>
              <p className="text-xs mt-1 text-destructive/90">
                May balanse pa na <strong>₱{balance.toFixed(2)}</strong>. Kolektahin muna ang
                buong kabayaran bago tanggalin ang kanyang rekord sa tindahan.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setBlockedAlertOpen(false)}
            >
              Isara
            </Button>
            {canCollect && (
              <Button
                onClick={() => {
                  setBlockedAlertOpen(false)
                  setPaymentDialogOpen(true)
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

export default CustomerDetailPage
