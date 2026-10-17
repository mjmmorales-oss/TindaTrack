import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Sparkles, FlaskConical, BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { AiMetricsTab } from '../components/AiMetricsTab'
import { AiExperimentsTab } from '../components/AiExperimentsTab'

/**
 * AI Research Lab Page (Owner only)
 * Provides academic empirical metrics, calibration hints, and controlled ground-truth benchmarking.
 */
export function AiLabPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('aiLab:pageTitle', 'AI Research Lab'))

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'metrics'

  const handleTabChange = (val) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', val)
      return next
    })
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('aiLab:pageTitle')}
        description={t('aiLab:pageSubtitle')}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-2 max-w-md h-11 p-1 bg-muted/60">
          <TabsTrigger value="metrics" className="gap-2 min-h-[36px] text-xs font-semibold">
            <BarChart3 className="h-4 w-4" />
            {t('aiLab:tabMetrics')}
          </TabsTrigger>
          <TabsTrigger value="experiments" className="gap-2 min-h-[36px] text-xs font-semibold">
            <FlaskConical className="h-4 w-4" />
            {t('aiLab:tabExperiments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="focus-visible:outline-none">
          <AiMetricsTab />
        </TabsContent>

        <TabsContent value="experiments" className="focus-visible:outline-none">
          <AiExperimentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AiLabPage
