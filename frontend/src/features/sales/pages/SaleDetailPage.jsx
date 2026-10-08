import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import {
  ArrowLeft,
  Printer,
  Ban,
  ReceiptText,
  User,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CreditCard,
  Building,
} from 'lucide-react'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { KeyValueList } from '@/components/common/KeyValueList'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useSale, useVoidSale } from '@/features/sales/hooks/useSales'
import { usePermissions } from '@/hooks/usePermissions'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime } from '@/lib/format'

export function SaleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canVoid = can('sales.void')

  const { data: saleRes, isLoading, isError, refetch } = useSale(id)
  const sale = saleRes?.data
  const voidMutation = useVoidSale()

  const [voidDialogOpen, setVoidDialogOpen] = useState(false)

  useDocumentTitle(sale ? `Resibo ${sale.sale_no}` : 'Detalye ng Benta')

  const handlePrint = () => {
    window.print()
  }

  const handleConfirmVoid = async (reason) => {
    if (!sale?.id) return
    await voidMutation.mutateAsync({ id: sale.id, reason })
    setVoidDialogOpen(false)
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div className="lg:col-span-7 space-y-6">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (isError || !sale) {
    return (
      <PageContainer>
        <ErrorState
          title="Hindi mahanap ang resibo"
          message="Maaaring nabura o maling ID ang inilagay para sa transaksyon na ito."
          onRetry={refetch}
        />
      </PageContainer>
    )
  }

  const isVoided = sale.status === 'voided'
  const isUtang = sale.payment_type === 'utang'
  const canVoidThis = canVoid && !isVoided

  const paymentItems = [
    {
      label: 'Paraan ng Pagbabayad',
      value: (
        <StatusBadge
          status={isUtang ? 'utang' : 'completed'}
          label={isUtang ? 'Utang / Lista' : 'Cash (Salapi)'}
        />
      ),
    },
    {
      label: 'Kabuuang Halaga (Total)',
      value: (
        <Money
          amount={sale.total_amount ?? sale.total}
          size="sm"
          className={isVoided ? 'line-through text-muted-foreground' : 'text-foreground font-bold'}
        />
      ),
    },
    {
      label: 'Ibinayad (Paid)',
      value: <Money amount={sale.amount_paid} size="sm" />,
    },
    isUtang
      ? {
          label: 'Nadagdag sa Utang (Balance Added)',
          value: (
            <Money
              amount={Math.max(0, (sale.total_amount ?? sale.total) - sale.amount_paid)}
              size="sm"
              tone="utang"
              className="font-bold"
            />
          ),
        }
      : {
          label: 'Sukli (Change)',
          value: <Money amount={sale.change_amount || 0} size="sm" tone="success" />,
        },
  ]

  const auditItems = [
    {
      label: 'Kahera (Punch by)',
      value: (
        <div className="flex items-center gap-2">
          <UserAvatar name={sale.cashier?.name || 'Juan'} size="xs" />
          <span>{sale.cashier?.name || 'Kahera'}</span>
        </div>
      ),
    },
    {
      label: 'Petsa at Oras ng Benta',
      value: formatDateTime(sale.created_at),
    },
    {
      label: 'Kustomer',
      value: sale.customer ? (
        <Link
          to={`/customers/${sale.customer.id}`}
          className="text-primary hover:underline font-semibold"
        >
          {sale.customer.nickname ? `${sale.customer.name} (${sale.customer.nickname})` : sale.customer.name}
        </Link>
      ) : (
        <span className="text-muted-foreground italic">Walk-in</span>
      ),
    },
  ]

  if (isVoided) {
    auditItems.push(
      {
        label: 'Katayuan (Status)',
        value: <StatusBadge status="archived" label="Voided" />,
      },
      {
        label: 'Dahilan ng Pag-void',
        value: (
          <span className="text-destructive font-semibold">
            {sale.void_reason || 'Kanseladong transaksyon'}
          </span>
        ),
      },
      {
        label: 'Oras ng Pag-void',
        value: sale.voided_at ? formatDateTime(sale.voided_at) : '—',
      },
    )
  }

  return (
    <PageContainer>
      {/* Header with actions (Print & Void) */}
      <div className="print:hidden">
        <PageHeader
          title={`Resibo ${sale.sale_no}`}
          description={`Nai-record noong ${formatDateTime(sale.created_at)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/sales')}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Bumalik sa Benta
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                I-print (Print)
              </Button>
              {canVoidThis && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setVoidDialogOpen(true)}
                  className="gap-1.5"
                >
                  <Ban className="h-4 w-4" />
                  I-void ang Benta
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Main Detail Grid: Thermal Receipt Card on left/center, Details on right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Receipt View Card (Full width on phones, max-w-md centered on md+) */}
        <div className="lg:col-span-5 flex justify-center">
          <div
            id="sale-thermal-receipt"
            className="w-full max-w-md rounded-xl border border-dashed border-border bg-card p-5 font-mono text-xs shadow-xs print:m-0 print:max-w-none print:border-none print:p-0 print:shadow-none"
          >
            {/* Void Banner if voided */}
            {isVoided && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-center text-destructive">
                <p className="text-sm font-bold tracking-widest uppercase">*** VOIDED SALE ***</p>
                <p className="text-[11px] font-sans mt-0.5">{sale.void_reason}</p>
              </div>
            )}

            {/* Store Header */}
            <div className="text-center space-y-0.5 border-b border-dashed border-border/80 pb-3">
              <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
                Tindahan ni Aling Nena
              </h2>
              <p className="text-[11px] text-muted-foreground">Purok 3, Brgy. San Isidro</p>
              <p className="text-[11px] text-muted-foreground">0917-123-4567</p>
            </div>

            {/* Receipt Metadata */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-border/80">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resibo #:</span>
                <span className="font-bold text-foreground">{sale.sale_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Petsa:</span>
                <span>{formatDateTime(sale.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kahera:</span>
                <span>{sale.cashier?.name || 'Juan'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kustomer:</span>
                <span className="font-medium">
                  {sale.customer ? (sale.customer.nickname || sale.customer.name) : 'Walk-in'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paraan:</span>
                <span className="uppercase font-semibold text-foreground">
                  {isUtang ? 'LISTA / UTANG' : 'CASH'}
                </span>
              </div>
            </div>

            {/* Line Items List */}
            <div className="py-2.5 space-y-2 border-b border-dashed border-border/80">
              {sale.items &&
                sale.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-foreground font-medium">
                      <span className="truncate pr-2">{item.product_name}</span>
                      <Money amount={item.subtotal} size="xs" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>
                        {item.quantity} × ₱{Number(item.unit_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Totals & Payments */}
            <div className="py-2.5 space-y-1.5 border-b border-dashed border-border/80">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>KABUUANG HALAGA:</span>
                <Money
                  amount={sale.total_amount ?? sale.total}
                  size="sm"
                  tone={isVoided ? 'muted' : 'highlight'}
                  className={isVoided ? 'line-through' : ''}
                />
              </div>

              {isUtang ? (
                <>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Ibinayad Ngayon:</span>
                    <Money amount={sale.amount_paid} size="xs" />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-utang">
                    <span>Nadagdag sa Utang:</span>
                    <Money
                      amount={Math.max(0, (sale.total_amount ?? sale.total) - sale.amount_paid)}
                      size="xs"
                      tone="utang"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Perang Ibinayad (Cash):</span>
                    <Money amount={sale.amount_paid} size="xs" />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-success">
                    <span>SUKLI (Change):</span>
                    <Money
                      amount={sale.change_amount || 0}
                      size="sm"
                      tone="success"
                      className="font-extrabold"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Receipt Footer */}
            <div className="pt-3 text-center space-y-1">
              <p className="text-[11px] font-medium text-foreground">
                Salamat po! Balik po kayo muli!
              </p>
              <p className="text-[9px] text-muted-foreground">
                POS Powered by TindaTrack · Libre at Bukas
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Audit & Items details on desktop */}
        <div className="lg:col-span-7 space-y-6 print:hidden">
          {/* Purchased Items Table Card */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Mga Biniling Paninda (Items)</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {sale.items?.length || 0} uri ng produkto
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/80 text-xs text-muted-foreground font-medium">
                    <tr>
                      <th className="py-2">Produkto</th>
                      <th className="py-2 text-center">Dami (Qty)</th>
                      <th className="py-2 text-right">Presyo</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sale.items?.map((item) => (
                      <tr key={item.id} className="text-xs">
                        <td className="py-2.5 font-medium text-foreground">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 text-center text-muted-foreground">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          ₱{Number(item.unit_price).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-medium text-foreground">
                          <Money amount={item.subtotal} size="xs" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Audit Details Cards in 2-col on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Impormasyon sa Pagbabayad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <KeyValueList items={paymentItems} />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Audit at Pagsusuri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <KeyValueList items={auditItems} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Void Dialog with required reason */}
      <ConfirmDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        title="I-void ang Resibo (Void Sale)"
        description={`Sigurado ka bang nais mong i-void ang resibo ${sale.sale_no}? Ibabalik nito ang stock sa imbentaryo at ibabawas ang utang ng kustomer.`}
        confirmText="Oo, I-void ang Benta"
        cancelText="Huwag Ituloy"
        tone="destructive"
        requireReason={true}
        minReasonLength={5}
        reasonLabel="Dahilan ng Pag-void (Required)"
        reasonPlaceholder="Hal. Maling item ang napili o ibinalik ng kustomer..."
        onConfirm={handleConfirmVoid}
        isLoading={voidMutation.isPending}
      />
    </PageContainer>
  )
}

export default SaleDetailPage
