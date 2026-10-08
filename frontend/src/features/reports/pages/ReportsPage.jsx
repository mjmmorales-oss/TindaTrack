import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Download,
  Printer,
  Layers,
  Award,
  Wallet,
  ShoppingBag,
  CircleDollarSign,
} from 'lucide-react'
import {
  subDays,
  startOfToday,
  endOfToday,
} from 'date-fns'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { ChartCard } from '@/components/common/ChartCard'
import { StatCard } from '@/components/common/StatCard'
import { Money } from '@/components/common/Money'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  useSalesReport,
  useBestSellers,
  useCategoryBreakdown,
  useHourlyBreakdown,
} from '@/features/reports/hooks/useReports'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { exportToCsv } from '@/lib/toCsv'

export function ReportsPage() {
  useDocumentTitle('Mga Ulat at Benta (Reports)')

  // Date range default: Last 30 days
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(startOfToday(), 29),
    to: endOfToday(),
  }))
  const [granularity, setGranularity] = useState('daily')

  const queryParams = useMemo(
    () => ({
      from: dateRange?.from ? dateRange.from.toISOString() : undefined,
      to: dateRange?.to ? dateRange.to.toISOString() : undefined,
      granularity,
    }),
    [dateRange, granularity],
  )

  // Queries
  const { data: salesReportRes, isLoading: isSalesLoading } =
    useSalesReport(queryParams)
  const { data: bestSellersRes, isLoading: isBestLoading } =
    useBestSellers(queryParams)
  const { data: categoryRes, isLoading: isCatLoading } =
    useCategoryBreakdown(queryParams)
  const { data: hourlyRes, isLoading: isHourlyLoading } =
    useHourlyBreakdown(queryParams)

  const summary = salesReportRes?.data?.summary || {
    total_sales: 0,
    total_gross_profit: 0,
    profit_margin: 0,
    total_transactions: 0,
    total_cash: 0,
    total_utang: 0,
  }

  const series = salesReportRes?.data?.series || []
  const bestSellers = bestSellersRes?.data || []
  const categories = categoryRes?.data?.categories || []
  const hourlyData = hourlyRes?.data || []

  const handlePrint = () => {
    window.print()
  }

  // Export handlers
  const exportSalesCsv = () => {
    exportToCsv(
      series,
      [
        { key: 'period', label: 'Petsa / Panahon' },
        { key: 'sales', label: 'Benta (₱)' },
        { key: 'cost', label: 'Puhunan (₱)' },
        { key: 'gross_profit', label: 'Tubo (₱)' },
        { key: 'cash', label: 'Cash (₱)' },
        { key: 'utang', label: 'Utang (₱)' },
        { key: 'transactions', label: 'Transaksyon' },
      ],
      `tindatrack-sales-report-${granularity}.csv`,
    )
  }

  const exportBestSellersCsv = () => {
    exportToCsv(
      bestSellers,
      [
        { key: 'product_name', label: 'Produkto' },
        { key: 'sku', label: 'SKU' },
        { key: 'category_name', label: 'Kategorya' },
        { key: 'quantity_sold', label: 'Dami ng Benta (Qty)' },
        { key: 'revenue', label: 'Kabuuang Benta (₱)' },
        { key: 'gross_profit', label: 'Tubo (₱)' },
      ],
      'tindatrack-best-sellers.csv',
    )
  }

  const exportCategoryCsv = () => {
    exportToCsv(
      categories,
      [
        { key: 'category_name', label: 'Kategorya' },
        { key: 'items_sold', label: 'Bilang ng Benta (Items)' },
        { key: 'revenue', label: 'Kabuuang Benta (₱)' },
        { key: 'percentage', label: 'Porsyento (%)' },
      ],
      'tindatrack-category-breakdown.csv',
    )
  }

  const exportHourlyCsv = () => {
    exportToCsv(
      hourlyData,
      [
        { key: 'label', label: 'Oras' },
        { key: 'sales', label: 'Benta (₱)' },
        { key: 'transactions', label: 'Bilang ng Transaksyon' },
      ],
      'tindatrack-busiest-hours.csv',
    )
  }

  const renderExportMenu = (onCsv) => (
    <div className="flex items-center gap-1 print:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onCsv}>
            <Download className="mr-2 h-3.5 w-3.5" />
            I-download (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="mr-2 h-3.5 w-3.5" />
            I-print (Print)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <PageContainer>
      <PageHeader
        title="Mga Ulat at Pagsusuri (Reports)"
        description="Pagsusuri sa benta, tubo, pinakamabiling paninda, at paggalaw ng salapi"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 h-9 print:hidden"
          >
            <Printer className="h-4 w-4" />
            I-print ang Ulat (Print)
          </Button>
        }
      />

      {/* Filter Toolbar: DateRangePicker + Granularity Radio/ToggleGroup */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4 print:hidden">
        <div className="w-full sm:w-auto">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => range && setDateRange(range)}
            placeholder="Pumili ng saklaw ng petsa"
            className="w-full sm:w-[280px] h-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-muted-foreground font-medium shrink-0">
            Pagsasama:
          </span>
          <ToggleGroup
            type="single"
            value={granularity}
            onValueChange={(val) => val && setGranularity(val)}
            className="w-full sm:w-auto justify-stretch border border-border rounded-lg p-0.5 bg-muted/40"
          >
            <ToggleGroupItem
              value="daily"
              className="flex-1 sm:flex-none text-xs h-8 px-3"
            >
              Arawan (Daily)
            </ToggleGroupItem>
            <ToggleGroupItem
              value="weekly"
              className="flex-1 sm:flex-none text-xs h-8 px-3"
            >
              Lingguhan (Weekly)
            </ToggleGroupItem>
            <ToggleGroupItem
              value="monthly"
              className="flex-1 sm:flex-none text-xs h-8 px-3"
            >
              Buwanan (Monthly)
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* KPI Overview Row: Reconciles directly with /sales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="Kabuuang Benta"
          value={summary.total_sales}
          format="currency"
          tone="default"
          loading={isSalesLoading}
          description="Lahat ng nakumpletong benta"
        />

        <StatCard
          icon={TrendingUp}
          label="Tinatayang Tubo (Profit)"
          value={summary.total_gross_profit}
          format="currency"
          tone="success"
          loading={isSalesLoading}
          description={`Margin: ${summary.profit_margin}%`}
        />

        <StatCard
          icon={ShoppingBag}
          label="Bilang ng Benta"
          value={summary.total_transactions}
          format="number"
          tone="default"
          loading={isSalesLoading}
          description="Kabuuang transaksyon sa POS"
        />

        <StatCard
          icon={Wallet}
          label="Pautang (Utang Benta)"
          value={summary.total_utang}
          format="currency"
          tone="utang"
          loading={isSalesLoading}
          description={`Cash: ₱${Math.round(summary.total_cash)}`}
        />
      </div>

      {/* 2-Column Grid of ChartCards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 1: Sales Over Time */}
        <ChartCard
          title="Benta sa Paglipas ng Panahon (Sales Over Time)"
          description="Halaga ng benta bawat araw o linggo"
          actions={renderExportMenu(exportSalesCsv)}
          loading={isSalesLoading}
          empty={series.length === 0}
        >
          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₱${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-popover-foreground">{d.period}</p>
                          <p className="text-primary font-bold">
                            Benta: ₱{Number(d.sales).toFixed(2)}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {d.transactions} transaksyon
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* CHART 2: Gross Profit Estimate */}
        <ChartCard
          title="Tinatayang Tubo (Gross Profit: Benta − Puhunan)"
          description="Paghahambing ng kabuuang benta at netong tubo"
          actions={renderExportMenu(exportSalesCsv)}
          loading={isSalesLoading}
          empty={series.length === 0}
        >
          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₱${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-popover-foreground">{d.period}</p>
                          <p className="text-primary font-medium">Benta: ₱{Number(d.sales).toFixed(2)}</p>
                          <p className="text-success font-bold">Tubo: ₱{Number(d.gross_profit).toFixed(2)}</p>
                          <p className="text-muted-foreground text-[11px]">Puhunan: ₱{Number(d.cost).toFixed(2)}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                />
                <Bar dataKey="cost" name="Puhunan" fill="var(--muted-foreground)" opacity={0.4} radius={[4, 4, 0, 0]} />
                <Bar dataKey="gross_profit" name="Tubo (Profit)" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* CHART 3: Cash vs Utang Trend */}
        <ChartCard
          title="Paraan ng Bayad: Salapi vs Utang (Cash vs Utang)"
          description="Dami ng cash inflows kumpara sa pautang sa suki"
          actions={renderExportMenu(exportSalesCsv)}
          loading={isSalesLoading}
          empty={series.length === 0}
        >
          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₱${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-popover-foreground">{d.period}</p>
                          <p className="text-primary font-semibold">Cash: ₱{Number(d.cash).toFixed(2)}</p>
                          <p className="text-utang font-semibold">Utang: ₱{Number(d.utang).toFixed(2)}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                />
                <Bar dataKey="cash" name="Cash" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="utang" name="Utang" stackId="a" fill="var(--utang)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* CHART 4: Busiest Hours */}
        <ChartCard
          title="Mga Pinakaabalang Oras (Busiest Hours)"
          description="Bilang ng transaksyon ayon sa oras ng araw (Peak hours)"
          actions={renderExportMenu(exportHourlyCsv)}
          loading={isHourlyLoading}
          empty={hourlyData.length === 0}
        >
          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyData.filter((h) => h.hour >= 5 && h.hour <= 22)}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-popover-foreground">{d.label}</p>
                          <p className="text-primary font-bold">
                            {d.transactions} transaksyon
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            Benta: ₱{Number(d.sales).toFixed(2)}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="transactions" name="Transaksyon" fill="var(--highlight)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* SECTION 5: Best Sellers (Top 10 Table + Bar) */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-highlight" />
                Nangungunang Paninda (Top 10 Best Sellers)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pinakamaraming naibentang piraso sa napiling saklaw ng petsa
              </p>
            </div>
            {renderExportMenu(exportBestSellersCsv)}
          </CardHeader>
          <CardContent>
            {isBestLoading ? (
              <div className="space-y-2 py-4">
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
              </div>
            ) : bestSellers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Walang naitalang benta sa panahong ito.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 text-muted-foreground font-medium">
                    <tr>
                      <th className="py-2.5 pl-2">#</th>
                      <th className="py-2.5">Produkto</th>
                      <th className="py-2.5">Kategorya</th>
                      <th className="py-2.5 text-center">Naibenta (Qty)</th>
                      <th className="py-2.5 text-right">Kabuuang Benta</th>
                      <th className="py-2.5 text-right pr-2">Tubo (Gross Profit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {bestSellers.map((item, idx) => (
                      <tr key={item.product_id} className="hover:bg-muted/30">
                        <td className="py-2.5 pl-2 font-mono text-muted-foreground font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 font-medium text-foreground">
                          {item.product_name}
                          {item.sku && (
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              {item.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {item.category_name}
                        </td>
                        <td className="py-2.5 text-center font-bold font-mono">
                          {item.quantity_sold} pcs
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          <Money amount={item.revenue} size="xs" />
                        </td>
                        <td className="py-2.5 text-right pr-2 font-semibold text-success">
                          <Money amount={item.gross_profit} size="xs" tone="success" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 6: Category Breakdown */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Hati ng Benta Ayon sa Kategorya (Category Breakdown)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bahagi ng bawat kategorya sa kabuuang benta ng tindahan
              </p>
            </div>
            {renderExportMenu(exportCategoryCsv)}
          </CardHeader>
          <CardContent>
            {isCatLoading ? (
              <div className="space-y-3 py-4">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Walang naitalang datos para sa mga kategorya.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.category_id}
                    className="rounded-lg border border-border/70 p-3 space-y-2 bg-card"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {cat.category_name}
                      </span>
                      <div className="text-right">
                        <Money amount={cat.revenue} size="xs" className="font-bold" />
                        <span className="text-[11px] text-muted-foreground ml-1.5 font-mono">
                          ({cat.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                        className="h-full rounded-full bg-primary transition-all duration-300"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{cat.items_sold} piraso naibenta</span>
                      <span>{cat.percentage}% ng kabuuan</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

export default ReportsPage
