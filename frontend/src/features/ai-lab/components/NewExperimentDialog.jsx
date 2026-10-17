import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateExperiment } from '../hooks/useAiLab'

/**
 * Dialog for creating a new controlled AI research benchmark experiment.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onOpenChange
 */
export function NewExperimentDialog({ open, onOpenChange }) {
  const { t } = useTranslation()
  const createExperiment = useCreateExperiment()

  const [name, setName] = useState('')
  const [type, setType] = useState('basket_evaluation')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    await createExperiment.mutateAsync({
      name: name.trim(),
      type: type.trim(),
      notes: notes.trim(),
    })

    setName('')
    setNotes('')
    onOpenChange(false)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('aiLab:newExperimentTitle')}
      description={t('aiLab:newExperimentDesc')}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <Label htmlFor="exp-name">{t('aiLab:experimentName')}</Label>
          <Input
            id="exp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('aiLab:experimentNamePlaceholder')}
            required
            className="text-base md:text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-type">{t('aiLab:experimentType')}</Label>
          <select
            id="exp-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="basket_evaluation">Basket Evaluation (Multi-item)</option>
            <option value="visual_search_evaluation">Visual Search Evaluation (Single-item)</option>
            <option value="lighting_stress_test">Lighting & Angle Stress Test</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-notes">{t('aiLab:experimentNotes')}</Label>
          <Textarea
            id="exp-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('aiLab:experimentNotesPlaceholder')}
            rows={3}
            className="text-base md:text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createExperiment.isPending}
          >
            {t('aiLab:cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || createExperiment.isPending}
          >
            {createExperiment.isPending ? t('aiLab:evaluating') : t('aiLab:createExperiment')}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default NewExperimentDialog
