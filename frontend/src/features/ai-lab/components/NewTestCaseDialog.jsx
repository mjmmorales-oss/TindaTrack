import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Upload, Trash2, Plus, Loader2 } from 'lucide-react'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useRunExperimentCase } from '../hooks/useAiLab'
import { prepareForAi } from '@/lib/imagePrep'

/**
 * Dialog to capture/upload a test case image and specify ground-truth items for evaluation.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onOpenChange
 * @param {number|string} props.experimentId
 */
export function NewTestCaseDialog({ open, onOpenChange, experimentId }) {
  const { t } = useTranslation()
  const { data: productsRes } = useProducts({ limit: 200 })
  const products = productsRes?.data || []

  const runExperimentCase = useRunExperimentCase()

  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [groundTruth, setGroundTruth] = useState([])
  const [isProcessingImage, setIsProcessingImage] = useState(false)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingImage(true)
    try {
      const preparedBlob = await prepareForAi(file, { maxDim: 1024, initialQuality: 0.85 })
      setSelectedFile(preparedBlob)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(preparedBlob))
    } catch {
      setSelectedFile(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
    } finally {
      setIsProcessingImage(false)
    }
  }

  const handleAddGroundTruthItem = () => {
    if (!selectedProductId) return
    const prod = products.find((p) => String(p.id) === String(selectedProductId))
    if (!prod) return

    const qty = Math.max(1, parseInt(itemQty, 10) || 1)
    const existingIdx = groundTruth.findIndex((gt) => String(gt.product_id) === String(prod.id))

    if (existingIdx !== -1) {
      const updated = [...groundTruth]
      updated[existingIdx].quantity += qty
      setGroundTruth(updated)
    } else {
      setGroundTruth([
        ...groundTruth,
        {
          product_id: prod.id,
          name: prod.name,
          quantity: qty,
        },
      ])
    }

    setSelectedProductId('')
    setItemQty(1)
  }

  const handleRemoveGroundTruthItem = (productId) => {
    setGroundTruth(groundTruth.filter((gt) => gt.product_id !== productId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile || groundTruth.length === 0 || !experimentId) return

    await runExperimentCase.mutateAsync({
      experimentId,
      imageBlob: selectedFile,
      groundTruth,
    })

    // Reset
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setGroundTruth([])
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('aiLab:newTestCaseTitle')}
      description={t('aiLab:newTestCaseDesc')}
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2 max-h-[75vh] overflow-y-auto px-1">
        {/* Step 1: Image Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t('aiLab:stepPhoto')}</Label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-border bg-muted/20 flex flex-col items-center p-2">
              <img
                src={previewUrl}
                alt="Case Preview"
                className="max-h-48 object-contain rounded-md"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 min-h-[44px]"
              >
                <Camera className="h-4 w-4 mr-1.5" />
                {t('aiLab:takePhotoOrUpload')}
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-xl p-6 text-center cursor-pointer bg-muted/10 flex flex-col items-center justify-center gap-2 min-h-[140px]"
            >
              {isProcessingImage ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">
                {t('aiLab:takePhotoOrUpload')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('aiLab:browseFile')}
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Ground Truth */}
        <div className="space-y-3 border-t border-border/60 pt-4">
          <Label className="text-sm font-semibold">{t('aiLab:stepGroundTruth')}</Label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="gt-product-select" className="text-xs text-muted-foreground">
                {t('aiLab:chooseProduct')}
              </Label>
              <select
                id="gt-product-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full h-11 sm:h-10 px-3 py-2 rounded-md border border-input bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- {t('aiLab:chooseProduct')} --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₱{Number(p.price || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-24 space-y-1">
              <Label htmlFor="gt-qty-input" className="text-xs text-muted-foreground">
                {t('aiLab:quantity')}
              </Label>
              <Input
                id="gt-qty-input"
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-11 sm:h-10 text-base md:text-sm"
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleAddGroundTruthItem}
              disabled={!selectedProductId}
              className="min-h-[44px] sm:h-10 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('aiLab:addGroundTruthItem')}
            </Button>
          </div>

          {/* List of added ground truth items */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t('aiLab:groundTruthList')} ({groundTruth.length})
            </span>

            {groundTruth.length === 0 ? (
              <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-lg border border-dashed border-border/60">
                {t('aiLab:noGroundTruthItems')}
              </p>
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border border-border bg-card">
                {groundTruth.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {item.quantity}x
                      </Badge>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveGroundTruthItem(item.product_id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={t('aiLab:remove')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={runExperimentCase.isPending}
            className="min-h-[44px]"
          >
            {t('aiLab:cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!selectedFile || groundTruth.length === 0 || runExperimentCase.isPending}
            className="min-h-[44px]"
          >
            {runExperimentCase.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('aiLab:evaluating')}
              </>
            ) : (
              t('aiLab:runEvaluation')
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default NewTestCaseDialog
