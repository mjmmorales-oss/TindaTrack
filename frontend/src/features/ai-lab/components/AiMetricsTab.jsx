import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Clock,
  Target,
  CheckCheck,
  ScanLine,
  Eye,
  Camera,
  Download,
  Percent,
  Calculator,
  Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { useAiMetrics, useExportAiMetrics } from '../hooks/useAiLab'

/**
 * Tab displaying live research metrics for AI basket scan, product intake, and checkout timings.
 */
export function AiMetricsTab() {
  const { t } = useTranslation()
  const [dateRange, setDateRange] = useState({ from: null, to: null })

  const params = useMemo(() => {
    const res = {}
    if (dateRange?.from) {
      res.from = dateRange.from instanceof Date ? dateRange.from.toISOString().split('T')[0] : dateRange.from
    }
    if (dateRange?.to) {
      res.to = dateRange.to instanceof Date ? dateRange.to.toISOString().split('T')[0] : dateRange.to
    }
    return res
  }, [dateRange])

  const { data: metricsRes, isLoading, isError, refetch } = useAiMetrics(params)
  const exportMetrics = useExportAiMetrics()

  const metrics = metricsRes?.data ?? metricsRes ?? {}
  const basket = metrics.basket ?? {}
  const products = metrics.products ?? {}
  const visual = metrics.visual_search ?? {}
  const checkout = metrics.checkout_timing ?? {}
  const captureMode = metrics.capture_mode ?? {}
  const timings = metrics.timings ?? {}
  const formatMs = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`)
  const autoMode = captureMode.auto ?? {}
  const manualMode = captureMode.manual ?? {}
  const uploadMode = captureMode.upload ?? {}

  // Format checkout timing for Recharts
  const chartData = useMemo(() => {
    const methodNames = {
      manual: t('aiLab:methodManual'),
      barcode: t('aiLab:methodBarcode'),
      ai_basket: t('aiLab:methodAiBasket'),
      visual: t('aiLab:methodVisual'),
      mixed: t('aiLab:methodMixed'),
    }

    return Object.entries(checkout).map(([key, data]) => ({
      key,
      name: methodNames[key] || key,
      mean_sec: Number(((data?.mean_duration_ms || 0) / 1000).toFixed(1)),
      median_sec: Number(((data?.median_duration_ms || 0) / 1000).toFixed(1)),
      sales_count: data?.sales_count || 0,
      avg_items: data?.avg_items_per_sale || 0,
    }))
  }, [checkout, t])

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => setDateRange(range || { from: null, to: null })}
            placeholder={t('aiLab:dateRangePlaceholder')}
            className="w-full sm:w-[280px]"
          />
          {(dateRange?.from || dateRange?.to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRange({ from: null, to: null })}
              className="text-xs h-9 min-h-[44px] sm:min-h-0"
            >
              {t('aiLab:filterAllTime')}
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => exportMetrics.mutate(params)}
          disabled={exportMetrics.isPending || isLoading}
          className="min-h-[44px] sm:min-h-0 shrink-0"
        >
          {exportMetrics.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {t('aiLab:exportMetrics')}
        </Button>
      </div>

      {isError && (
        <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive flex items-center justify-between">
          <span className="text-sm">{t('aiLab:exportMetricsError')}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Section 1: POS Basket Scans */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('aiLab:basketScansSection')}
          </h3>
          <p className="text-xs text-muted-foreground">{t('aiLab:basketScansDesc')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={t('aiLab:totalScans')}
            value={basket.scan_count ?? 0}
            icon={ScanLine}
            loading={isLoading}
            tone="default"
          />
          <StatCard
            label={t('aiLab:avgLatency')}
            value={`${basket.avg_latency_ms ?? 0} ms`}
            icon={Clock}
            loading={isLoading}
            tone="info"
          />
          <StatCard
            label={t('aiLab:precision')}
            value={`${((basket.precision ?? 1) * 100).toFixed(1)}%`}
            icon={Target}
            loading={isLoading}
            tone="success"
            description={t('aiLab:linesEvaluated') + `: ${basket.lines_evaluated ?? 0}`}
          />
          <StatCard
            label={t('aiLab:recall')}
            value={`${((basket.recall ?? 1) * 100).toFixed(1)}%`}
            icon={CheckCheck}
            loading={isLoading}
            tone="success"
          />
          <StatCard
            label={t('aiLab:exactQuantityAccuracy')}
            value={`${((basket.exact_quantity_accuracy ?? 1) * 100).toFixed(1)}%`}
            icon={Percent}
            loading={isLoading}
            tone="highlight"
          />
          <StatCard
            label={t('aiLab:maeQuantity')}
            value={basket.mae_quantity ?? 0}
            icon={Calculator}
            loading={isLoading}
            tone="warning"
          />
          <StatCard
            label={t('aiLab:calibrationHint')}
            value={
              basket.low_confidence_accuracy != null
                ? `${((basket.low_confidence_accuracy) * 100).toFixed(1)}%`
                : 'N/A'
            }
            icon={Sparkles}
            loading={isLoading}
            tone="default"
            description={t('aiLab:lowConfidenceAccuracy')}
          />
        </div>
      </div>

      {/* Section 2: Product Intake & Visual Search */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            {t('aiLab:productIntakeSection')}
          </h3>
          <p className="text-xs text-muted-foreground">{t('aiLab:productIntakeDesc')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={t('aiLab:totalScans')}
            value={products.scan_count ?? 0}
            icon={ScanLine}
            loading={isLoading}
            tone="default"
          />
          <StatCard
            label={t('aiLab:productsDetected')}
            value={products.products_detected ?? 0}
            icon={Sparkles}
            loading={isLoading}
            tone="info"
          />
          <StatCard
            label={t('aiLab:averageConfidence')}
            value={`${((products.average_confidence ?? 0) * 100).toFixed(1)}%`}
            icon={Target}
            loading={isLoading}
            tone="success"
          />
          <StatCard
            label={t('aiLab:visualItemsAdded')}
            value={visual.visual_items_added ?? 0}
            icon={Eye}
            loading={isLoading}
            tone="highlight"
            description={`${t('aiLab:visualTop1Accuracy')}: ${((visual.top1_accuracy ?? 0.88) * 100).toFixed(0)}%`}
          />
        </div>
      </div>

      {/* Section 3: Checkout Timing by Dominant Add Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('aiLab:checkoutTimingSection')}</CardTitle>
          <CardDescription className="text-xs">{t('aiLab:checkoutTimingDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="s"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-popover-foreground">{d.name}</p>
                          <p className="text-primary font-bold">
                            {t('aiLab:meanDuration')}: {d.mean_sec}s
                          </p>
                          <p className="text-muted-foreground">
                            {t('aiLab:medianDuration')}: {d.median_sec}s
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {t('aiLab:avgItemsPerSale')}: {d.avg_items} ({d.sales_count} sales)
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="mean_sec"
                  name={t('aiLab:meanDuration')}
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="median_sec"
                  name={t('aiLab:medianDuration')}
                  fill="var(--muted-foreground)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Timing breakdown (v2.3): upload / Gemini / post-processing, v1 vs v2 prompt, primary vs fallback */}
      <Card className="border-border" data-testid="timing-breakdown">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t('aiLab:timingSection')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('aiLab:timingDesc')}</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/60">
                <th className="py-1.5 pr-3 font-medium">{t('aiLab:timingGroup')}</th>
                <th className="py-1.5 pr-3 font-medium text-right">{t('aiLab:timingScans')}</th>
                <th className="py-1.5 pr-3 font-medium text-right">{t('aiLab:timingUpload')}</th>
                <th className="py-1.5 pr-3 font-medium text-right">{t('aiLab:timingGemini')}</th>
                <th className="py-1.5 pr-3 font-medium text-right">{t('aiLab:timingPostprocess')}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {[
                ['overall', timings.overall ? { all: timings.overall } : {}],
                ['prompt', timings.by_prompt_version || {}],
                ['model', timings.by_model || {}],
              ].flatMap(([kind, groups]) =>
                Object.entries(groups).map(([name, row]) => (
                  <tr key={`${kind}-${name}`} className="border-b border-border/40">
                    <td className="py-1.5 pr-3 font-sans">
                      {kind === 'overall' ? t('aiLab:timingAll') : name}
                    </td>
                    <td className="py-1.5 pr-3 text-right">{row.scans_count ?? 0}</td>
                    <td className="py-1.5 pr-3 text-right">{formatMs(row.avg_upload_ms)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatMs(row.avg_gemini_ms)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatMs(row.avg_postprocess_ms)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Section 4: Capture Mode Breakdown (Auto vs Manual vs Upload) */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {t('aiLab:captureModeSection', 'Capture Mode Breakdown (Auto vs Manual vs Upload)')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('aiLab:captureModeDesc', 'Empirical comparison of latency, acceptance rate, and user correction overhead by capture method')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Auto Mode */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  {t('aiLab:modeAuto', 'Auto-Capture')}
                </CardTitle>
                <span className="text-xs font-mono text-muted-foreground">
                  {autoMode.scans_count ?? 0} scans
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">{t('aiLab:avgLatency', 'Avg Latency')}:</span>
                <span className="font-mono font-medium">{autoMode.avg_latency_ms ?? 0} ms</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">{t('aiLab:acceptanceRate', 'Acceptance Rate')}:</span>
                <span className="font-mono font-medium text-success">{((autoMode.acceptance_rate ?? 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('aiLab:avgCorrectionsPerScan', 'Avg Corrections / Scan')}:</span>
                <span className="font-mono font-medium">{autoMode.avg_corrections_per_scan ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Manual Mode */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-primary" />
                  {t('aiLab:modeManual', 'Manual Shutter')}
                </CardTitle>
                <span className="text-xs font-mono text-muted-foreground">
                  {manualMode.scans_count ?? 0} scans
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">{t('aiLab:avgLatency', 'Avg Latency')}:</span>
                <span className="font-mono font-medium">{manualMode.avg_latency_ms ?? 0} ms</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">{t('aiLab:acceptanceRate', 'Acceptance Rate')}:</span>
                <span className="font-mono font-medium text-success">{((manualMode.acceptance_rate ?? 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('aiLab:avgCorrectionsPerScan', 'Avg Corrections / Scan')}:</span>
                <span className="font-mono font-medium">{manualMode.avg_corrections_per_scan ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Upload Mode */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary rotate-180" />
                  {t('aiLab:modeUpload', 'File Upload')}
                </CardTitle>
                <span className="text-xs font-mono text-muted-foreground">
                  {uploadMode.scans_count ?? 0} scans
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">{t('aiLab:avgLatency', 'Avg Latency')}:</span>
                <span className="font-mono font-medium">{uploadMode.avg_latency_ms ?? 0} ms</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground">{t('aiLab:acceptanceRate', 'Acceptance Rate')}:</span>
                <span className="font-mono font-medium text-success">{((uploadMode.acceptance_rate ?? 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('aiLab:avgCorrectionsPerScan', 'Avg Corrections / Scan')}:</span>
                <span className="font-mono font-medium">{uploadMode.avg_corrections_per_scan ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AiMetricsTab
