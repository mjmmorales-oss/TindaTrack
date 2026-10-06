import { useEffect } from 'react'

/**
 * Set document title with app name suffix.
 * @param {string} title
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    const appName = import.meta.env.VITE_APP_NAME || 'TindaTrack'
    if (title) {
      document.title = `${title} · ${appName}`
    } else {
      document.title = appName
    }
  }, [title])
}
