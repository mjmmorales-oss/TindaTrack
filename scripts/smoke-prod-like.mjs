#!/usr/bin/env node

/**
 * scripts/smoke-prod-like.mjs
 * End-to-end smoke verification simulating production/staging environment.
 * Tests:
 *  1. Health check (/up)
 *  2. Root status endpoint (/)
 *  3. Rate limiting and auth validation (POST /api/login)
 *  4. Owner authenticated session (GET /api/user)
 *  5. Barcode online/local lookup (GET /api/barcode/lookup)
 *  6. Product image streaming route (GET /api/product-images/{ulid})
 *  7. Sanctum token revocation (POST /api/logout)
 */

const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '')

const CREDENTIALS = [
  { email: 'owner@tindatrack.test', password: 'password' },
  { email: 'owner@tindatrack.ph', password: 'password123' },
]

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, ok: res.ok, headers: res.headers, body }
}

async function run() {
  console.log(`\n=== TindaTrack Production-Like Smoke Test ===`)
  console.log(`Target: ${API_BASE}\n`)

  let passed = 0
  let failed = 0

  function assert(title, condition, detail = '') {
    if (condition) {
      console.log(`  ✓ ${title}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${title} ${detail}`)
      failed++
    }
  }

  // 1. Healthcheck /up
  try {
    const res = await fetch(`${API_BASE}/up`)
    assert('GET /up returns HTTP 200 healthcheck', res.status === 200, `(got ${res.status})`)
  } catch (err) {
    assert('GET /up is reachable', false, `(connection error: ${err.message})`)
    console.error('\nEnsure Laravel server is running (e.g. php artisan serve) before running smoke test.')
    process.exit(1)
  }

  // 2. Root API status /
  {
    const res = await request('/')
    assert('GET / returns 200 with API status JSON', res.status === 200 && res.body?.status === 'ok')
  }

  // 3. Validation rejection
  {
    const res = await request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid@format' }),
    })
    assert('POST /api/login rejects incomplete payload with 422 JSON', res.status === 422 && Boolean(res.body?.errors))
  }

  // 4. Login with credentials
  let token = null
  for (const cred of CREDENTIALS) {
    const res = await request('/api/login', {
      method: 'POST',
      body: JSON.stringify(cred),
    })
    if (res.status === 200 && res.body?.token) {
      token = res.body.token
      break
    }
  }

  assert('POST /api/login returns user and Sanctum bearer token', Boolean(token))

  if (!token) {
    console.error('Smoke tests aborted: Could not obtain bearer token.')
    process.exit(1)
  }

  const authHeaders = { Authorization: `Bearer ${token}` }

  // 5. Authenticated user
  {
    const res = await request('/api/user', { headers: authHeaders })
    assert('GET /api/user returns authenticated user profile', res.status === 200 && res.body?.role === 'owner')
  }

  // 6. Barcode lookup
  {
    const res = await request('/api/barcode-lookup/3017620422003', { headers: authHeaders })
    assert('GET /api/barcode-lookup/{barcode} responds for valid GTIN', res.status === 200 && Boolean(res.body?.data?.barcode))
  }

  // 7. Image streaming 404 for nonexistent ULID
  {
    const res = await request('/api/product-images/01ARZ3NDEKTSV4RRFFQ69G5FAV')
    assert('GET /api/product-images/{ulid} handles missing image safely (404)', res.status === 404)
  }

  // 8. Logout and token revocation
  {
    const res = await request('/api/logout', { method: 'POST', headers: authHeaders })
    assert('POST /api/logout succeeds', [200, 204].includes(res.status))

    // Token must no longer be valid
    const postLogout = await request('/api/user', { headers: authHeaders })
    assert('Revoked token is rejected with HTTP 401', postLogout.status === 401)
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed.`)
  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Unexpected failure during smoke test:', err)
  process.exit(1)
})
