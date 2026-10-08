import { Link } from 'react-router'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
  Package,
  Receipt,
  ScanBarcode,
  ShoppingCart,
  Store,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/common/StatCard'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatRelative } from '@/lib/format'

/**
 * Returns a warm time-of-day greeting in Filipino.
 */
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Magandang umaga'
  if (hour < 13) return 'Magandang tanghali'
  if (hour < 18) return 'Magandang hapon'
  return 'Magandang gabi'
}

/**
 * Cashier Dashboard view focused on the active shift, quick selling, and personal sales history.
 *
 * @param {object} props
 * @param {object} props.dashboardData - Data from useDashboard query
 * @param {object} [props.user] - Current cashier user
 * @param {object} [props.settings] - Store settings
 */
export function CashierDashboard({ dashboardData, user, settings }) {
  const { cashier_shift, running_low } = dashboardData
  const storeName = settings?.store_name || 'Tindahan ni Aling Nena'
  const userName = user?.name || 'Kahera'
  const greeting = `${getGreeting()}, ${userName}!`

  return (
    <div className="space-y-6">
      {/* 1. Header & Greeting */}
      <div className="space-y-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}
        </h1>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Store className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium text-foreground">{storeName}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>Aking Shift Ngayong Araw (My Shift Today)</span>
        </p>
      </div>

      {/* 2. My Shift Today KPIs & Large "Start Selling" Button */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Aking Benta Ngayon (My Sales)"
          value={cashier_shift?.my_sales_total ?? 0}
          format="currency"
          tone="success"
          icon={DollarSign}
          description="Kabuuang nasingil sa iyong shift"
        />
        <StatCard
          label="Mga Transaksyon Ko"
          value={cashier_shift?.my_transactions_count ?? 0}
          format="number"
          tone="default"
          icon={Receipt}
          description="Bilang ng naiprosesong resibo"
        />

        {/* Large "Start Selling" Action Card */}
        <Card className="flex flex-col justify-between border-primary/30 bg-primary/5 p-5 shadow-xs sm:col-span-2 lg:col-span-1">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-primary">
              <ScanBarcode className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wide">
                POS Terminal
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Buksan ang POS upang magsimulang mag-scan ng barcode at magbenta.
            </p>
          </div>
          <div className="pt-4">
            <Button
              asChild
              size="lg"
              className="h-12 w-full gap-2 text-base font-semibold shadow-md"
            >
              <Link to="/pos">
                <ScanBarcode className="h-5 w-5" />
                Magsimulang Magbenta (Start Selling)
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* 3. My Recent Sales & Running Low (Read-only) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My Recent Sales */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Aking mga Huling Benta (My Recent Sales)
              </CardTitle>
              <CardDescription className="text-xs">
                Mga transaksyong naitala sa iyong shift
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link to="/sales">
                Lahat
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-2.5 pt-1">
            {cashier_shift?.my_recent_sales && cashier_shift.my_recent_sales.length > 0 ? (
              cashier_shift.my_recent_sales.map((sale) => (
                <Link
                  key={sale.id}
                  to={`/sales/${sale.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-xs font-mono font-medium text-foreground">
                      {sale.sale_no}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatRelative(sale.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge type="payment" variant={sale.payment_type} />
                    <Money amount={sale.total_amount} size="sm" tone="highlight" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <ShoppingCart className="mb-1.5 h-6 w-6 opacity-40" />
                Wala ka pang naitalang benta ngayong araw. Pindutin ang "Start Selling" sa itaas!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Running Low (Read-only) */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Kulang na Paninda (Running Low)
            </CardTitle>
            <CardDescription className="text-xs">
              Mga panindang kakaunti na lamang ang natitirang stock
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 pt-1">
            {running_low && running_low.length > 0 ? (
              running_low.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-2.5"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <Badge
                    variant={item.stock_quantity <= 0 ? 'destructive' : 'outline'}
                    className="shrink-0 text-xs font-mono tabular-nums"
                  >
                    {item.stock_quantity} {item.unit || 'pcs'} natira
                  </Badge>
                </div>
              ))
            ) : (
              <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <Package className="mb-1.5 h-6 w-6 opacity-40" />
                Lahat ng paninda ay may sapat na stock.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CashierDashboard
