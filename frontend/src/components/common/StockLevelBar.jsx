import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/**
 * Visual stock level progress indicator with threshold-based color tones.
 *
 * @component
 * @param {object} props
 * @param {number} props.stock - Current inventory count
 * @param {number} [props.reorderLevel=10] - Threshold where stock becomes low
 * @param {number} [props.max] - Target/maximum stock capacity
 * @param {boolean} [props.showLabel=true] - Whether to show the numeric stock/target label
 * @param {string} [props.className] - Additional class names
 * @returns {React.JSX.Element}
 */
export function StockLevelBar({
  stock = 0,
  reorderLevel = 10,
  max,
  showLabel = true,
  className,
}) {
  const currentStock = Math.max(0, Number(stock) || 0)
  const maxStock = max || Math.max(reorderLevel * 3, currentStock, 20)
  const percent = Math.min(100, Math.round((currentStock / maxStock) * 100))

  let toneColor = 'bg-success'
  let labelText = `${currentStock} pcs`

  if (currentStock === 0) {
    toneColor = 'bg-destructive'
    labelText = 'Ubos na (0 pcs)'
  } else if (currentStock <= reorderLevel) {
    toneColor = 'bg-warning'
    labelText = `Paubos na (${currentStock} pcs)`
  }

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Kasalukuyang Dami:</span>
          <span className="text-foreground font-mono font-medium">
            {labelText}
          </span>
        </div>
      )}
      <Progress
        value={percent}
        className={cn(
          'bg-muted/60 h-2 [&>div]:transition-all [&>div]:duration-300',
          toneColor === 'bg-destructive' && '[&>div]:bg-destructive',
          toneColor === 'bg-warning' && '[&>div]:bg-warning',
          toneColor === 'bg-success' && '[&>div]:bg-success',
        )}
      />
    </div>
  )
}

export default StockLevelBar
