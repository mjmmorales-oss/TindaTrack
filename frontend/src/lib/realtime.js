import { listScannerEvents } from '@/services/scanner.js'
import { TOKEN_KEY } from '@/lib/api.js'

/**
 * Subscribes to live scanner events for a specific scanner session.
 *
 * Supports 'polling' (default) and 'pusher' drivers.
 * In polling mode:
 * - Polls every 1200ms when tab is visible, 5000ms when hidden.
 * - Stops polling after 3 consecutive 401/404 errors.
 * - Guarantees strict ordering and deduplication (tracking lastId).
 *
 * @param {string} sessionId
 * @param {{ onEvent: (event: any) => void }} callbacks
 * @returns {() => void} unsubscribe function
 */
export function subscribeToScanner(sessionId, { onEvent }) {
  if (!sessionId) {
    return () => {}
  }

  const driver = import.meta.env?.VITE_REALTIME_DRIVER || 'polling'
  let lastId = 0
  let consecutiveErrors = 0
  let isSubscribed = true
  let pollTimeoutId = null
  let bc = null
  let echoInstance = null

  // Fast broadcast channel for mock cross-tab responsiveness
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel('tt-scanner')
      bc.onmessage = (msg) => {
        if (!isSubscribed) return
        const data = msg.data
        if (data?.type === 'scanned' && data?.payload?.sessionId === sessionId) {
          const event = data.payload.event
          if (event && event.id > lastId) {
            lastId = event.id
            onEvent?.(event)
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const getPollInterval = (isPusherCatchup = false) => {
    if (isPusherCatchup) return 10000
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return 5000
    }
    return 1200
  }

  async function poll(isPusherCatchup = false) {
    if (!isSubscribed) return

    try {
      const events = await listScannerEvents(sessionId, lastId)
      consecutiveErrors = 0

      if (Array.isArray(events) && events.length > 0) {
        // Sort ascending by ID to ensure strict chronological delivery
        const sorted = [...events].sort((a, b) => a.id - b.id)
        for (const ev of sorted) {
          if (ev.id > lastId) {
            lastId = ev.id
            if (isSubscribed) {
              onEvent?.(ev)
            }
          }
        }
      }
    } catch (err) {
      const status = err?.status ?? err?.response?.status
      if (status === 401 || status === 404) {
        consecutiveErrors++
        if (consecutiveErrors >= 3) {
          isSubscribed = false
          return
        }
      }
    }

    if (isSubscribed) {
      pollTimeoutId = setTimeout(() => poll(isPusherCatchup), getPollInterval(isPusherCatchup))
    }
  }

  function startPolling(isPusherCatchup = false) {
    if (pollTimeoutId) clearTimeout(pollTimeoutId)
    pollTimeoutId = setTimeout(() => poll(isPusherCatchup), getPollInterval(isPusherCatchup))
  }

  const onVisibilityChange = () => {
    if (!isSubscribed) return
    if (document.visibilityState === 'visible') {
      // Trigger immediate check when tab becomes active again
      if (pollTimeoutId) clearTimeout(pollTimeoutId)
      poll(driver === 'pusher' && echoInstance !== null)
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  if (driver === 'pusher') {
    let pusherActive = false

    const initPusher = async () => {
      try {
        const { default: Echo } = await import('laravel-echo')
        const { default: Pusher } = await import('pusher-js')
        if (!isSubscribed) return

        const key = import.meta.env?.VITE_PUSHER_APP_KEY
        const cluster = import.meta.env?.VITE_PUSHER_APP_CLUSTER
        if (!key) {
          throw new Error('VITE_PUSHER_APP_KEY is missing')
        }

        window.Pusher = Pusher
        const apiBase = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api'
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

        echoInstance = new Echo({
          broadcaster: 'pusher',
          key,
          cluster: cluster || 'mt1',
          authEndpoint: `${apiBase}/broadcasting/auth`,
          auth: {
            headers: {
              Accept: 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
          },
        })

        echoInstance
          .private(`scanner-session.${sessionId}`)
          .listen('.scanner.scanned', (e) => {
            if (!isSubscribed) return
            const event = e?.event || e
            if (event && event.id > lastId) {
              lastId = event.id
              onEvent?.(event)
            }
          })

        pusherActive = true
        // Also run slow 10s catch-up polling
        startPolling(true)
      } catch (err) {
        console.warn('Pusher connection failed, falling back to full polling:', err)
        if (isSubscribed) {
          startPolling(false)
        }
      }
    }

    initPusher()
  } else {
    // Start standard polling immediately
    poll(false)
  }

  return () => {
    isSubscribed = false
    if (pollTimeoutId) clearTimeout(pollTimeoutId)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    if (bc) {
      try {
        bc.close()
      } catch {
        // ignore
      }
    }
    if (echoInstance) {
      try {
        echoInstance.leave(`scanner-session.${sessionId}`)
        echoInstance.disconnect()
      } catch {
        // ignore
      }
    }
  }
}

export default subscribeToScanner
