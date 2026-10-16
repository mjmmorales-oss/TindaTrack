import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

/**
 * Listens for waiting service worker updates and prompts the user with a reload toast.
 */
export function PwaUpdatePrompt() {
  const { t } = useTranslation(['settings', 'common'])
  const toastIdRef = useRef(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        // Periodic check for SW update every hour
        setInterval(() => {
          r.update?.().catch(() => {})
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('PWA service worker registration error:', error)
    },
  })

  useEffect(() => {
    if (needRefresh && !toastIdRef.current) {
      toastIdRef.current = toast(
        t('settings:newVersionAvailable', 'A new version is available'),
        {
          action: {
            label: t('settings:reload', 'Reload'),
            onClick: () => {
              updateServiceWorker(true)
            },
          },
          duration: Infinity,
          onDismiss: () => {
            setNeedRefresh(false)
            toastIdRef.current = null
          },
        },
      )
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker, t])

  return null
}
