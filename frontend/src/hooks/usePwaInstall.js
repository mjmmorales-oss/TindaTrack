import { useState, useEffect, useCallback } from 'react'
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  initPwaInstallCapture,
  subscribeInstallPrompt,
} from '@/lib/pwaInstall'

// main.jsx starts the capture at boot; this keeps it working wherever the hook is used first
initPwaInstallCapture()

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
  const [deferredPrompt, setDeferredPrompt] = useState(getDeferredInstallPrompt)
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

    // The install prompt is captured once at startup (lib/pwaInstall) and shared
    const unsubscribe = subscribeInstallPrompt((prompt) => setDeferredPrompt(prompt))
    const handleAppInstalled = () => setIsInstalled(true)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      mediaQuery.removeEventListener?.('change', handleDisplayChange)
      window.removeEventListener('appinstalled', handleAppInstalled)
      unsubscribe()
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (isInstalled) return 'unavailable'

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        clearDeferredInstallPrompt()
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
