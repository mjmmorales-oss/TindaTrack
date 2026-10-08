import { Link } from 'react-router'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  DollarSign,
  Package,
  PackagePlus,
  Plus,
  Receipt,
  ScanBarcode,
  ShoppingCart,
  Store,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/common/StatCard'
import { ChartCard } from '@/components/common/ChartCard'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency, formatRelative } from '@/lib/format'

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
 * Owner Dashboard view with metrics, charts, lists, and quick actions.
 *
 * @param {object} props
 * @param {object} props.dashboardData - Data from useDashboard query
 * @param {string} props.range - Selected date range ('today' | '7d' | '30d')
 * @param {(range: string) => void} props.onRangeChange - Range change handler
 * @param {object} [props.user] - Current authenticated user
 * @param {object} [props.settings] - Store settings
 */
export function OwnerDashboard({
  dashboardData,
  range,
  onRangeChange,
  user,
  settings,
}) {
  const { kpis, sales_trend, payment_mix, top_sellers, running_low, recent_sales } =
    dashboardData

  const storeName = settings?.store_name || 'Tindahan ni Aling Nena'
  const userName = user?.name || 'Aling Nena'
  const greeting = `${getGreeting()}, ${userName}!`

  const paymentDonutData = [
    { name: 'Cash', value: payment_mix?.cash || 0, color: 'var(--primary)' },
    { name: 'Utang', value: payment_mix?.utang || 0, color: 'var(--utang)' },
  ]

  const hasDonutData = (payment_mix?.cash || 0) > 0 || (payment_mix?.utang || 0) > 0

  return (
    <div className="space-y-6">
      {/* 1. Header & Range Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting}
          </h1>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Store className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium text-foreground">{storeName}</span>
            <span className="text-muted-foreground/60">·</span>
            <span>Pangkalahatang Tanaw (Store Overview)</span>
          </p>
        </div>

        {/* Range ToggleGroup (Full-width on phone, flex on desktop) */}
        <div className="w-full sm:w-auto">
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(val) => {
              if (val) onRangeChange(val)
            }}
            variant="outline"
            size="sm"
            className="w-full grid grid-cols-3 sm:w-auto sm:flex"
            aria-label="Pumili ng panahong ulat"
          >
            <ToggleGroupItem value="today" className="text-xs font-medium">
              Today
            </ToggleGroupItem>
            <ToggleGroupItem value="7d" className="text-xs font-medium">
              7 Days
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="text-xs font-medium">
              30 Days
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* 2. 4 StatCards (2x2 on phones, 4 cols on lg+) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Kabuuang Benta (Sales)"
          value={kpis?.sales ?? 0}
          format="currency"
          delta={kpis?.sales_delta}
          deltaLabel="vs. nakaraang panahon"
          tone="success"
          icon={DollarSign}
        />
        <StatCard
          label="Transaksyon"
          value={kpis?.transactions ?? 0}
          format="number"
          delta={kpis?.transactions_delta}
          deltaLabel="vs. nakaraang panahon"
          tone="default"
          icon={Receipt}
        />
        <StatCard
          label="May Utang (Outstanding)"
          value={kpis?.outstanding_utang ?? 0}
          format="currency"
          description={
            kpis?.debtors_count > 0
              ? `${kpis.debtors_count} suki na may listahan`
              : 'Walang balanseng utang'
          }
          tone="utang"
          icon={CreditCard}
        />
        <StatCard
          label="Kulang na Stock (Alerts)"
          value={kpis?.low_stock_count ?? 0}
          format="number"
          description={
            kpis?.out_of_stock_count > 0
              ? `${kpis.out_of_stock_count} ubos na sa tindahan`
              : 'May sapat na paninda'
          }
          tone={kpis?.out_of_stock_count > 0 ? 'destructive' : 'warning'}
          icon={AlertTriangle}
        />
      </div>

      {/* 3. Mobile "Start Selling" Button (Visible prominently on phones) */}
      <div className="block lg:hidden">
        <Button
          asChild
          size="lg"
          className="h-12 w-full gap-2 text-base font-semibold shadow-md"
        >
          <Link to="/pos">
            <ScanBarcode className="h-5 w-5" />
            Magbenta sa POS (Start Selling)
          </Link>
        </Button>
      </div>

      {/* 4. Desktop Quick Actions Bar (lg+) */}
      <div className="hidden lg:flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2 pl-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Mabilisang Aksyon (Quick Actions):
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="gap-1.5 shadow-xs">
            <Link to="/pos">
              <ScanBarcode className="h-4 w-4" />
              Bagong Benta (POS)
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/products">
              <PackagePlus className="h-4 w-4" />
              Magdagdag ng Produkto
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/utang">
              <CreditCard className="h-4 w-4" />
              Magtala ng Bayad sa Utang
            </Link>
          </Button>
        </div>
      </div>

      {/* 5. Charts Row: Sales Trend Area Chart & Payment Mix Donut */}
      {/* Phone order: Trend chart comes first */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sales Trend (8 cols on lg) */}
        <ChartCard
          title="Daloy ng Benta (Sales Trend)"
          description={`Kabuuang benta sa nakalipas na ${range === 'today' ? 'oras ngayong araw' : range === '7d' ? '7 araw' : '30 araw'}`}
          className="lg:col-span-8"
        >
          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sales_trend || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₱${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-popover-foreground">{item.date}</p>
                          <p className="text-primary font-mono font-medium">
                            Benta: {formatCurrency(item.sales)}
                          </p>
                          <p className="text-muted-foreground">
                            {item.transactions} transaksyon
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Payment Mix Donut (4 cols on lg, stacks on mobile below trends) */}
        <ChartCard
          title="Paraan ng Bayad (Payment Mix)"
          description="Paghahambing ng Cash laban sa Utang"
          className="lg:col-span-4"
        >
          <div className="flex flex-col items-center justify-center h-[260px]">
            {hasDonutData ? (
              <>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {paymentDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [formatCurrency(val), 'Halaga']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 text-xs font-medium pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-primary" />
                    <span>Cash: {payment_mix?.cash_percent || 0}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-utang" />
                    <span>Utang: {payment_mix?.utang_percent || 0}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground text-xs py-8">
                Walang naitalang benta sa panahong ito.
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* 6. Running Low & Recent Sales & Top Sellers */}
      {/* On mobile: Running low -> Recent sales -> Top sellers -> Quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Running Low (5 rows + Restock CTA) */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Kulang na Paninda (Running Low)
              </CardTitle>
              <CardDescription className="text-xs">
                Mga produktong kailangan nang i-restock
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link to="/inventory">
                Lahat
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 pt-1">
            {running_low && running_low.length > 0 ? (
              running_low.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={item.stock_quantity <= 0 ? 'destructive' : 'outline'}
                      className="text-xs font-mono tabular-nums"
                    >
                      {item.stock_quantity} / {item.reorder_level} {item.unit || 'pcs'}
                    </Badge>
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2">
                      <Link to="/inventory">
                        Restock
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <Package className="mb-1.5 h-6 w-6 opacity-40" />
                Lahat ng paninda ay may sapat pang stock.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales (5 rows linking to /sales/:id) */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Mga Huling Benta (Recent Sales)
              </CardTitle>
              <CardDescription className="text-xs">
                Pinakahuling transaksyon sa tindahan
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
            {recent_sales && recent_sales.length > 0 ? (
              recent_sales.slice(0, 5).map((sale) => (
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
              <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <ShoppingCart className="mb-1.5 h-6 w-6 opacity-40" />
                Walang naitalang benta kani-kanina.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Sellers (Rank + Progress Bar) */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Nangungunang Produkto (Top Sellers)
              </CardTitle>
              <CardDescription className="text-xs">
                Pinakamabentang mga paninda
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link to="/reports">
                Ulat
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 space-y-3.5 pt-1">
            {top_sellers && top_sellers.length > 0 ? (
              top_sellers.slice(0, 5).map((item) => (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                        #{item.rank}
                      </span>
                      <span className="truncate font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="text-muted-foreground">{item.quantity} pcs</span>
                      <Money amount={item.revenue} size="xs" />
                    </div>
                  </div>
                  <Progress value={item.progress} className="h-1.5" />
                </div>
              ))
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <Store className="mb-1.5 h-6 w-6 opacity-40" />
                Walang datos ng benta para sa mga produkto.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. Mobile Bottom Quick Actions (Sticky or Footer on phones) */}
      <div className="grid grid-cols-2 gap-3 pt-2 lg:hidden">
        <Button asChild variant="outline" size="sm" className="h-11 gap-1.5 text-xs">
          <Link to="/products">
            <PackagePlus className="h-4 w-4" />
            Magdagdag Produkto
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-11 gap-1.5 text-xs">
          <Link to="/utang">
            <CreditCard className="h-4 w-4" />
            Talaan ng Utang
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default OwnerDashboard
