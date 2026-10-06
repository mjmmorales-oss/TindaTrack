import { CircleDot } from 'lucide-react'
import { Money } from '@/components/common/Money'
import { cn } from '@/lib/utils'

const toneIconColors = {
  default: 'bg-muted text-muted-foreground border-border',
  success: 'bg-success/15 text-success border-success/30',
  utang: 'bg-utang/15 text-utang border-utang/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  destructive: 'bg-destructive/15 text-destructive border-destructive/30',
  info: 'bg-info/15 text-info border-info/30',
}

/**
 * Vertical timeline component for customer utang ledger and stock movement histories.
 *
 * @component
 * @param {object} props
 * @param {Array<{
 *   id?: string|number,
 *   icon?: React.ComponentType<{ className?: string }>,
 *   title: React.ReactNode,
 *   description?: React.ReactNode,
 *   timestamp: string,
 *   amount?: number|string,
 *   runningBalance?: number|string,
 *   tone?: 'default'|'success'|'utang'|'warning'|'destructive'|'info'
 * }>} props.items - Timeline entries
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function Timeline({ items = [], className }) {
  if (!items.length) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        Walang naitalang kasaysayan.
      </p>
    )
  }

  return (
    <div
      className={cn(
        'before:bg-border/60 relative space-y-6 pl-6 before:absolute before:top-3 before:bottom-3 before:left-2.5 before:w-0.5',
        className,
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon || CircleDot
        const tone = item.tone || 'default'

        return (
          <div key={item.id || idx} className="group relative">
            {/* Timeline node icon */}
            <div
              className={cn(
                'bg-background absolute top-0.5 -left-6 flex h-5 w-5 items-center justify-center rounded-full border shadow-xs',
                toneIconColors[tone] || toneIconColors.default,
              )}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
            </div>

            {/* Content row */}
            <div className="flex flex-col justify-between gap-1 text-sm sm:flex-row sm:items-start">
              <div className="space-y-0.5">
                <p className="text-foreground font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-muted-foreground text-xs">
                    {item.description}
                  </p>
                )}
                <span className="text-muted-foreground block pt-0.5 text-[11px]">
                  {item.timestamp}
                </span>
              </div>

              {(item.amount !== undefined ||
                item.runningBalance !== undefined) && (
                <div className="shrink-0 pt-1 text-right sm:self-center sm:pt-0">
                  {item.amount !== undefined && (
                    <Money amount={item.amount} tone={tone} size="sm" />
                  )}
                  {item.runningBalance !== undefined && (
                    <div className="text-muted-foreground text-[11px]">
                      Bal:{' '}
                      <Money
                        amount={item.runningBalance}
                        size="xs"
                        tone="muted"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Timeline
