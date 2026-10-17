import { useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Eye,
  Trash2,
  RefreshCw,
  Info,
  Loader2,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog'
import { notify } from '@/lib/notify'
import { aiService } from '@/services/aiService.js'
import { productService } from '@/services/productService.js'
import {
  useSettings,
  useUpdateSettings,
} from '@/features/settings/hooks/useSettings.js'
import {
  VISUAL_MODEL_ID,
} from '@/config/visual.js'
import {
  embedImage,
  invalidateVisualIndex,
} from '@/lib/visualSearch.js'

export function AiSettingsCard() {
  const { t } = useTranslation(['settings', 'common'])
  const queryClient = useQueryClient()
  const { data: settingsRes, isLoading: isLoadingSettings } = useSettings()
  const settings = settingsRes?.data || {}
  const updateSettingsMutation = useUpdateSettings()

  const [isPending, startTransition] = useTransition()
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState({
    current: 0,
    total: 0,
    productName: '',
  })
  const [isPruneDialogOpen, setIsPruneDialogOpen] = useState(false)
  const [isPruning, setIsPruning] = useState(false)

  // Query AI Status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiService.getAiStatus(),
    staleTime: 30000,
  })

  // Query Embeddings for visual index count
  const { data: embeddingsRes } = useQuery({
    queryKey: ['product-embeddings', VISUAL_MODEL_ID],
    queryFn: () => aiService.getEmbeddings({ model: VISUAL_MODEL_ID }),
    staleTime: 60000,
  })

  const embeddings = Array.isArray(embeddingsRes)
    ? embeddingsRes
    : embeddingsRes?.data || []
  const indexedProductIds = new Set(embeddings.map((e) => e.product_id))

  const handleToggle = (key, value) => {
    startTransition(async () => {
      try {
        await updateSettingsMutation.mutateAsync({ [key]: value })
        queryClient.invalidateQueries({ queryKey: ['ai-status'] })
      } catch (err) {
        notify.error(t('settings:saveSettingsError', 'Failed to save settings.'), err?.message)
      }
    })
  }

  const handleBuildVisualIndex = async () => {
    setIsIndexing(true)
    setIndexProgress({ current: 0, total: 0, productName: '' })

    try {
      // 1. Fetch all active products
      const res = await productService.list({ per_page: 250 })
      const allProducts = res?.data || []
      const productsWithImages = allProducts.filter(
        (p) => Boolean(p.image_url) && p.is_active !== false,
      )

      if (productsWithImages.length === 0) {
        notify.info(
          t('settings:visualIndexStatus', 'Visual Index Status'),
          'No products with images found to index.',
        )
        setIsIndexing(false)
        return
      }

      setIndexProgress({
        current: 0,
        total: productsWithImages.length,
        productName: '',
      })

      let newlyIndexed = 0
      let skipped = 0

      for (let i = 0; i < productsWithImages.length; i++) {
        const prod = productsWithImages[i]
        setIndexProgress({
          current: i + 1,
          total: productsWithImages.length,
          productName: prod.name,
        })

        // Check if existing embedding with matching image_sha256
        const existing = embeddings.find(
          (e) =>
            Number(e.product_id) === Number(prod.id) &&
            e.source === 'product_image' &&
            Boolean(prod.image_sha256) &&
            e.image_sha256 === prod.image_sha256,
        )

        if (existing) {
          skipped++
          continue
        }

        try {
          const vector = await embedImage(prod.image_url)
          await aiService.saveEmbedding(prod.id, {
            model: VISUAL_MODEL_ID,
            source: 'product_image',
            vector,
            image_sha256: prod.image_sha256 || null,
          })
          newlyIndexed++
        } catch (embedErr) {
          console.warn(`Could not embed product ${prod.name}:`, embedErr)
        }
      }

      invalidateVisualIndex()
      queryClient.invalidateQueries({ queryKey: ['product-embeddings'] })

      notify.success(
        t('settings:visualIndexStatus', 'Visual Index Status'),
        `Visual index complete: ${newlyIndexed} indexed, ${skipped} skipped.`,
      )
    } catch (err) {
      notify.error(t('settings:saveSettingsError', 'Build Index Error'), err?.message)
    } finally {
      setIsIndexing(false)
      setIndexProgress({ current: 0, total: 0, productName: '' })
    }
  }

  const handlePrunePhotos = async () => {
    setIsPruning(true)
    try {
      await aiService.pruneScans?.(30)
      notify.success(
        t('settings:prunePhotosButton', 'Prune saved scan photos'),
        t('settings:pruneSuccess', 'Saved scan photos older than 30 days pruned successfully.'),
      )
      setIsPruneDialogOpen(false)
    } catch (err) {
      notify.error('Prune Error', err?.message)
    } finally {
      setIsPruning(false)
    }
  }

  const dailyUsed = aiStatus?.daily_scans_today ?? 0
  const dailyLimit = aiStatus?.daily_limit ?? 1500
  const usagePercent = Math.min(100, Math.round((dailyUsed / Math.max(1, dailyLimit)) * 100))
  const isDemo = aiStatus?.provider === 'mock' || !aiStatus?.provider

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('settings:aiSettingsTitle', 'AI & Visual Settings')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('settings:aiSettingsDesc', 'Manage Gemini AI basket scan, on-device visual search, and privacy.')}
            </CardDescription>
          </div>
          <Badge variant={settings.ai_enabled !== false ? 'default' : 'secondary'} className="text-xs">
            {settings.ai_enabled !== false ? 'AI Active' : 'AI Disabled'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* SECTION 1: MASTER AI TOGGLE */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4 bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="toggle-ai-master" className="text-sm font-semibold cursor-pointer">
              {t('settings:aiEnabledLabel', 'Enable AI Features')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('settings:aiEnabledDesc', 'Enable AI basket scanning in POS and bulk photo intake.')}
            </p>
          </div>
          <Switch
            id="toggle-ai-master"
            checked={settings.ai_enabled !== false}
            disabled={isPending || isLoadingSettings}
            onCheckedChange={(val) => handleToggle('ai_enabled', val)}
          />
        </div>

        {/* SECTION 2: AI STATUS & QUOTA */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-4 space-y-2 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('settings:providerLabel', 'AI Provider')}</span>
              <span className="font-mono font-medium text-foreground uppercase">
                {aiStatus?.provider || 'gemini'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('settings:modelLabel', 'Model')}</span>
              <span className="font-mono font-medium text-foreground">
                {aiStatus?.model || 'gemini-2.5-flash'}
              </span>
            </div>

            {isDemo && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{t('settings:demoNotice', 'Demo mode active (Mock AI). Add your vision API key in backend/.env for real Google Vision.')}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t('settings:aiDocsLabel', 'Architecture & Guide')}</span>
              <span className="font-mono text-xs font-semibold text-primary">
                docs/AI.md
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 p-4 space-y-2.5 bg-card">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{t('settings:dailyUsageLabel', 'Daily Usage')}</span>
              <span className="font-mono text-muted-foreground">
                {dailyUsed} / {dailyLimit}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              {t('settings:dailyUsageDesc', '{{used}} of {{limit}} scans used today', {
                used: dailyUsed,
                limit: dailyLimit,
              })}
            </p>
          </div>
        </div>

        {/* SECTION 3: PRIVACY & RESEARCH SWITCHES */}
        <div className="space-y-4 rounded-xl border border-border/70 p-4 bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="toggle-save-photos" className="text-sm font-medium cursor-pointer">
                {t('settings:savePhotosLabel', 'Save scan photos for research')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings:savePhotosDesc', 'Keeps captured scan images in database for evaluation in the AI Research Lab.')}
              </p>
            </div>
            <Switch
              id="toggle-save-photos"
              checked={Boolean(settings.ai_save_scan_images)}
              disabled={isPending || isLoadingSettings}
              onCheckedChange={(val) => handleToggle('ai_save_scan_images', val)}
            />
          </div>

          <div className="h-px bg-border/50" />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="toggle-research-mode" className="text-sm font-medium cursor-pointer">
                {t('settings:researchModeLabel', 'Research mode')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings:researchModeDesc', 'Enables checkout timing analytics and reveals the AI Research Lab in the sidebar.')}
              </p>
            </div>
            <Switch
              id="toggle-research-mode"
              checked={Boolean(settings.ai_research_mode)}
              disabled={isPending || isLoadingSettings}
              onCheckedChange={(val) => handleToggle('ai_research_mode', val)}
            />
          </div>
        </div>

        {/* SECTION 4: ON-DEVICE VISUAL SEARCH & INDEX BUILDER */}
        <div className="space-y-4 rounded-xl border border-border/70 p-4 bg-card">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="toggle-visual-search" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary" />
                {t('settings:visualSearchLabel', 'On-device visual search')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings:visualSearchDesc', 'Fast, offline product recognition using Transformers.js running in a Web Worker.')}
              </p>
            </div>
            <Switch
              id="toggle-visual-search"
              checked={settings.visual_search_enabled !== false}
              disabled={isPending || isLoadingSettings}
              onCheckedChange={(val) => handleToggle('visual_search_enabled', val)}
            />
          </div>

          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs space-y-0.5">
                <span className="font-semibold text-foreground">
                  {t('settings:visualIndexStatus', 'Visual Index Status')}:
                </span>
                <p className="text-muted-foreground font-mono">
                  {t('settings:indexedProductsCount', '{{count}} products indexed (Model: {{model}})', {
                    count: indexedProductIds.size,
                    model: VISUAL_MODEL_ID,
                  })}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBuildVisualIndex}
                disabled={isIndexing || settings.visual_search_enabled === false}
                className="gap-1.5 font-medium shrink-0 h-9"
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>{t('settings:buildingIndex', 'Building index...')}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    <span>{t('settings:buildIndexButton', 'Build visual index')}</span>
                  </>
                )}
              </Button>
            </div>

            {isIndexing && (
              <div className="space-y-1.5 pt-1 animate-in fade-in-50">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{indexProgress.productName || 'Processing products...'}</span>
                  <span>
                    {indexProgress.current} / {indexProgress.total}
                  </span>
                </div>
                <Progress
                  value={
                    indexProgress.total
                      ? Math.round((indexProgress.current / indexProgress.total) * 100)
                      : 0
                  }
                  className="h-1.5"
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: PRUNE SAVED SCAN PHOTOS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 p-4 bg-muted/10">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-foreground">
              {t('settings:prunePhotosButton', 'Prune saved scan photos')}
            </span>
            <p className="text-xs text-muted-foreground">
              {t('settings:pruneConfirmDesc', 'This will remove all saved scan images older than 30 days. Metrics and experiment logs are kept.')}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPruneDialogOpen(true)}
            disabled={isPruning}
            className="gap-1.5 text-destructive hover:text-destructive shrink-0 h-9 font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t('settings:prunePhotosButton', 'Prune saved scan photos')}</span>
          </Button>
        </div>
      </CardContent>

      {/* CONFIRM PRUNE DIALOG */}
      <ConfirmDialog
        open={isPruneDialogOpen}
        onOpenChange={setIsPruneDialogOpen}
        title={t('settings:pruneConfirmTitle', 'Prune Saved Scan Photos?')}
        description={t('settings:pruneConfirmDesc', 'This will remove all saved scan images older than 30 days. Metrics and experiment logs are kept.')}
        confirmText={t('common:confirm', 'Confirm')}
        cancelText={t('common:cancel', 'Cancel')}
        variant="destructive"
        onConfirm={handlePrunePhotos}
      />
    </Card>
  )
}

export default AiSettingsCard
