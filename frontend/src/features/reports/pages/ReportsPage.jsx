import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['reports', 'common'])
  useDocumentTitle(t('reports:title'))

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
        { key: 'period', label: 'Period' },
        { key: 'sales', label: 'Sales (PHP)' },
        { key: 'cost', label: 'Cost (PHP)' },
        { key: 'gross_profit', label: 'Gross Profit (PHP)' },
        { key: 'cash', label: 'Cash (PHP)' },
        { key: 'utang', label: 'Utang (PHP)' },
        { key: 'transactions', label: 'Transactions' },
      ],
      `tindatrack-sales-report-${granularity}.csv`,
    )
  }

  const exportBestSellersCsv = () => {
    exportToCsv(
      bestSellers,
      [
        { key: 'product_name', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'category_name', label: 'Category' },
        { key: 'quantity_sold', label: 'Qty Sold' },
        { key: 'revenue', label: 'Revenue (PHP)' },
        { key: 'gross_profit', label: 'Gross Profit (PHP)' },
      ],
      'tindatrack-best-sellers.csv',
    )
  }

  const exportCategoryCsv = () => {
    exportToCsv(
      categories,
      [
        { key: 'category_name', label: 'Category' },
        { key: 'items_sold', label: 'Items Sold' },
        { key: 'revenue', label: 'Revenue (PHP)' },
        { key: 'percentage', label: 'Percentage (%)' },
      ],
      'tindatrack-category-breakdown.csv',
    )
  }

  const exportHourlyCsv = () => {
    exportToCsv(
      hourlyData,
      [
        { key: 'label', label: 'Hour' },
        { key: 'sales', label: 'Sales (PHP)' },
        { key: 'transactions', label: 'Transactions' },
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
            {t('reports:exportButton')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onCsv}>
            <Download className="mr-2 h-3.5 w-3.5" />
            {t('reports:downloadCsv')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="mr-2 h-3.5 w-3.5" />
            {t('reports:printMenu')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <PageContainer>
      <PageHeader
        title={t('reports:pageTitle')}
        description={t('reports:pageSubtitle')}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 h-9 print:hidden"
          >
            <Printer className="h-4 w-4" />
            {t('reports:printReport')}
          </Button>
        }
      />

      {/* Filter Toolbar: DateRangePicker + Granularity Radio/ToggleGroup */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4 print:hidden">
        <div className="w-full sm:w-auto">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => range && setDateRange(range)}
            placeholder={t('reports:dateRangePlaceholder')}
            className="w-full sm:w-[280px] h-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-muted-foreground font-medium shrink-0">
            {t('reports:granularityLabel')}
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
              {t('reports:granularityDaily')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="weekly"
              className="flex-1 sm:flex-none text-xs h-8 px-3"
            >
              {t('reports:granularityWeekly')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="monthly"
              className="flex-1 sm:flex-none text-xs h-8 px-3"
            >
              {t('reports:granularityMonthly')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* KPI Overview Row: Reconciles directly with /sales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label={t('reports:statTotalSales')}
          value={summary.total_sales}
          format="currency"
          tone="default"
          loading={isSalesLoading}
          description={t('reports:statTotalSalesDesc')}
        />

        <StatCard
          icon={TrendingUp}
          label={t('reports:statProfit')}
          value={summary.total_gross_profit}
          format="currency"
          tone="success"
          loading={isSalesLoading}
          description={t('reports:statProfitMargin', { percent: summary.profit_margin })}
        />

        <StatCard
          icon={ShoppingBag}
          label={t('reports:statTransactions')}
          value={summary.total_transactions}
          format="number"
          tone="default"
          loading={isSalesLoading}
          description={t('reports:statTransactionsDesc')}
        />

        <StatCard
          icon={Wallet}
          label={t('reports:statUtang')}
          value={summary.total_utang}
          format="currency"
          tone="utang"
          loading={isSalesLoading}
          description={t('reports:statCashDesc', { amount: `₱${Math.round(summary.total_cash)}` })}
        />
      </div>

      {/* 2-Column Grid of ChartCards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 1: Sales Over Time */}
        <ChartCard
          title={t('reports:salesOverTime')}
          description={t('reports:salesOverTimeDesc')}
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
                            {t('reports:salesAmount', { amount: Number(d.sales).toFixed(2) })}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {t('reports:transactionsCount', { count: d.transactions })}
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
          title={t('reports:grossProfit')}
          description={t('reports:grossProfitDesc')}
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
                          <p className="text-primary font-medium">
                            {t('reports:salesAmount', { amount: Number(d.sales).toFixed(2) })}
                          </p>
                          <p className="text-success font-bold">
                            {t('reports:profitAmount', { amount: Number(d.gross_profit).toFixed(2) })}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {t('reports:costAmount', { amount: Number(d.cost).toFixed(2) })}
                          </p>
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
                <Bar dataKey="cost" name={t('reports:costLabel')} fill="var(--muted-foreground)" opacity={0.4} radius={[4, 4, 0, 0]} />
                <Bar dataKey="gross_profit" name={t('reports:profitLabel')} fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* CHART 3: Cash vs Utang Trend */}
        <ChartCard
          title={t('reports:cashVsUtang')}
          description={t('reports:cashVsUtangDesc')}
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
                          <p className="text-primary font-semibold">
                            {t('reports:cashAmount', { amount: Number(d.cash).toFixed(2) })}
                          </p>
                          <p className="text-utang font-semibold">
                            {t('reports:utangAmount', { amount: Number(d.utang).toFixed(2) })}
                          </p>
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
                <Bar dataKey="cash" name={t('reports:cashLabel')} stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="utang" name={t('reports:utangLabel')} stackId="a" fill="var(--utang)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* CHART 4: Busiest Hours */}
        <ChartCard
          title={t('reports:busiestHours')}
          description={t('reports:busiestHoursDesc')}
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
                            {t('reports:transactionsCount', { count: d.transactions })}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {t('reports:salesAmount', { amount: Number(d.sales).toFixed(2) })}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="transactions" name={t('reports:transactionsLabel')} fill="var(--highlight)" radius={[4, 4, 0, 0]} />
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
                {t('reports:bestSellers')}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('reports:bestSellersDesc')}
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
                {t('reports:noDataPeriod')}
              </p>
            ) : (
              <div className="overflow-x-auto min-w-0 w-full">
                <table className="w-full min-w-max text-left text-xs">
                  <thead className="border-b border-border/80 text-muted-foreground font-medium">
                    <tr>
                      <th className="py-2.5 pl-2">{t('reports:rankCol')}</th>
                      <th className="py-2.5">{t('reports:productCol')}</th>
                      <th className="py-2.5">{t('reports:categoryCol')}</th>
                      <th className="py-2.5 text-center">{t('reports:qtySoldCol')}</th>
                      <th className="py-2.5 text-right">{t('reports:totalSalesCol')}</th>
                      <th className="py-2.5 text-right pr-2">{t('reports:grossProfitCol')}</th>
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
                          {t('reports:pcs', { count: item.quantity_sold })}
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
                {t('reports:categoryBreakdown')}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('reports:categoryBreakdownDesc')}
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
                {t('reports:noDataCategories')}
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
                      <span>{t('reports:itemsSold', { count: cat.items_sold })}</span>
                      <span>{t('reports:totalShare', { percent: cat.percentage })}</span>
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
