import { useEffect, useState } from 'react'
import {
  Package,
  Utensils,
  Coffee,
  Cookie,
  Fish,
  Milk,
  Sparkles,
  Tag,
  ShoppingBag,
  Store,
  Wine,
  Flame,
  Check,
  Loader2,
} from 'lucide-react'

import { ResponsiveDialog } from '@/components/overlays/ResponsiveDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateCategory, useUpdateCategory } from '@/features/categories/hooks/useCategories'
import { cn } from '@/lib/utils'

export const COLOR_SWATCHES = [
  { id: 'primary', label: 'Emerald / Primary', className: 'bg-primary/20 text-primary border-primary/40' },
  { id: 'highlight', label: 'Gold / Highlight', className: 'bg-highlight/20 text-highlight-foreground border-highlight/40' },
  { id: 'success', label: 'Green / Success', className: 'bg-success/20 text-success border-success/40' },
  { id: 'warning', label: 'Amber / Warning', className: 'bg-warning/20 text-warning border-warning/40' },
  { id: 'utang', label: 'Orange / Utang', className: 'bg-utang/20 text-utang border-utang/40' },
  { id: 'info', label: 'Cyan / Info', className: 'bg-info/20 text-info border-info/40' },
  { id: 'secondary', label: 'Neutral / Slate', className: 'bg-secondary text-secondary-foreground border-border' },
  { id: 'destructive', label: 'Ruby / Destructive', className: 'bg-destructive/20 text-destructive border-destructive/40' },
]

export const ICON_OPTIONS = [
  { name: 'Package', component: Package },
  { name: 'Utensils', component: Utensils },
  { name: 'Coffee', component: Coffee },
  { name: 'Cookie', component: Cookie },
  { name: 'Fish', component: Fish },
  { name: 'Milk', component: Milk },
  { name: 'Sparkles', component: Sparkles },
  { name: 'Tag', component: Tag },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'Store', component: Store },
  { name: 'Wine', component: Wine },
  { name: 'Flame', component: Flame },
]

/**
 * Category create and edit dialog with preset color swatches and icon picker.
 *
 * @param {object} props
 * @param {boolean} props.open - Modal open state
 * @param {(open: boolean) => void} props.onOpenChange - Open state handler
 * @param {object|null} [props.category] - Category to edit
 * @param {() => void} [props.onSuccess] - Callback on success
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category = null,
  onSuccess,
}) {
  const isEdit = !!category
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0].className)
  const [selectedIcon, setSelectedIcon] = useState('Package')
  const [errorMessage, setErrorMessage] = useState('')

  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      setName(category?.name || '')
      setDescription(category?.description || '')
      setSelectedColor(category?.color || COLOR_SWATCHES[0].className)
      setSelectedIcon(category?.icon || 'Package')
      setErrorMessage('')
    }
  }, [open, category])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!name.trim()) {
      setErrorMessage('Kailangan ang pangalan ng kategorya.')
      return
    }

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
        icon: selectedIcon,
      }

      if (isEdit) {
        await updateMutation.mutateAsync({ id: category.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          'Nabigong i-save ang kategorya.',
      )
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `I-edit ang Kategorya: ${category.name}` : 'Magdagdag ng Bagong Kategorya'}
      description="Pamahalaan ang pagkakagrupo ng mga paninda gamit ang custom icon at kulay."
      className="sm:max-w-lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Kanselahin
          </Button>
          <Button
            type="submit"
            form="category-form"
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'I-save ang Pagbabago' : 'Idagdag ang Kategorya'}
          </Button>
        </div>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive" className="py-2.5">
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="category-name" className="text-xs font-semibold">
            Pangalan ng Kategorya <span className="text-destructive">*</span>
          </Label>
          <Input
            id="category-name"
            placeholder="hal. Snacks, Drinks, Canned Goods"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errorMessage) setErrorMessage('')
            }}
            className="h-10 text-base md:text-sm"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="category-desc" className="text-xs font-semibold">
            Paglalarawan (Opsyonal)
          </Label>
          <Textarea
            id="category-desc"
            placeholder="Maikling paliwanag sa mga uri ng paninda sa kategoryang ito..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-xs"
          />
        </div>

        {/* 8 Color Swatches (44px tap targets) */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold block">
            Kulay ng Kategorya (8 Preset Swatches)
          </Label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {COLOR_SWATCHES.map((swatch) => {
              const isSelected = selectedColor === swatch.className
              return (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() => setSelectedColor(swatch.className)}
                  title={swatch.label}
                  className={cn(
                    'h-11 w-full rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs',
                    swatch.className,
                    isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'hover:opacity-80',
                  )}
                  aria-label={swatch.label}
                >
                  {isSelected && <Check className="h-4 w-4" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* 12-Icon Picker (44px tap targets) */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold block">
            Icon ng Kategorya (12 Lucide Icons)
          </Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {ICON_OPTIONS.map((item) => {
              const IconComp = item.component
              const isSelected = selectedIcon === item.name
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSelectedIcon(item.name)}
                  className={cn(
                    'h-11 w-full rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-xs',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border/80 bg-card hover:bg-muted/50 text-muted-foreground',
                  )}
                  aria-label={item.name}
                >
                  <IconComp className="h-4 w-4" />
                  <span className="text-[10px] leading-none">{item.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

export default CategoryFormDialog
