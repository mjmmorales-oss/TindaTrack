import { Barcode } from '@/lib/barcode'
import { useMockDb } from '@/mocks/db'
import { ApiError, delay } from '@/lib/mockApi'

const SESSIONS_STORAGE_KEY = 'tindatrack_mock_scanner_sessions'
const SCANNER_TOKEN_KEY = 'tt_scanner_token'

function getBroadcastChannel() {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      return new BroadcastChannel('tt-scanner')
    } catch {
      return null
    }
  }
  return null
}

const bc = getBroadcastChannel()

function broadcastMessage(type, payload) {
  if (bc) {
    try {
      bc.postMessage({ type, payload, timestamp: Date.now() })
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        'tt-scanner-event',
        JSON.stringify({ type, payload, timestamp: Date.now() }),
      )
    } catch {
      // ignore
    }
  }
}

function loadSessions() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSessions(sessions) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // ignore
  }
}

function generatePairingCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let p1 = ''
  let p2 = ''
  for (let i = 0; i < 4; i++) {
    p1 += chars[Math.floor(Math.random() * chars.length)]
    p2 += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${p1}-${p2}`
}

let nextEventId = 1000

export const scannerService = {
  // Authenticated endpoints
  async createScannerSession(data = { mode: 'pos' }) {
    await delay(100)
    const mode = data?.mode || 'pos'
    const id = '01' + Math.random().toString(36).substring(2, 10).toUpperCase()
    const now = new Date()
    const pairingExpiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString()
    const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
    const pairingCode = generatePairingCode()

    const sessions = loadSessions()
    // End existing sessions of same mode
    sessions.forEach((s) => {
      if (s.mode === mode && !s.ended_at) {
        s.ended_at = now.toISOString()
      }
    })

    const newSession = {
      id,
      mode,
      pairing_code: pairingCode,
      pairing_expires_at: pairingExpiresAt,
      expires_at: expiresAt,
      device_token: null,
      device_label: null,
      paired_at: null,
      last_seen_at: null,
      ended_at: null,
      events: [],
    }

    sessions.push(newSession)
    saveSessions(sessions)

    return {
      id,
      pairing_code: pairingCode,
      pairing_expires_at: pairingExpiresAt,
      expires_at: expiresAt,
      mode,
    }
  },

  async getScannerSession(id) {
    await delay(60)
    const sessions = loadSessions()
    const session = sessions.find((s) => s.id === id)
    if (!session) {
      throw new ApiError(404, { message: 'Scanner session not found.' })
    }

    const isOnline = Boolean(
      session.last_seen_at &&
        Date.now() - new Date(session.last_seen_at).getTime() < 20000,
    )

    return {
      id: session.id,
      paired: Boolean(session.paired_at),
      device_label: session.device_label || null,
      last_seen_at: session.last_seen_at || null,
      online: isOnline,
      ended_at: session.ended_at || null,
      mode: session.mode,
    }
  },

  async listScannerEvents(id, after = 0) {
    await delay(40)
    const sessions = loadSessions()
    const session = sessions.find((s) => s.id === id)
    if (!session) {
      throw new ApiError(404, { message: 'Scanner session not found.' })
    }
    if (session.ended_at) {
      throw new ApiError(401, { message: 'Scanner session ended' })
    }

    const minId = Number(after) || 0
    const filtered = (session.events || [])
      .filter((e) => e.id > minId)
      .slice(0, 50)

    return filtered
  },

  async endScannerSession(id) {
    await delay(60)
    const sessions = loadSessions()
    const session = sessions.find((s) => s.id === id)
    if (session) {
      session.ended_at = new Date().toISOString()
      saveSessions(sessions)
      broadcastMessage('ended', { sessionId: id })
    }
    return { message: 'Scanner session ended' }
  },

  async getUnknownBarcodes() {
    await delay(80)
    const sessions = loadSessions()
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000

    const map = new Map()
    for (const session of sessions) {
      for (const e of session.events || []) {
        if (
          e.status === 'unknown' &&
          !e.resolved_at &&
          new Date(e.created_at).getTime() >= cutoff
        ) {
          const prev = map.get(e.barcode) || { count: 0, last_seen_at: e.created_at }
          const latest =
            new Date(e.created_at) > new Date(prev.last_seen_at)
              ? e.created_at
              : prev.last_seen_at
          map.set(e.barcode, { count: prev.count + 1, last_seen_at: latest })
        }
      }
    }

    const list = Array.from(map.entries()).map(([barcode, val]) => ({
      barcode,
      count: val.count,
      last_seen_at: val.last_seen_at,
    }))

    return list.sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at))
  },

  // Device endpoints
  async pairScanner(data) {
    await delay(120)
    const code = (data?.pairing_code || '').trim().toUpperCase()
    const label = data?.device_label || 'Phone'

    const clean = code.replace(/[-\s]/g, '').toUpperCase()
    const normalizedCode = clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4, 8)}` : code

    const sessions = loadSessions()
    const session = sessions.find((s) => s.pairing_code === normalizedCode)

    if (!session) {
      throw new ApiError(422, {
        reason: 'not_found',
        message: 'Pairing code not found. Please verify the code from the POS.',
        errors: { pairing_code: ['Pairing code not found.'] },
      })
    }

    if (session.paired_at) {
      throw new ApiError(422, {
        reason: 'used',
        message: 'This pairing code has already been used. Please request a new code from the POS.',
        errors: { pairing_code: ['This pairing code has already been used.'] },
      })
    }

    if (session.ended_at || new Date() > new Date(session.pairing_expires_at)) {
      throw new ApiError(422, {
        reason: 'expired',
        message: 'Pairing code has expired. Please request a new code from the POS.',
        errors: { pairing_code: ['Pairing code has expired.'] },
      })
    }

    const token = 'mock_dev_' + Math.random().toString(36).substring(2) + Date.now()
    session.device_token = token
    session.device_label = label
    session.paired_at = new Date().toISOString()
    session.last_seen_at = new Date().toISOString()
    saveSessions(sessions)

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SCANNER_TOKEN_KEY, token)
    }

    broadcastMessage('paired', { sessionId: session.id, device_label: label })

    return {
      token,
      session: {
        id: session.id,
        mode: session.mode,
        expires_at: session.expires_at,
      },
      store_name: 'Tindahan ni Aling Nena',
      user_name: 'Aling Nena',
    }
  },

  async sendScan(data) {
    await delay(60)
    const rawBarcode = data?.barcode || ''
    const quantity = Number(data?.quantity) || 1
    const normalized = Barcode.normalize(rawBarcode)

    if (!Barcode.isAcceptable(normalized)) {
      throw new ApiError(422, {
        message: 'Invalid barcode format.',
        errors: { barcode: ['Invalid barcode format.'] },
      })
    }

    const token =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(SCANNER_TOKEN_KEY)
        : null

    const sessions = loadSessions()
    const session = sessions.find((s) => s.device_token === token)

    if (!session || session.ended_at) {
      throw new ApiError(401, { message: 'Scanner session ended' })
    }

    session.last_seen_at = new Date().toISOString()

    // Resolve local product
    const { products } = useMockDb.getState()
    const product = (products || []).find((p) => p.is_active && p.barcode === normalized)

    let status = 'unknown'
    let payload = null

    if (product) {
      const stock = Number(product.stock_quantity ?? product.stock ?? 0)
      status = stock > 0 ? 'found' : 'out_of_stock'
      payload = {
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        stock,
        image_url: product.image_url || null,
      }
    }

    const event = {
      id: ++nextEventId,
      scanner_session_id: session.id,
      barcode: normalized,
      status,
      product_id: product?.id || null,
      quantity,
      payload,
      created_at: new Date().toISOString(),
      resolved_at: null,
    }

    session.events.push(event)
    saveSessions(sessions)

    broadcastMessage('scanned', { sessionId: session.id, event })

    return {
      event_id: event.id,
      status: event.status,
      product: payload,
    }
  },

  async scannerHeartbeat() {
    await delay(40)
    const token =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(SCANNER_TOKEN_KEY)
        : null

    const sessions = loadSessions()
    const session = sessions.find((s) => s.device_token === token)

    if (!session || session.ended_at) {
      throw new ApiError(401, { message: 'Scanner session ended' })
    }

    session.last_seen_at = new Date().toISOString()
    saveSessions(sessions)

    return { ended: false }
  },

  async sendAiBasket(imageBlob, options = {}) {
    await delay(250)
    const token =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(SCANNER_TOKEN_KEY)
        : null

    const sessions = loadSessions()
    const session = sessions.find((s) => s.device_token === token)

    if (!session || session.ended_at) {
      throw new ApiError(401, { message: 'Scanner session ended' })
    }

    session.last_seen_at = new Date().toISOString()

    const { aiService } = await import('./aiService.js')
    const result = await aiService.basketScan(imageBlob, options)

    const event = {
      id: ++nextEventId,
      scanner_session_id: session.id,
      type: 'ai_basket',
      status: 'found',
      quantity: result.matched_count || 1,
      payload: result,
      created_at: new Date().toISOString(),
      resolved_at: null,
    }

    session.events.push(event)
    saveSessions(sessions)

    broadcastMessage('ai_basket', { sessionId: session.id, event, result })

    return result
  },
}

export default scannerService
