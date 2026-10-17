import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FlaskConical,
  Plus,
  RotateCcw,
  Download,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import {
  useAiExperiments,
  useAiExperiment,
  useResetExperiment,
  useExportExperimentCsv,
} from '../hooks/useAiLab'
import { NewExperimentDialog } from './NewExperimentDialog'
import { NewTestCaseDialog } from './NewTestCaseDialog'

/**
 * Tab for running controlled ground-truth evaluation experiments and benchmarking AI accuracy.
 */
export function AiExperimentsTab() {
  const { t } = useTranslation()

  const { data: experimentsRes, isLoading: isLoadingExperiments } = useAiExperiments()
  const experiments = experimentsRes?.data || []

  const [selectedExpId, setSelectedExpId] = useState('')
  const [newExpOpen, setNewExpOpen] = useState(false)
  const [testCaseOpen, setTestCaseOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const effectiveExpId = selectedExpId || (experiments.length > 0 ? String(experiments[0].id) : '')

  const {
    data: experimentRes,
    isLoading: isLoadingExperiment,
  } = useAiExperiment(effectiveExpId)

  const experiment = experimentRes?.data
  const cases = experiment?.cases || []

  const resetExperiment = useResetExperiment()
  const exportCases = useExportExperimentCsv()

  // Compute running benchmark totals
  const totals = useMemo(() => {
    if (cases.length === 0) return null

    let exactMatches = 0
    let latencySum = 0
    let precisionSum = 0
    let recallSum = 0
    let maeSum = 0

    for (const c of cases) {
      if (c.is_correct) exactMatches++
      latencySum += Number(c.latency_ms || 0)
      const m = c.metrics || {}
      precisionSum += Number(m.precision ?? 1)
      recallSum += Number(m.recall ?? 1)
      maeSum += Number(m.mae ?? 0)
    }

    const n = cases.length
    return {
      totalCases: n,
      exactMatchRate: ((exactMatches / n) * 100).toFixed(1),
      avgLatency: Math.round(latencySum / n),
      avgPrecision: ((precisionSum / n) * 100).toFixed(1),
      avgRecall: ((recallSum / n) * 100).toFixed(1),
      avgMae: (maeSum / n).toFixed(2),
    }
  }, [cases])

  const handleResetConfirm = async () => {
    if (!effectiveExpId) return
    await resetExperiment.mutateAsync(effectiveExpId)
    setConfirmResetOpen(false)
  }

  if (isLoadingExperiments) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (experiments.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={FlaskConical}
          title={t('aiLab:noExperiments')}
          description={t('aiLab:noExperimentsDesc')}
          actionLabel={t('aiLab:createFirstExperiment')}
          onAction={() => setNewExpOpen(true)}
        />
        <NewExperimentDialog open={newExpOpen} onOpenChange={setNewExpOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Experiment Selector Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <label htmlFor="exp-select" className="text-xs font-semibold text-muted-foreground shrink-0">
            {t('aiLab:selectExperiment')}:
          </label>
          <select
            id="exp-select"
            value={effectiveExpId}
            onChange={(e) => setSelectedExpId(e.target.value)}
            className="w-full h-10 px-3 py-1.5 rounded-md border border-input bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.cases_count ?? exp.cases?.length ?? 0} cases)
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewExpOpen(true)}
            className="min-h-[44px] sm:min-h-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t('aiLab:newExperiment')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCases.mutate(effectiveExpId)}
            disabled={exportCases.isPending || cases.length === 0}
            className="min-h-[44px] sm:min-h-0"
          >
            {exportCases.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            {t('aiLab:exportCases')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmResetOpen(true)}
            disabled={cases.length === 0 || resetExperiment.isPending}
            className="text-destructive hover:bg-destructive/10 min-h-[44px] sm:min-h-0"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            {t('aiLab:resetExperiment')}
          </Button>

          <Button
            size="sm"
            onClick={() => setTestCaseOpen(true)}
            className="min-h-[44px] sm:min-h-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t('aiLab:addTestCase')}
          </Button>
        </div>
      </div>

      {/* Summary KPI Banner (When cases exist) */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard
            label={t('aiLab:totalCases')}
            value={totals.totalCases}
            tone="default"
          />
          <StatCard
            label={t('aiLab:exactMatchRate')}
            value={`${totals.exactMatchRate}%`}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label={t('aiLab:avgLatency')}
            value={`${totals.avgLatency} ms`}
            icon={Clock}
            tone="info"
          />
          <StatCard
            label={t('aiLab:avgPrecision')}
            value={`${totals.avgPrecision}%`}
            icon={Target}
            tone="success"
          />
          <StatCard
            label={t('aiLab:avgRecall')}
            value={`${totals.avgRecall}%`}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label={t('aiLab:avgMae')}
            value={totals.avgMae}
            tone="warning"
          />
        </div>
      )}

      {/* Cases Table or Empty State */}
      {isLoadingExperiment ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={t('aiLab:noCases')}
          description={t('aiLab:noCasesDesc')}
          actionLabel={t('aiLab:addFirstCase')}
          onAction={() => setTestCaseOpen(true)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{experiment?.name}</CardTitle>
            {experiment?.notes && (
              <CardDescription className="text-xs">{experiment.notes}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="py-3 px-4 text-left">{t('aiLab:caseNumber')}</th>
                    <th className="py-3 px-4 text-left">{t('aiLab:status')}</th>
                    <th className="py-3 px-4 text-left">{t('aiLab:avgLatency')}</th>
                    <th className="py-3 px-4 text-left">{t('aiLab:groundTruth')}</th>
                    <th className="py-3 px-4 text-left">{t('aiLab:predicted')}</th>
                    <th className="py-3 px-4 text-right">Metrics (P / R / MAE)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {cases.map((c) => {
                    const m = c.metrics || {}
                    const gtList = c.ground_truth || []
                    const predList = c.predicted || []

                    return (
                      <tr key={c.id} className="hover:bg-muted/15 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                          #{c.case_number}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.is_correct ? (
                            <Badge className="bg-success/15 text-success border-success/30 font-medium">
                              <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                              {t('aiLab:exactMatch')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-warning border-warning/40 font-medium">
                              <AlertTriangle className="h-3 w-3 mr-1 inline" />
                              {t('aiLab:partialMatch')}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                          {c.latency_ms} ms
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {gtList.map((gt, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[11px] font-medium"
                              >
                                {gt.quantity}x {gt.name || `ID:${gt.product_id}`}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {predList.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium"
                              >
                                {p.quantity}x {p.label || `ID:${p.matched_product_id}`}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                          <span className="text-success font-semibold">
                            {((m.precision ?? 1) * 100).toFixed(0)}%
                          </span>
                          {' / '}
                          <span className="text-info font-semibold">
                            {((m.recall ?? 1) * 100).toFixed(0)}%
                          </span>
                          {' / '}
                          <span className="text-warning font-semibold">
                            {Number(m.mae ?? 0).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <NewExperimentDialog open={newExpOpen} onOpenChange={setNewExpOpen} />
      {effectiveExpId && (
        <NewTestCaseDialog
          open={testCaseOpen}
          onOpenChange={setTestCaseOpen}
          experimentId={effectiveExpId}
        />
      )}
      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title={t('aiLab:resetExperimentConfirmTitle')}
        description={t('aiLab:resetExperimentConfirmMessage')}
        confirmText={t('aiLab:resetExperimentConfirmBtn')}
        tone="destructive"
        onConfirm={handleResetConfirm}
        isLoading={resetExperiment.isPending}
      />
    </div>
  )
}

export default AiExperimentsTab
