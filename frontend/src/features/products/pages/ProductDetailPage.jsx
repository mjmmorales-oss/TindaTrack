import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router'
import {
  ArrowDownUp,
  ArrowLeft,
  Layers,
  Package,
  Pencil,
  Receipt,
  ShoppingCart,
  TrendingUp,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'


import { PageContainer } from '@/components/layout/PageContainer'
import { ProductThumb } from '@/components/common/ProductThumb'
import { Money } from '@/components/common/Money'
import { StatusBadge } from '@/components/common/StatusBadge'
import { StockLevelBar } from '@/components/common/StockLevelBar'
import { ErrorState } from '@/components/common/ErrorState'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { AdjustStockDialog } from '@/features/products/components/AdjustStockDialog'
import { useProduct } from '@/features/products/hooks/useProducts'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useStockMovements } from '@/features/inventory/hooks/useInventory'
import { useSales } from '@/features/sales/hooks/useSales'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate, formatDateTime, formatRelative } from '@/lib/format'

/**
 * Product detail profile page displaying specifications, profit margins,
 * 30-day sales volume bar chart, stock movement audit trail, and recent transactions.
 */
export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canViewCost = can('products.view_cost')
  const canManage = can('products.manage')

  const {
    data: productRes,
    isLoading: isLoadingProduct,
    isError: isProductError,
    error: productError,
    refetch: refetchProduct,
  } = useProduct(id)

  const product = productRes?.data
  useDocumentTitle(product ? product.name : `Product #${id}`)

  const { data: categoriesRes } = useCategories()
  const categories = useMemo(() => categoriesRes?.data || [], [categoriesRes?.data])
  const category = useMemo(
    () => categories.find((c) => c.id === product?.category_id),
    [categories, product?.category_id],
  )

  // Movements audit log for this product
  const {
    data: movementsRes,
    refetch: refetchMovements,
  } = useStockMovements({ product_id: id, per_page: 15 })
  const movements = useMemo(() => movementsRes?.data || [], [movementsRes?.data])

  // Recent sales for this product
  const { data: salesRes } = useSales({ per_page: 50 })
  const recentProductSales = useMemo(() => {
    if (!salesRes?.data || !id) return []
    return salesRes.data
      .filter((sale) =>
        sale.items?.some((item) => Number(item.product_id) === Number(id)),
      )
      .slice(0, 5)
  }, [salesRes?.data, id])

  // Compute 30-day sales volume chart data from stock movements
  const salesChartData = useMemo(() => {
    const days = 30
    const now = new Date()
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600000)
      const dateKey = d.toISOString().slice(0, 10)
      const dayLabel = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
      result.push({
        date: dateKey,
        label: dayLabel,
        quantity: 0,
      })
    }

    // Accumulate quantity sold from movements of type 'sale'
    movements.forEach((m) => {
      if (m.type === 'sale') {
        const dKey = m.created_at?.slice(0, 10)
        const match = result.find((r) => r.date === dKey)
        if (match) {
          match.quantity += Math.abs(m.quantity)
        }
      }
    })

    return result
  }, [movements])

  // Modals state
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)

  const handleRefreshAll = () => {
    refetchProduct()
    refetchMovements()
  }

  // Loading skeleton
  if (isLoadingProduct) {
    return (
      <PageContainer className="space-y-6 pb-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageContainer>
    )
  }

  // Error state
  if (isProductError || !product) {
    return (
      <PageContainer className="py-12">
        <ErrorState
          title="Hindi mahanap ang produkto"
          description={productError?.message || 'Maaaring nabura na o maling ID ang ibinigay.'}
          actionText="Bumalik sa Listahan ng Produkto"
          onAction={() => navigate('/products')}
        />
      </PageContainer>
    )
  }

  // Margin computations
  const price = Number(product.price || 0)
  const cost = Number(product.cost_price || 0)
  const profitPerUnit = Math.max(0, price - cost)
  const marginPercent = price > 0 ? Math.round((profitPerUnit / price) * 100) : 0
  const markupPercent = cost > 0 ? Math.round((profitPerUnit / cost) * 100) : 0

  return (
    <PageContainer className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 space-y-6">
      {/* Header with Back button and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 -ml-2 text-muted-foreground">
              <Link to="/products">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Mga Produkto
              </Link>
            </Button>
            <StatusBadge
              type="active"
              variant={product.is_active ? 'active' : 'inactive'}
              className="text-[10px]"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {product.name}
          </h1>
          <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
            <span>SKU: {product.sku || 'N/A'}</span>
            {product.barcode && <span>· Barcode: {product.barcode}</span>}
            {category && <span>· {category.name}</span>}
          </p>
        </div>

        {/* Action Buttons (stacked on phone, flex on sm+) */}
        {canManage && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustDialogOpen(true)}
              className="h-11 sm:h-9 gap-1.5 font-semibold"
            >
              <ArrowDownUp className="h-4 w-4" />
              I-adjust ang Stock
            </Button>
            <Button
              size="sm"
              onClick={() => setFormDialogOpen(true)}
              className="h-11 sm:h-9 gap-1.5 font-semibold shadow-xs"
            >
              <Pencil className="h-4 w-4" />
              I-edit ang Produkto
            </Button>
          </div>
        )}
      </div>

      {/* Grid: 2 columns on lg, stacks on phones */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CARD 1: General Info Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Impormasyon ng Produkto
            </CardTitle>
            <CardDescription className="text-xs">
              Mga batayang detalye at klasipikasyon ng paninda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <ProductThumb name={product.name} size="xl" className="rounded-xl shrink-0" />
              <div className="space-y-1 min-w-0">
                <p className="font-bold text-base text-foreground leading-snug">
                  {product.name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {category?.name || 'Walang Kategorya'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Sukat: {product.unit || 'pc'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paglalarawan:</span>
                <span className="text-foreground text-right font-medium max-w-[240px]">
                  {product.description || 'Walang karagdagang paglalarawan.'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unang Naitala:</span>
                <span className="font-mono text-muted-foreground">
                  {formatDate(product.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Huling Na-update:</span>
                <span className="font-mono text-muted-foreground">
                  {formatRelative(product.updated_at || product.created_at)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: Pricing & Profit Margin (Owner Only) */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Presyo at Kita (Pricing & Profit)
            </CardTitle>
            <CardDescription className="text-xs">
              {canViewCost
                ? 'Paghahambing ng puhunan, presyo ng benta, at porsyento ng kita'
                : 'Kasalukuyang presyo ng benta para sa mga mamimili'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Presyo ng Benta
                </span>
                <Money amount={price} size="xl" tone="default" className="font-extrabold" />
              </div>

              {canViewCost ? (
                <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Puhunan (Cost)
                  </span>
                  <Money amount={cost} size="xl" tone="muted" className="font-extrabold" />
                </div>
              ) : (
                <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Sukat (Unit)
                  </span>
                  <span className="font-mono text-xl font-bold text-foreground block">
                    bawat {product.unit || 'pc'}
                  </span>
                </div>
              )}
            </div>

            {canViewCost && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Tubo bawat Piraso (Profit):</span>
                  <Money amount={profitPerUnit} size="sm" tone="success" className="font-bold" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Profit Margin:</span>
                  <Badge variant="outline" className="border-success/40 text-success font-mono font-bold">
                    {marginPercent}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Markup sa Puhunan:</span>
                  <span className="font-mono text-foreground font-bold">
                    {markupPercent}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD 3: Stock Levels & Audit Movements */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-warning" />
                  Kasalukuyang Stock & Kasaysayan
                </CardTitle>
                <CardDescription className="text-xs">
                  Subaybayan ang pagpasok at pagbawas ng paninda
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {product.stock_quantity} {product.unit || 'pcs'} natira
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Dami vs Reorder Level:</span>
                <span className="font-mono font-bold text-foreground">
                  {product.stock_quantity} / Min {product.reorder_level}
                </span>
              </div>
              <StockLevelBar
                stock={product.stock_quantity}
                reorderLevel={product.reorder_level}
                showLabel={false}
              />
            </div>

            {/* Movements history */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Mga Kamakailang Paggalaw (Recent Movements):
              </span>

              {movements.length > 0 ? (
                <div className="space-y-2">
                  {movements.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-foreground capitalize">
                          {m.type === 'sale'
                            ? 'Benta sa POS'
                            : m.type === 'restock'
                              ? 'Restock'
                              : m.type === 'damage'
                                ? 'Sira / Tapon'
                                : 'Koreksyon'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTime(m.created_at)} {m.notes ? `· ${m.notes}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold ${
                            m.quantity > 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {product.unit || 'pcs'}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Balanse: {m.stock_after}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Walang naitalang paggalaw ng stock.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: 30-Day Sales Mini Bar Chart */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Benta sa Nakalipas na 30 Araw (Sales Volume)
            </CardTitle>
            <CardDescription className="text-xs">
              Bilang ng naibentang piraso bawat araw
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
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
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="rounded-lg border border-border bg-popover p-2 shadow-md text-xs space-y-0.5">
                            <p className="font-semibold text-popover-foreground">{item.date}</p>
                            <p className="text-primary font-mono font-bold">
                              Naibenta: {item.quantity} {product.unit || 'pcs'}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="var(--primary)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CARD 5: Recent Transactions with this product */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Mga Kamakailang Transaksyon (Recent Sales)
          </CardTitle>
          <CardDescription className="text-xs">
            Mga pinakabagong resibo kung saan kasama ang panindang ito
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentProductSales.length > 0 ? (
            <div className="space-y-2.5">
              {recentProductSales.map((sale) => {
                const soldItem = sale.items.find((i) => Number(i.product_id) === Number(id))
                return (
                  <Link
                    key={sale.id}
                    to={`/sales/${sale.id}`}
                    className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-mono font-semibold text-xs text-foreground truncate">
                        {sale.sale_no}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDateTime(sale.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-foreground block">
                          {soldItem?.quantity || 1} {product.unit || 'pcs'}
                        </span>
                        <Money amount={soldItem?.subtotal || 0} size="xs" tone="highlight" />
                      </div>
                      <StatusBadge type="payment" variant={sale.payment_type} className="text-[10px]" />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Wala pang naitalang transaksyon para sa produktong ito kamakailan.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ProductFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        product={product}
        categories={categories}
        onSuccess={handleRefreshAll}
      />

      <AdjustStockDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        product={product}
        onSuccess={handleRefreshAll}
      />
    </PageContainer>
  )
}

export default ProductDetailPage
