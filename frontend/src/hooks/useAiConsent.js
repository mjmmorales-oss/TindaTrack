import { useContext, useState, useCallback, useEffect } from 'react'
import { AuthContext } from '@/context/AuthContext'

const CONSENT_STORAGE_PREFIX = 'tt_ai_consent_'

/**
 * Hook to manage per-user AI first-use privacy consent.
 *
 * Checks and stores consent status in localStorage keyed by user id.
 * Exposes withConsent() to guard AI scan triggers (opening camera or basket intake).
 *
 * @returns {{
 *   hasConsent: boolean,
 *   isConsentOpen: boolean,
 *   setIsConsentOpen: (open: boolean) => void,
 *   acceptConsent: () => void,
 *   declineConsent: () => void,
 *   withConsent: (action: () => void) => void,
 * }}
 */
export function useAiConsent() {
  const auth = useContext(AuthContext)
  const user = auth?.user
  const storageKey = `${CONSENT_STORAGE_PREFIX}${user?.id || 'default'}`

  const [hasConsent, setHasConsent] = useState(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false
      return window.localStorage.getItem(storageKey) === 'true'
    } catch {
      return false
    }
  })

  // Synchronize state if storageKey changes (e.g. user switch)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        setHasConsent(window.localStorage.getItem(storageKey) === 'true')
      }
    } catch {
      setHasConsent(false)
    }
  }, [storageKey])

  const [isConsentOpen, setIsConsentOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const acceptConsent = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(storageKey, 'true')
      }
    } catch {
      // ignore storage quota errors
    }
    setHasConsent(true)
    setIsConsentOpen(false)

    if (typeof pendingAction === 'function') {
      const next = pendingAction
      setPendingAction(null)
      next()
    }
  }, [storageKey, pendingAction])

  const declineConsent = useCallback(() => {
    setIsConsentOpen(false)
    setPendingAction(null)
  }, [])

  const withConsent = useCallback(
    (action) => {
      let isAlreadyConsented = false
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          isAlreadyConsented = window.localStorage.getItem(storageKey) === 'true'
        }
      } catch {
        isAlreadyConsented = false
      }

      if (isAlreadyConsented) {
        setHasConsent(true)
        action?.()
      } else {
        setPendingAction(() => action)
        setIsConsentOpen(true)
      }
    },
    [storageKey],
  )

  return {
    hasConsent,
    isConsentOpen,
    setIsConsentOpen,
    acceptConsent,
    declineConsent,
    withConsent,
  }
}
