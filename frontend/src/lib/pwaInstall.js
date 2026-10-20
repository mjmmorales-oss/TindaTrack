/**
 * Captures the browser's one-shot `beforeinstallprompt` event at startup.
 *
 * Chromium fires it once per page load. Components that mount later (Settings
 * → Install App after in-app navigation) used to miss it, so the button did
 * nothing. Every usePwaInstall() instance now shares this captured event.
 */
let deferredPrompt = null
let initialized = false
const listeners = new Set()

function emit() {
  listeners.forEach((cb) => cb(deferredPrompt))
}

export function initPwaInstallCapture() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit()
  })
}

export function getDeferredInstallPrompt() {
  return deferredPrompt
}

/** The prompt can be used once; forget it afterwards. */
export function clearDeferredInstallPrompt() {
  deferredPrompt = null
  emit()
}

/**
 * @param {(prompt: Event|null) => void} cb
 * @returns {() => void} unsubscribe
 */
export function subscribeInstallPrompt(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
