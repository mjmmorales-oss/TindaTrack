import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

/**
 * Key-value list for metadata display (e.g. sale details, customer profiles, product attributes).
 *
 * @component
 * @param {object} props
 * @param {Array<{ label: string, value: React.ReactNode, hint?: string, copyable?: boolean }>} props.items - List items
 * @param {string} [props.className] - Additional classes
 * @returns {React.JSX.Element}
 */
export function KeyValueList({ items = [], className }) {
  const [copiedKey, setCopiedKey] = useState(null)

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(String(text))
    setCopiedKey(label)
    notify.success('Nakopya sa clipboard', label)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <dl className={cn('divide-border/60 divide-y text-sm', className)}>
      {items.map((item, idx) => (
        <div
          key={`${item.label}-${idx}`}
          className="flex items-center justify-between py-2.5"
        >
          <dt className="text-muted-foreground font-normal">{item.label}</dt>
          <dd className="text-foreground flex items-center gap-1.5 text-right font-medium">
            <span>{item.value}</span>
            {item.hint && (
              <span className="text-muted-foreground text-xs">
                ({item.hint})
              </span>
            )}
            {item.copyable && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-6 w-6"
                onClick={() => handleCopy(item.value, item.label)}
                aria-label={`Kopyahin ang ${item.label}`}
              >
                {copiedKey === item.label ? (
                  <Check className="text-success h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default KeyValueList
