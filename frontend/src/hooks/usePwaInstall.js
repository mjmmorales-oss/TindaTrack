import { useState, useEffect, useCallback } from 'react'

/**
 * Hook to manage PWA installation state, capturing `beforeinstallprompt` on Chromium/Android
 * and detecting iOS Safari standalone addition.
 *
 * @returns {{
 *   isInstallable: boolean,
 *   isInstalled: boolean,
 *   isIos: boolean,
 *   promptInstall: () => Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'>
 * }}
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    )
  })

  const [isIos] = useState(() => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent || ''
    return /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayChange = (e) => {
      setIsInstalled(e.matches)
    }
    mediaQuery.addEventListener?.('change', handleDisplayChange)

    // Capture standard PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      mediaQuery.removeEventListener?.('change', handleDisplayChange)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (isInstalled) return 'unavailable'

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        setDeferredPrompt(null)
        if (choice?.outcome === 'accepted') {
          setIsInstalled(true)
          return 'accepted'
        }
        return 'dismissed'
      } catch {
        return 'unavailable'
      }
    }

    if (isIos) {
      return 'ios'
    }

    return 'unavailable'
  }, [deferredPrompt, isIos, isInstalled])

  const isInstallable = !isInstalled && (Boolean(deferredPrompt) || isIos)

  return {
    isInstallable,
    isInstalled,
    isIos,
    deferredPrompt,
    promptInstall,
  }
}

export default usePwaInstall
