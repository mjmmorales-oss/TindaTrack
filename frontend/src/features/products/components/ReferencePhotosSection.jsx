import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2, Plus, Sparkles, Loader2, Info } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { AiCapture } from '@/components/ai/AiCapture'
import { notify } from '@/lib/notify'
import { aiService } from '@/services/aiService'
import { VISUAL_MODEL_ID, MAX_REFERENCE_PHOTOS_PER_PRODUCT } from '@/config/visual'
import { embedImage, invalidateVisualIndex } from '@/lib/visualSearch'

export function ReferencePhotosSection({ product, canManage = false }) {
  const { t } = useTranslation(['products', 'scanner', 'common'])
  const queryClient = useQueryClient()
  const [isCaptureOpen, setIsCaptureOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // "Take 3 photos": how many to take in this session and how many are saved
  const [burstTarget, setBurstTarget] = useState(1)
  const [burstDone, setBurstDone] = useState(0)
  const [deletingId, setDeletingId] = useState(null)

  const { data: embeddingsRes, isLoading } = useQuery({
    queryKey: ['product-embeddings', product?.id],
    queryFn: () => aiService.getEmbeddings({ product_id: product?.id }),
    enabled: Boolean(product?.id),
    staleTime: 30000,
  })

  const rawList = Array.isArray(embeddingsRes)
    ? embeddingsRes
    : embeddingsRes?.data || []
  const referenceEmbeddings = rawList.filter(
    (e) =>
      Number(e.product_id) === Number(product?.id) &&
      (e.source === 'reference_photo' || e.source === 'correction'),
  )

  const openCapture = (count) => {
    setBurstTarget(count)
    setBurstDone(0)
    setIsCaptureOpen(true)
  }

  const handleCapture = async (blob) => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const vector = await embedImage(blob)
      await aiService.saveEmbedding(product.id, {
        model: VISUAL_MODEL_ID,
        source: 'reference_photo',
        vector,
      })

      const done = burstDone + 1
      setBurstDone(done)
      // Rebuild the index after each save so Visual Match learns immediately
      invalidateVisualIndex()
      queryClient.invalidateQueries({ queryKey: ['product-embeddings', product.id] })

      const remainingSlots = MAX_REFERENCE_PHOTOS_PER_PRODUCT - (referenceEmbeddings.length + 1)
      if (done < burstTarget && remainingSlots > 0) {
        notify.success(
          t('products:referencePhotoProgress', { done, total: burstTarget }),
          t('products:referencePhotoTurn'),
        )
        return
      }

      notify.success(
        t('products:addReferencePhoto', 'Reference Photo Added'),
        t('products:referencePhotoSavedDesc', 'Saved extra photo to improve visual search recognition.'),
      )
      setIsCaptureOpen(false)
    } catch (err) {
      notify.error(t('common:error', 'Error'), err?.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await aiService.deleteEmbedding(product.id, id)
      invalidateVisualIndex()
      queryClient.invalidateQueries({ queryKey: ['product-embeddings', product.id] })
      notify.success(t('common:deleted', 'Deleted'), t('products:referencePhotoRemoved', 'Reference vector removed.'))
    } catch (err) {
      notify.error(t('common:error', 'Error'), err?.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (!canManage) return null

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>{t('products:referencePhotosTitle', 'Visual Recognition Photos')}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {t('products:referencePhotosDesc', 'Extra angles and real-store lighting to improve visual search')}
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {referenceEmbeddings.length} / {MAX_REFERENCE_PHOTOS_PER_PRODUCT}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {referenceEmbeddings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 p-4 text-center space-y-2">
              <Camera className="h-6 w-6 text-muted-foreground/60 mx-auto" />
              <p className="text-xs text-muted-foreground">
                {t('products:noReferencePhotos', 'No extra reference photos yet. Take photos from different angles to make visual search faster and more accurate.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {referenceEmbeddings.map((emb, idx) => (
                <div
                  key={emb.id || idx}
                  className="group relative flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2.5 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      Angle #{idx + 1}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-mono">
                      {emb.source === 'correction' ? 'Correction' : 'Reference'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === emb.id}
                    onClick={() => handleDelete(emb.id)}
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    aria-label={t('common:delete', 'Delete photo')}
                  >
                    {deletingId === emb.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {referenceEmbeddings.length < MAX_REFERENCE_PHOTOS_PER_PRODUCT && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => openCapture(3)}
                disabled={isSaving}
                className="gap-2 text-xs font-medium h-11"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{t('products:takeThreePhotos')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openCapture(1)}
                disabled={isSaving}
                className="gap-2 text-xs font-medium h-11"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('products:addReferencePhoto', 'Add Reference Photo')}</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ResponsiveDialog
        open={isCaptureOpen}
        onOpenChange={setIsCaptureOpen}
        title={t('products:addReferencePhoto', 'Add Reference Photo')}
        description={t('products:addReferencePhotoDesc', 'Take a photo of {{name}} in real store lighting to teach visual search.', { name: product?.name })}
        className="sm:max-w-md"
      >
        <div className="p-1">
          <AiCapture
            onCapture={handleCapture}
            title={
              burstTarget > 1
                ? t('products:referencePhotoProgress', { done: burstDone, total: burstTarget })
                : t('products:addReferencePhoto', 'Add Reference Photo')
            }
            hint={t('products:referenceCaptureHint', 'Hold the product steady in the center of the frame.')}
            analyzingStep={t('products:referencePhotoSaving')}
            isAnalyzing={isSaving}
            autoCaptureEnabled={false}
          />
        </div>
      </ResponsiveDialog>
    </>
  )
}

export default ReferencePhotosSection
