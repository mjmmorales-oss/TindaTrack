import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Global offline banner detecting navigator.onLine changes.
 * Displays an alert when the user loses internet connection and confirms reconnection.
 *
 * @component
 * @param {object} props
 * @param {string} [props.className] - Additional wrapper class name
 * @returns {React.JSX.Element|null}
 */
export function OfflineBanner({ className }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
      }, 4000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showReconnected) {
    return null
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'bg-success flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white shadow-xs transition-all duration-300 sm:text-sm',
          className,
        )}
      >
        <Wifi className="h-4 w-4 shrink-0 animate-bounce" />
        <span>Nakakonekta na muli sa internet (Back online).</span>
      </div>
    )
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'bg-destructive text-destructive-foreground flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium shadow-xs transition-all duration-300 sm:text-sm',
        className,
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Nawalan ng koneksyon sa internet (Offline). Patuloy na gagana ang POS
        gamit ang lokal na datos.
      </span>
    </div>
  )
}

export default OfflineBanner
