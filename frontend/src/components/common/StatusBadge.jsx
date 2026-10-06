import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Banknote,
  BookOpen,
  Crown,
  User,
  ShieldCheck,
  Ban,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIGS = {
  // Stock Status
  'stock:in': {
    label: 'In Stock',
    icon: CheckCircle2,
    className:
      'bg-success/15 text-success dark:bg-success/20 border-success/30',
  },
  'stock:low': {
    label: 'Low Stock',
    icon: AlertTriangle,
    className:
      'bg-warning/15 text-warning dark:bg-warning/20 border-warning/30',
  },
  'stock:out': {
    label: 'Out of Stock',
    icon: XCircle,
    className:
      'bg-destructive/15 text-destructive dark:bg-destructive/20 border-destructive/30',
  },

  // Sale Status
  'sale:completed': {
    label: 'Kumpleto',
    icon: CheckCircle2,
    className:
      'bg-success/15 text-success dark:bg-success/20 border-success/30',
  },
  'sale:voided': {
    label: 'Na-void',
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border line-through',
  },
  'sale:pending': {
    label: 'Nakabinbin',
    icon: Clock,
    className:
      'bg-warning/15 text-warning dark:bg-warning/20 border-warning/30',
  },

  // Payment Method
  'payment:cash': {
    label: 'Cash (Bayad)',
    icon: Banknote,
    className:
      'bg-primary/15 text-primary dark:bg-primary/20 border-primary/30',
  },
  'payment:utang': {
    label: 'Utang (Credit)',
    icon: BookOpen,
    className:
      'bg-utang/15 text-utang dark:bg-utang/20 border-utang/30 font-semibold',
  },

  // User Role
  'role:owner': {
    label: 'May-ari (Owner)',
    icon: Crown,
    className: 'bg-primary text-primary-foreground font-semibold shadow-xs',
  },
  'role:cashier': {
    label: 'Tindero (Cashier)',
    icon: User,
    className: 'bg-secondary text-secondary-foreground font-medium',
  },

  // Active Status
  'active:active': {
    label: 'Aktibo',
    icon: ShieldCheck,
    className:
      'bg-success/15 text-success dark:bg-success/20 border-success/30',
  },
  'active:inactive': {
    label: 'Hindi Aktibo',
    icon: Ban,
    className: 'bg-muted text-muted-foreground border-border',
  },

  // Credit Status
  'credit:good': {
    label: 'Magandang Rekord',
    icon: Check,
    className:
      'bg-success/15 text-success dark:bg-success/20 border-success/30',
  },
  'credit:overdue': {
    label: 'Lagpas sa Takdang Araw',
    icon: AlertCircle,
    className:
      'bg-destructive/15 text-destructive dark:bg-destructive/20 border-destructive/30',
  },
}

/**
 * Config-driven semantic status badge.
 * Always renders both an icon and text for full accessibility (never color alone).
 *
 * @component
 * @param {object} props
 * @param {'stock'|'sale'|'payment'|'role'|'active'|'credit'} props.type - Status domain
 * @param {string} props.status - Specific status value (e.g. 'in', 'low', 'out', 'completed', 'voided', 'cash', 'utang')
 * @param {string} [props.label] - Custom override label
 * @param {string} [props.count] - Optional counter or quantity hint (e.g. "3 left")
 * @param {string} [props.className] - Additional class names
 * @returns {React.JSX.Element}
 */
export function StatusBadge({ type, status, label, count, className }) {
  const key = `${type}:${status}`
  const config = STATUS_CONFIGS[key] || {
    label: label || status,
    icon: AlertCircle,
    className: 'bg-muted text-muted-foreground border-border',
  }

  const Icon = config.icon
  const displayLabel = label || config.label

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        config.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{displayLabel}</span>
      {count !== undefined && count !== null && (
        <span className="font-mono text-[10px] opacity-80">· {count}</span>
      )}
    </Badge>
  )
}

export default StatusBadge
