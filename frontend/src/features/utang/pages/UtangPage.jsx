import { useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  HandCoins,
  Users,
  PiggyBank,
  AlertTriangle,
  Copy,
  Check,
  MoreVertical,
  ArrowRight,
} from 'lucide-react'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { DataTable } from '@/components/data-table/DataTable'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Money } from '@/components/common/Money'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUtangSummary, useDebtors } from '@/features/utang/hooks/useUtang'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { RecordPaymentDialog } from '@/features/utang/components/RecordPaymentDialog'
import { useTableParams } from '@/components/data-table/useTableParams'
import { usePermissions } from '@/hooks/usePermissions'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { notify } from '@/lib/notify'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function UtangPage() {
  const { t } = useTranslation(['utang', 'common'])
  useDocumentTitle(t('utang:title'))
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canCollect = can('utang.record_payment')

  // Queries
  const {
    data: summaryRes,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useUtangSummary()
  const summary = summaryRes?.data

  const { data: settingsRes } = useSettings()
  const storeName = settingsRes?.data?.store_name || 'Tindahan ni Aling Nena'

  // Table params synced with URL
  const { params, setParams } = useTableParams({
    q: '',
    sort: '-credit_balance',
    page: 1,
    per_page: 15,
  })

  const {
    data: debtorsRes,
    isLoading: isDebtorsLoading,
    isError: isDebtorsError,
    refetch: refetchDebtors,
  } = useDebtors(params)

  // Payment modal state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [payingCustomer, setPayingCustomer] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const handleOpenPayment = (customer) => {
    setPayingCustomer(customer)
    setPaymentDialogOpen(true)
  }

  const handleRefreshAll = () => {
    refetchSummary()
    refetchDebtors()
  }

  // Copy polite reminder
  const handleCopyReminder = useCallback((customer) => {
    const amount = Number(customer.credit_balance || 0).toFixed(2)
    const displayName = customer.nickname || customer.name
    const message = t('utang:smsReminderTemplate', {
      name: displayName,
      amount,
      store: storeName,
    })

    navigator.clipboard.writeText(message)
    setCopiedId(customer.id)
    notify.success(
      t('utang:reminderSuccessTitle'),
      t('utang:reminderSuccessDesc', { name: displayName }),
    )
    setTimeout(() => setCopiedId(null), 2500)
  }, [storeName, t])

  // Aging buckets calculations
  const aging = summary?.aging_buckets || {
    '0_7': 0,
    '8_30': 0,
    '31_60': 0,
    '60_plus': 0,
  }

  const totalAgingDebt = Math.max(
    1,
    (Number(aging['0_7']) || 0) +
      (Number(aging['8_30']) || 0) +
      (Number(aging['31_60']) || 0) +
      (Number(aging['60_plus']) || 0),
  )

  const agingItems = [
    {
      key: '0_7',
      label: t('utang:aging07Days'),
      sublabel: t('utang:aging07DaysSub'),
      amount: Number(aging['0_7'] || 0),
      pct: Math.round(((Number(aging['0_7']) || 0) / totalAgingDebt) * 100),
      colorClass: 'bg-success',
      textClass: 'text-success',
    },
    {
      key: '8_30',
      label: t('utang:aging830Days'),
      sublabel: t('utang:aging830DaysSub'),
      amount: Number(aging['8_30'] || 0),
      pct: Math.round(((Number(aging['8_30']) || 0) / totalAgingDebt) * 100),
      colorClass: 'bg-highlight',
      textClass: 'text-highlight-foreground',
    },
    {
      key: '31_60',
      label: t('utang:aging3160Days'),
      sublabel: t('utang:aging3160DaysSub'),
      amount: Number(aging['31_60'] || 0),
      pct: Math.round(((Number(aging['31_60']) || 0) / totalAgingDebt) * 100),
      colorClass: 'bg-utang',
      textClass: 'text-utang',
    },
    {
      key: '60_plus',
      label: t('utang:aging60PlusDays'),
      sublabel: t('utang:aging60PlusDaysSub'),
      amount: Number(aging['60_plus'] || 0),
      pct: Math.round(((Number(aging['60_plus']) || 0) / totalAgingDebt) * 100),
      colorClass: 'bg-destructive',
      textClass: 'text-destructive',
    },
  ]

  // Columns definition for debtors table
  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('utang:debtorCol')} />
        ),
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex items-center gap-3">
              <UserAvatar name={c.name} style="notionists" size="sm" />
              <div className="min-w-0">
                <Link
                  to={`/customers/${c.id}`}
                  className="font-semibold text-xs text-foreground hover:text-primary hover:underline truncate block"
                >
                  {c.name}
                </Link>
                {c.nickname && (
                  <span className="text-[11px] text-muted-foreground block truncate">
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
        header: t('utang:phoneCol'),
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {row.original.contact_number || '—'}
          </span>
        ),
      },
      {
        id: 'credit_balance',
        accessorKey: 'credit_balance',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('utang:balanceCol')} />
        ),
        cell: ({ row }) => (
          <div className="font-semibold">
            <Money amount={row.original.credit_balance} size="sm" tone="utang" />
          </div>
        ),
      },
      {
        id: 'utilization_rate',
        header: t('utang:limitUtilizationCol'),
        cell: ({ row }) => {
          const c = row.original
          const limit = Number(c.credit_limit || 0)
          const bal = Number(c.credit_balance || 0)
          const rate = limit > 0 ? Math.min(100, Math.round((bal / limit) * 100)) : 100
          const isOver = bal > limit

          return (
            <div className="space-y-1 w-28">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{rate}%</span>
                <span>{t('utang:limitRateLabel', { amount: Math.round(limit) })}</span>
              </div>
              <Progress
                value={rate}
                className={`h-1.5 ${isOver ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`}
              />
            </div>
          )
        },
      },
      {
        id: 'oldest_debt_date',
        accessorKey: 'oldest_debt_date',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('utang:oldestDebtCol')} />
        ),
        cell: ({ row }) => {
          const days = row.original.days_overdue || 0
          const isOverdue = days > 30

          return (
            <div className="space-y-0.5">
              <span
                className={cn(
                  'text-xs font-medium',
                  isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground',
                )}
              >
                {t('utang:daysAgo', { days })}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {t('utang:sinceDate', { date: formatDate(row.original.oldest_debt_date) })}
              </span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex items-center justify-end gap-1.5">
              {canCollect && (
                <Button
                  size="sm"
                  onClick={() => handleOpenPayment(c)}
                  className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground"
                >
                  <HandCoins className="h-3.5 w-3.5" />
                  {t('utang:collectButton')}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyReminder(c)}
                className="h-8 gap-1.5 text-xs"
                title={t('utang:reminderTitle')}
              >
                {copiedId === c.id ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {t('utang:reminderButton')}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={t('utang:actionForDebtor', { name: c.name })}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}`)}>
                    {t('utang:viewProfile')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [navigate, canCollect, copiedId, handleCopyReminder, t],
  )

  // Mobile card renderer below md
  const renderMobileCard = (debtor) => {
    const d = debtor?.original || debtor || {}
    const days = d.days_overdue || 0
    const isOverdue = days > 30

    return (
      <Card
        key={d.id}
        className="p-3.5 space-y-3 border-border shadow-xs hover:border-primary/40 transition-colors"
      >
        {/* Top: Avatar, name, balance */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar name={d.name} style="notionists" size="md" />
            <div className="min-w-0">
              <Link
                to={`/customers/${d.id}`}
                className="font-bold text-sm text-foreground hover:text-primary hover:underline truncate block"
              >
                {d.name}
              </Link>
              {d.nickname && (
                <span className="text-xs text-muted-foreground block truncate">
                  "{d.nickname}"
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <Money amount={d.credit_balance} size="base" tone="utang" className="font-bold" />
            <span
              className={cn(
                'text-[11px] block font-medium',
                isOverdue ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {t('utang:daysOverdueBadge', { days })}
            </span>
          </div>
        </div>

        {/* Contact and limit line */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
          <span className="font-mono">{d.contact_number || t('utang:noPhone')}</span>
          <span>{t('utang:limitRateLabel', { amount: Math.round(d.credit_limit || 0) })}</span>
        </div>

        {/* Actions row: Collect is a visible button, Copy reminder lives in actions menu */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          {canCollect ? (
            <Button
              size="sm"
              onClick={() => handleOpenPayment(d)}
              className="h-11 flex-1 gap-1.5 text-xs font-semibold"
            >
              <HandCoins className="h-4 w-4" />
              {t('utang:collectLongButton')}
            </Button>
          ) : (
            <div />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground touch-manipulation shrink-0"
                aria-label={t('utang:actionForDebtor', { name: d.name })}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => handleCopyReminder(d)}>
                <Copy className="mr-2 h-4 w-4" />
                {t('utang:reminderButton')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/customers/${d.id}`)}>
                <ArrowRight className="mr-2 h-4 w-4" />
                {t('utang:viewProfile')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('utang:pageTitle')}
        description={t('utang:pageSubtitle')}
      />

      {/* 4 StatCards (grid-cols-2 lg:grid-cols-4 on phones/desktops) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={HandCoins}
          label={t('utang:statTotalUtang')}
          value={summary?.total_outstanding || 0}
          format="currency"
          tone="utang"
          loading={isSummaryLoading}
          description={t('utang:statTotalUtangDesc')}
        />

        <StatCard
          icon={Users}
          label={t('utang:statDebtorsCount')}
          value={summary?.debtors_count || 0}
          format="number"
          tone="default"
          loading={isSummaryLoading}
          description={t('utang:statDebtorsCountDesc')}
        />

        <StatCard
          icon={PiggyBank}
          label={t('utang:statCollectedWeek')}
          value={summary?.collected_this_week || 0}
          format="currency"
          tone="success"
          loading={isSummaryLoading}
          description={t('utang:statCollectedWeekDesc')}
        />

        <StatCard
          icon={AlertTriangle}
          label={t('utang:statOverdueCount')}
          value={summary?.overdue_count || 0}
          format="number"
          tone="destructive"
          loading={isSummaryLoading}
          description={t('utang:statOverdueCountDesc')}
        />
      </div>

      {/* Aging Buckets Card: Stacked bar on md+, 4 labeled rows with bars on phones */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>{t('utang:agingCardTitle')}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {t('utang:agingCardSubtitle')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop/Tablet: Horizontal Stacked Bar */}
          <div className="hidden md:block space-y-4">
            <div className="h-6 w-full rounded-md overflow-hidden flex bg-muted/60 p-0.5 gap-0.5">
              {agingItems.map((bucket) => {
                if (bucket.pct === 0) return null
                return (
                  <div
                    key={bucket.key}
                    style={{ width: `${Math.max(4, bucket.pct)}%` }}
                    className={cn(
                      'h-full rounded-xs transition-all duration-300 relative group',
                      bucket.colorClass,
                    )}
                    title={`${bucket.label}: ₱${bucket.amount.toFixed(2)} (${bucket.pct}%)`}
                  />
                )
              })}
            </div>

            {/* Desktop Legend & Details */}
            <div className="grid grid-cols-4 gap-4 pt-1">
              {agingItems.map((bucket) => (
                <div key={bucket.key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', bucket.colorClass)} />
                    <span className="text-xs font-semibold text-foreground">
                      {bucket.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      {bucket.pct}%
                    </span>
                  </div>
                  <Money
                    amount={bucket.amount}
                    size="sm"
                    className="font-bold text-foreground block pl-4.5"
                  />
                  <span className="text-[10px] text-muted-foreground block pl-4.5">
                    {bucket.sublabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile (< md): 4 Labeled Rows with individual progress bars */}
          <div className="md:hidden space-y-3.5">
            {agingItems.map((bucket) => (
              <div key={bucket.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 rounded-full', bucket.colorClass)} />
                    <span className="font-semibold text-foreground">{bucket.label}</span>
                    <span className="text-[10px] text-muted-foreground">({bucket.sublabel})</span>
                  </div>
                  <div className="text-right">
                    <Money amount={bucket.amount} size="xs" className="font-bold text-foreground" />
                    <span className="text-[10px] text-muted-foreground ml-1">({bucket.pct}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, bucket.pct)}%` }}
                    className={cn('h-full rounded-full transition-all', bucket.colorClass)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Debtors List & Table */}
      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={debtorsRes?.data || []}
          total={debtorsRes?.meta?.total || 0}
          page={params.page}
          perPage={params.per_page}
          onPageChange={(page) => setParams({ page })}
          onPerPageChange={(per_page) => setParams({ per_page, page: 1 })}
          sort={params.sort}
          onSortChange={(sort) => setParams({ sort, page: 1 })}
          search={params.q}
          onSearchChange={(q) => setParams({ q, page: 1 })}
          searchPlaceholder={t('utang:searchPlaceholder')}
          renderMobileCard={renderMobileCard}
          isLoading={isDebtorsLoading}
          isError={isDebtorsError}
          onRetry={refetchDebtors}
          emptyIcon={HandCoins}
          emptyTitle={t('utang:emptyDebtorsTitle')}
          emptyDescription={t('utang:emptyDebtorsDesc')}
        />
      </div>

      {/* Shared Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customer={payingCustomer}
        onSuccess={handleRefreshAll}
      />
    </PageContainer>
  )
}

export default UtangPage
