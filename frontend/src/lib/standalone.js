/**
 * Sets data-standalone="true" on <html> when running in standalone PWA / full-screen mode,
 * and keeps it synced on display-mode changes.
 */
export function initStandaloneMode() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const update = () => {
    const isStandalone =
      Boolean(window.navigator?.standalone) ||
      Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches) ||
      Boolean(window.matchMedia?.('(display-mode: fullscreen)')?.matches)

    if (isStandalone) {
      document.documentElement.setAttribute('data-standalone', 'true')
    } else {
      document.documentElement.removeAttribute('data-standalone')
    }
  }

  update()

  const mql = window.matchMedia?.('(display-mode: standalone)')
  if (mql?.addEventListener) {
    mql.addEventListener('change', update)
  } else if (mql?.addListener) {
    mql.addListener(update)
  }
}
