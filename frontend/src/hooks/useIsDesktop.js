import { useEffect, useState } from 'react'
import { DESKTOP_POS_QUERY, isDesktopPos } from '@/lib/device'

/**
 * Reactive "desktop POS" check: `(pointer: fine)` and width ≥ 1024px.
 * Used to show laptop-only UI such as "Use phone as scanner".
 *
 * @returns {boolean}
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(isDesktopPos)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mql = window.matchMedia(DESKTOP_POS_QUERY)
    const onChange = () => setIsDesktop(isDesktopPos())
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  return isDesktop
}

export default useIsDesktop
