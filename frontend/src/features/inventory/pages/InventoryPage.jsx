import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  DollarSign,
  PackageCheck,
  PackagePlus,
  Printer,
  RotateCcw,
  Warehouse,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { ChartCard } from '@/components/common/ChartCard'
import { StockLevelBar } from '@/components/common/StockLevelBar'
import { EmptyState } from '@/components/common/EmptyState'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { useTableParams } from '@/components/data-table/useTableParams'
import { BulkRestockDialog } from '@/features/inventory/components/BulkRestockDialog'
import { PrintableRestockList } from '@/features/inventory/components/PrintableRestockList'
import { AdjustStockDialog } from '@/features/products/components/AdjustStockDialog'
import {
  useInventoryOverview,
  useStockMovements,
  useRestockList,
} from '@/features/inventory/hooks/useInventory'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDateTime } from '@/lib/format'

/**
 * Main Inventory & Stock Management page for Store Owners.
 * Features 4 tabs: Overview, Running Low (with bulk restock), Stock Movements, and Restock Checklist.
 */
export function InventoryPage() {
  useDocumentTitle('Stock & Inventory')

  const [activeTab, setActiveTab] = useState('overview')

  // Overview Query
  const {
    data: overviewRes,
    refetch: refetchOverview,
  } = useInventoryOverview()
  const overview = overviewRes?.data

  // Categories for chart breakdown
  const { data: categoriesRes } = useCategories()
  const categories = useMemo(() => categoriesRes?.data || [], [categoriesRes?.data])

  // Restock List Query
  const {
    data: restockRes,
    refetch: refetchRestock,
  } = useRestockList()
  const restockData = restockRes?.data

  // Store Settings
  const { data: settingsRes } = useSettings()
  const settings = settingsRes?.data

  // --- TAB 2: Running Low Products State & Queries ---
  const runningLowParams = useTableParams({
    stock: 'low',
    sort: 'stock_quantity',
    page: 1,
    per_page: 25,
  })

  const {
    data: runningLowRes,
    refetch: refetchRunningLow,
  } = useProducts({
    stock: 'low',
    page: runningLowParams.params.page,
    per_page: runningLowParams.params.per_page,
    sort: runningLowParams.params.sort || 'stock_quantity',
  })

  const runningLowProducts = useMemo(() => runningLowRes?.data || [], [runningLowRes?.data])

  // Selected products for bulk restock
  const [selectedLowItems, setSelectedLowItems] = useState({})
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [singleAdjustProduct, setSingleAdjustProduct] = useState(null)
  const [singleAdjustOpen, setSingleAdjustOpen] = useState(false)

  const selectedProductsList = useMemo(() => {
    return runningLowProducts.filter((p) => selectedLowItems[p.id])
  }, [runningLowProducts, selectedLowItems])

  const toggleSelectItem = (id) => {
    setSelectedLowItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const toggleSelectAll = () => {
    if (selectedProductsList.length === runningLowProducts.length) {
      setSelectedLowItems({})
    } else {
      const next = {}
      runningLowProducts.forEach((p) => {
        next[p.id] = true
      })
      setSelectedLowItems(next)
    }
  }

  // --- TAB 3: Stock Movements State & Queries ---
  const [movementType, setMovementType] = useState('')
  const [dateRange, setDateRange] = useState(undefined)

  const movementParams = useTableParams({
    page: 1,
    per_page: 20,
    sort: '-created_at',
  })

  const {
    data: movementsRes,
    refetch: refetchMovements,
  } = useStockMovements({
    type: movementType || undefined,
    from: dateRange?.from ? dateRange.from.toISOString() : undefined,
    to: dateRange?.to ? dateRange.to.toISOString() : undefined,
    page: movementParams.params.page,
    per_page: movementParams.params.per_page,
    sort: movementParams.params.sort || '-created_at',
  })

  const movements = useMemo(() => movementsRes?.data || [], [movementsRes?.data])

  // Category breakdown chart data
  const categoryChartData = useMemo(() => {
    return categories.map((cat) => ({
      name: cat.name,
      count: cat.product_count,
    }))
  }, [categories])

  const handleRefreshAll = () => {
    refetchOverview()
    refetchRunningLow()
    refetchMovements()
    refetchRestock()
    setSelectedLowItems({})
  }

  return (
    <PageContainer className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Pamamahala sa Imbentaryo (Stock Control)"
        description="Pagsusuri sa halaga ng mga paninda, pag-restock sa mga paubos na stock, at audit trail ng mga paggalaw."
        actions={
          <div className="flex items-center gap-2 print:hidden w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('restock-list')}
              className="h-11 sm:h-9 flex-1 sm:flex-initial gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Restock List
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const first = runningLowProducts[0]
                if (first) {
                  setSingleAdjustProduct(first)
                  setSingleAdjustOpen(true)
                }
              }}
              className="h-11 sm:h-9 flex-1 sm:flex-initial gap-1.5 font-semibold shadow-xs"
            >
              <ArrowDownUp className="h-4 w-4" />
              I-adjust ang Stock
            </Button>
          </div>
        }
      />

      {/* Tabs navigation: Scrolls horizontally on mobile without wrapping */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="w-full overflow-x-auto no-scrollbar border-b border-border pb-1 print:hidden">
          <TabsList className="inline-flex h-11 w-full sm:w-auto justify-start gap-1 p-1 bg-muted/60 flex-nowrap">
            <TabsTrigger value="overview" className="h-9 px-4 text-xs sm:text-sm font-semibold shrink-0">
              Pangkalahatang Tanaw (Overview)
            </TabsTrigger>
            <TabsTrigger value="running-low" className="h-9 px-4 text-xs sm:text-sm font-semibold shrink-0 gap-1.5">
              Paubos na Paninda (Running Low)
              {overview?.low_stock_count > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px] font-mono">
                  {overview.low_stock_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="movements" className="h-9 px-4 text-xs sm:text-sm font-semibold shrink-0">
              Audit Log (Movements)
            </TabsTrigger>
            <TabsTrigger value="restock-list" className="h-9 px-4 text-xs sm:text-sm font-semibold shrink-0">
              Checklist sa Pamimili (Restock List)
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ================= TAB 1: OVERVIEW ================= */}
        <TabsContent value="overview" className="space-y-6">
          {/* 4 StatCards (2x2 on phones, 4 cols on lg+) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Halaga sa Puhunan (Cost Value)"
              value={overview?.total_stock_value_cost ?? 0}
              format="currency"
              tone="default"
              icon={DollarSign}
              description="Kabuuang kapital na nakatabi sa tindahan"
            />
            <StatCard
              label="Halaga sa Benta (Retail Value)"
              value={overview?.total_stock_value_retail ?? 0}
              format="currency"
              tone="success"
              icon={DollarSign}
              description="Tinatayang benta kapag naubos lahat"
            />
            <StatCard
              label="May Sapat na Stock (In Stock)"
              value={overview?.in_stock_count ?? 0}
              format="number"
              tone="success"
              icon={CheckCircle2}
              description={`${overview?.total_products || 0} kabuuang uri ng paninda`}
            />
            <StatCard
              label="Paubos / Ubos na (Alerts)"
              value={(overview?.low_stock_count ?? 0) + (overview?.out_of_stock_count ?? 0)}
              format="number"
              tone={overview?.out_of_stock_count > 0 ? 'destructive' : 'warning'}
              icon={AlertTriangle}
              description={
                overview?.out_of_stock_count > 0
                  ? `${overview.out_of_stock_count} ang lubusang ubos na`
                  : 'May ilang piraso pang natitira'
              }
            />
          </div>

          {/* Category Breakdown Bar Chart */}
          <ChartCard
            title="Dami ng Produkto bawat Kategorya"
            description="Paghahambing ng dami ng uri ng paninda sa bawat kategorya"
          >
            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} produkto`, 'Bilang']}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </TabsContent>

        {/* ================= TAB 2: RUNNING LOW ================= */}
        <TabsContent value="running-low" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Mga Panindang Paubos at Ubos Na ({runningLowProducts.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Piliin ang mga paninda upang sabay-sabay na mag-restock.
              </p>
            </div>

            {/* Bulk restock trigger */}
            {selectedProductsList.length > 0 && (
              <Button
                onClick={() => setBulkDialogOpen(true)}
                className="gap-2 font-bold shadow-md h-11 sm:h-9"
              >
                <PackagePlus className="h-4 w-4" />
                I-restock ang Napiling {selectedProductsList.length} Paninda
              </Button>
            )}
          </div>

          {/* Desktop & Mobile Running Low Cards/Table */}
          <div className="space-y-3">
            {/* Mobile Select All */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-3 md:hidden">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    runningLowProducts.length > 0 &&
                    selectedProductsList.length === runningLowProducts.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Piliin ang lahat ng paubos na paninda"
                />
                <span className="text-xs font-semibold">Piliin Lahat ({runningLowProducts.length})</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {selectedProductsList.length} napili
              </span>
            </div>

            {runningLowProducts.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title="Lahat ng paninda ay may sapat na stock!"
                description="Walang produkto na nasa ilalim ng reorder level threshold."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {runningLowProducts.map((p) => {
                  const isChecked = !!selectedLowItems[p.id]
                  return (
                    <Card
                      key={p.id}
                      className={`relative flex flex-col justify-between p-4 transition-all ${
                        isChecked ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSelectItem(p.id)}
                            className="mt-1"
                            aria-label={`Piliin ang ${p.name}`}
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/products/${p.id}`}
                              className="font-bold text-sm text-foreground truncate block hover:text-primary"
                            >
                              {p.name}
                            </Link>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">
                              {p.sku || 'SKU'}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant={p.stock_quantity <= 0 ? 'destructive' : 'warning'}
                          className="shrink-0 text-xs font-mono"
                        >
                          {p.stock_quantity} natira
                        </Badge>
                      </div>

                      <div className="border-t border-border/60 pt-3 mt-3 space-y-2">
                        <StockLevelBar
                          stock={p.stock_quantity}
                          reorderLevel={p.reorder_level}
                          showLabel={false}
                        />

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-muted-foreground font-mono">
                            Reorder: {p.reorder_level} {p.unit || 'pcs'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSingleAdjustProduct(p)
                              setSingleAdjustOpen(true)
                            }}
                            className="h-8 text-xs font-semibold gap-1"
                          >
                            <ArrowDownUp className="h-3 w-3" />
                            Restock
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sticky Bottom Restock Bar on Mobile (< md) */}
          {selectedProductsList.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-xl backdrop-blur-md md:hidden">
              <Button
                onClick={() => setBulkDialogOpen(true)}
                className="w-full h-12 text-base font-bold shadow-md gap-2"
              >
                <PackagePlus className="h-5 w-5" />
                I-restock ang Napiling {selectedProductsList.length} Paninda
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ================= TAB 3: MOVEMENTS ================= */}
        <TabsContent value="movements" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Filter controls: Type filter + DateRangePicker (Drawer on mobile) */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-full sm:w-[260px]"
              />

              {/* Movement Type Badges / Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {[
                  { value: '', label: 'Lahat' },
                  { value: 'sale', label: 'Benta (Sale)' },
                  { value: 'restock', label: 'Restock' },
                  { value: 'damage', label: 'Damage' },
                  { value: 'correction', label: 'Koreksyon' },
                  { value: 'void', label: 'Void' },
                ].map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={movementType === item.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMovementType(item.value)}
                    className="h-8 text-xs shrink-0 rounded-full"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {(movementType || dateRange) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMovementType('')
                  setDateRange(undefined)
                }}
                className="h-8 text-xs text-muted-foreground self-start md:self-auto"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                I-clear ang Filter
              </Button>
            )}
          </div>

          {/* Movements Data Table / Mobile Card List */}
          <div className="space-y-2">
            {movements.length === 0 ? (
              <EmptyState
                icon={Warehouse}
                title="Walang naitalang paggalaw ng stock"
                description="Subukang magpalit ng petsa o uri ng transaksyon."
              />
            ) : (
              <>
                {/* Desktop Table (md+) */}
                <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[180px]">Petsa at Oras</TableHead>
                        <TableHead>Produkto</TableHead>
                        <TableHead className="w-[120px]">Uri</TableHead>
                        <TableHead className="text-right w-[120px]">Dami (Qty)</TableHead>
                        <TableHead className="text-right w-[120px]">Balanse</TableHead>
                        <TableHead>Gumawa / Tala</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(m.created_at)}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {m.product?.name || `Product #${m.product_id}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] capitalize">
                              {m.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs">
                            <span className={m.quantity > 0 ? 'text-success' : 'text-destructive'}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            {m.stock_after}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {m.user?.name || 'Staff'} {m.notes ? `· ${m.notes}` : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List (< md) */}
                <div className="grid grid-cols-1 gap-2.5 md:hidden">
                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-border/80 bg-card p-3 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">
                            {m.product?.name || `Product #${m.product_id}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {formatDateTime(m.created_at)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                          {m.type}
                        </Badge>
                      </div>

                      <div className="border-t border-border/50 pt-2 flex items-center justify-between font-mono">
                        <span className="text-muted-foreground">
                          Balanse Pagkatapos: <strong>{m.stock_after}</strong>
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            m.quantity > 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} pcs
                        </span>
                      </div>

                      {m.notes && (
                        <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1.5">
                          {m.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ================= TAB 4: RESTOCK LIST ================= */}
        <TabsContent value="restock-list" className="space-y-4">
          <PrintableRestockList
            restockData={restockData}
            settings={settings}
          />
        </TabsContent>
      </Tabs>

      {/* Bulk Restock Dialog */}
      <BulkRestockDialog
        items={selectedProductsList}
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onSuccess={handleRefreshAll}
      />

      {/* Single Adjust Stock Dialog */}
      <AdjustStockDialog
        product={singleAdjustProduct}
        open={singleAdjustOpen}
        onOpenChange={setSingleAdjustOpen}
        onSuccess={handleRefreshAll}
      />
    </PageContainer>
  )
}

export default InventoryPage
