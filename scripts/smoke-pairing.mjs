#!/usr/bin/env node

/**
 * scripts/smoke-pairing.mjs
 * Real end-to-end HTTP smoke test for phone scanner pairing.
 * Exercises:
 *  1. Owner login via Sanctum bearer token
 *  2. Scanner session creation (POST /api/scanner-sessions)
 *  3. Device pairing redemption (POST /api/scanner/pair)
 *  4. Device barcode scan (POST /api/scanner/scans)
 *  5. POS terminal event polling (GET /api/scanner-sessions/{id}/events)
 *  6. Session termination (DELETE /api/scanner-sessions/{id})
 *
 * Runs against direct API_BASE (default http://127.0.0.1:8000)
 * and optional PROXY_BASE (e.g. https://127.0.0.1:5173).
 */

const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '')
const PROXY_BASE = (process.env.PROXY_BASE || '').replace(/\/$/, '')

// Disable TLS verification inside this test script only if running against local self-signed Vite HTTPS
if (PROXY_BASE.startsWith('https:')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const OWNER_CREDENTIALS = [
  { email: 'owner@tindatrack.test', password: 'password' },
  { email: 'owner@tindatrack.ph', password: 'password123' },
]

const TEST_BARCODE = '4800016601011'

async function postJson(url, data, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, ok: res.ok, body }
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, ok: res.ok, body }
}

async function deleteJson(url, headers = {}) {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, ok: res.ok, body }
}

async function runPairingFlow(baseLabel, baseUrl) {
  console.log(`\n========================================`)
  console.log(`Running smoke pairing test on: ${baseLabel} (${baseUrl})`)
  console.log(`========================================`)

  // Step 1: Login
  let token = null
  let loginErr = null
  for (const cred of OWNER_CREDENTIALS) {
    try {
      const res = await postJson(`${baseUrl}/api/login`, cred)
      if (res.status === 200) {
        token = res.body?.token || res.body?.data?.token
        if (token) break
      } else {
        loginErr = res
      }
    } catch (err) {
      console.log(`[SKIP] Could not connect to ${baseUrl}: ${err.message}`)
      return { skipped: true, reason: err.message }
    }
  }

  if (!token) {
    console.error(`[FAIL] Login step failed on ${baseLabel}`)
    console.error(`Status: ${loginErr?.status}, Response:`, loginErr?.body)
    return { failed: true, step: 'login', response: loginErr }
  }
  console.log(`✔ Step 1: Owner login successful. Bearer token acquired.`)

  // Step 2: Create scanner session
  const createRes = await postJson(
    `${baseUrl}/api/scanner-sessions`,
    { mode: 'pos' },
    { Authorization: `Bearer ${token}` }
  )

  if (createRes.status !== 201) {
    console.error(`[FAIL] Create scanner session failed on ${baseLabel}`)
    console.error(`Status: ${createRes.status}, Response:`, createRes.body)
    return { failed: true, step: 'create_session', response: createRes }
  }

  const sessionData = createRes.body?.data || createRes.body
  const sessionId = sessionData?.id
  const pairingCode = sessionData?.pairing_code

  if (!sessionId || !pairingCode) {
    console.error(`[FAIL] Response missing id or pairing_code:`, sessionData)
    return { failed: true, step: 'create_session_shape', response: createRes }
  }

  console.log(`✔ Step 2: Session created. ID: ${sessionId}, Code: ${pairingCode}`)

  // Step 3: Pair scanner using code (test lowercase & dashless variant)
  const codeToSubmit = pairingCode.toLowerCase().replace('-', '')
  const pairRes = await postJson(`${baseUrl}/api/scanner/pair`, {
    pairing_code: codeToSubmit,
    device_label: 'Smoke Test Phone',
  })

  if (pairRes.status !== 200) {
    console.error(`[FAIL] Scanner pairing failed on ${baseLabel}`)
    console.error(`Status: ${pairRes.status}, Response:`, pairRes.body)
    return { failed: true, step: 'pair_scanner', response: pairRes }
  }

  const pairPayload = pairRes.body?.data || pairRes.body
  const deviceToken = pairPayload?.token

  if (!deviceToken) {
    console.error(`[FAIL] Pair response missing device token:`, pairPayload)
    return { failed: true, step: 'pair_scanner_shape', response: pairRes }
  }

  console.log(`✔ Step 3: Scanner paired successfully. Device token acquired.`)

  // Step 4: Submit scan with X-Scanner-Token
  const scanRes = await postJson(
    `${baseUrl}/api/scanner/scans`,
    { barcode: TEST_BARCODE, quantity: 1 },
    { 'X-Scanner-Token': deviceToken }
  )

  if (scanRes.status !== 200 && scanRes.status !== 201) {
    console.error(`[FAIL] Submit scan failed on ${baseLabel}`)
    console.error(`Status: ${scanRes.status}, Response:`, scanRes.body)
    return { failed: true, step: 'submit_scan', response: scanRes }
  }

  const scanPayload = scanRes.body?.data || scanRes.body
  console.log(`✔ Step 4: Scan submitted. Status: ${scanPayload?.status}, Event ID: ${scanPayload?.event_id}`)

  // Step 5: Poll events
  const eventsRes = await getJson(
    `${baseUrl}/api/scanner-sessions/${sessionId}/events?after=0`,
    { Authorization: `Bearer ${token}` }
  )

  if (eventsRes.status !== 200) {
    console.error(`[FAIL] Event polling failed on ${baseLabel}`)
    console.error(`Status: ${eventsRes.status}, Response:`, eventsRes.body)
    return { failed: true, step: 'poll_events', response: eventsRes }
  }

  const events = eventsRes.body?.data || eventsRes.body
  if (!Array.isArray(events) || events.length === 0) {
    console.error(`[FAIL] No events returned in session feed:`, events)
    return { failed: true, step: 'poll_events_empty', response: eventsRes }
  }

  console.log(`✔ Step 5: Events polled successfully. Found ${events.length} event(s).`)

  // Step 6: End session
  const endRes = await deleteJson(
    `${baseUrl}/api/scanner-sessions/${sessionId}`,
    { Authorization: `Bearer ${token}` }
  )

  if (endRes.status !== 200) {
    console.error(`[FAIL] End session failed on ${baseLabel}`)
    console.error(`Status: ${endRes.status}, Response:`, endRes.body)
    return { failed: true, step: 'end_session', response: endRes }
  }

  console.log(`✔ Step 6: Session cleanly terminated.`)
  console.log(`🎉 [PASS] Full pairing and scanning flow passed on ${baseLabel}!`)
  return { passed: true }
}

async function main() {
  console.log('--- TindaTrack Phone Pairing Smoke Test ---')

  // Run on direct API_BASE
  const directResult = await runPairingFlow('Direct API', API_BASE)
  if (directResult.failed) {
    process.exit(1)
  }

  // If PROXY_BASE provided, run through Vite proxy
  if (PROXY_BASE) {
    const proxyResult = await runPairingFlow('Vite Reverse Proxy', PROXY_BASE)
    if (proxyResult.failed) {
      process.exit(1)
    }
  }

  console.log('\nAll pairing smoke checks completed successfully.')
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err)
  process.exit(1)
})
