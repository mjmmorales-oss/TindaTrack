import { Loader2, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Full page loading screen with brand logo and accessible loading indicator.
 *
 * @component
 * @param {object} props
 * @param {string} [props.label='Naglo-load ng tindahan... (Loading store data...)'] - Loading status text
 * @param {string} [props.className] - Container class name
 * @returns {React.JSX.Element}
 */
export function FullPageLoader({
  label = 'Naglo-load ng tindahan... (Loading store data...)',
  className,
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'bg-background/80 fixed inset-0 z-50 flex flex-col items-center justify-center p-4 text-center backdrop-blur-xs transition-opacity duration-300',
        className,
      )}
    >
      <div className="relative mb-4 flex items-center justify-center">
        {/* Animated Brand Background Ring */}
        <div className="bg-primary/10 text-primary flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl">
          <Store className="h-8 w-8" />
        </div>
        <div className="bg-background border-border absolute -right-1 -bottom-1 rounded-full border p-1 shadow-xs">
          <Loader2 className="text-primary h-4 w-4 animate-spin" />
        </div>
      </div>

      <h2 className="text-foreground text-base font-bold tracking-tight">
        TindaTrack
      </h2>
      <p className="text-muted-foreground mt-1.5 animate-pulse text-xs">
        {label}
      </p>
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  )
}

export default FullPageLoader
