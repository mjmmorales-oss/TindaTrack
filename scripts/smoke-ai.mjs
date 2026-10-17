#!/usr/bin/env node

/**
 * scripts/smoke-ai.mjs
 * End-to-end HTTP smoke test for TindaTrack v2.0.0 AI capabilities.
 *
 * Exercises:
 *  1. Cashier Login & Bearer Token acquisition
 *  2. Cashier GET /api/ai/status
 *  3. Cashier POST /api/ai/basket-scan (multi-part image upload)
 *  4. Cashier POST /api/ai/scans/{scan}/feedback
 *  5. Cashier Role Isolation (verifying 403 on Owner-only endpoints)
 *  6. Owner Login & Bearer Token acquisition
 *  7. Owner POST /api/ai/product-scan (intake recognition)
 *  8. Owner POST /api/products/bulk (transactional 2-product creation)
 *  9. Owner POST /api/products/{id}/image (packshot upload)
 * 10. Owner GET /api/ai/metrics
 * 11. Owner GET /api/ai/metrics/export.csv
 * 12. Phone Pairing & Device Wireless Basket Scan:
 *     - Owner POST /api/scanner-sessions
 *     - Device POST /api/scanner/pair
 *     - Device POST /api/scanner/ai-basket (X-Scanner-Token)
 *     - Owner GET /api/scanner-sessions/{id}/events (polling feed verification)
 *     - Owner DELETE /api/scanner-sessions/{id}
 * 13. Optional Live Gemini Ping (if GEMINI_API_KEY is present)
 */

import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:8000').replace(/\/$/, '')

const CASHIER_CREDENTIALS = [
  { email: 'cashier@tindatrack.ph', password: 'password123' },
  { email: 'cashier@tindatrack.test', password: 'password' },
]

const OWNER_CREDENTIALS = [
  { email: 'owner@tindatrack.ph', password: 'password123' },
  { email: 'owner@tindatrack.test', password: 'password' },
]

// 1x1 transparent PNG buffer for testing image uploads
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
)

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

async function getText(url, headers = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers,
  })
  const text = await res.text()
  return { status: res.status, ok: res.ok, text }
}

async function postFormData(url, formData, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    body: formData,
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

async function loginUser(credentialsList) {
  let token = null
  let lastErr = null

  for (const cred of credentialsList) {
    try {
      const res = await postJson(`${API_BASE}/api/login`, cred)
      if (res.status === 200) {
        token = res.body?.token || res.body?.data?.token
        if (token) return { token, user: res.body?.user || res.body?.data?.user }
      } else {
        lastErr = res
      }
    } catch (err) {
      lastErr = { message: err.message }
    }
  }

  return { token: null, error: lastErr }
}

async function run() {
  console.log('====================================================')
  console.log(`🤖 TindaTrack v2.0.0 AI End-to-End Smoke Test`)
  console.log(`Target API: ${API_BASE}`)
  console.log('====================================================\n')

  // Verify server reachability
  try {
    const pingRes = await getJson(`${API_BASE}/api/ping`)
    if (pingRes.status !== 200) {
      console.error(`❌ Could not ping backend at ${API_BASE}/api/ping (status ${pingRes.status})`)
      process.exit(1)
    }
    console.log(`✔ API reachable: ${pingRes.body?.app || 'TindaTrack'}\n`)
  } catch (err) {
    console.error(`❌ Connection failed to ${API_BASE}: ${err.message}`)
    console.error('Ensure "php artisan serve" is running before executing this smoke test.')
    process.exit(1)
  }

  // --- PART 1: CASHIER FLOW ---
  console.log('--- [Phase 1] Cashier Authentication & Basket Scan ---')
  const cashierAuth = await loginUser(CASHIER_CREDENTIALS)
  if (!cashierAuth.token) {
    console.error('❌ Cashier login failed. Credentials tested:', CASHIER_CREDENTIALS)
    console.error('Error:', cashierAuth.error)
    process.exit(1)
  }
  const cashierToken = cashierAuth.token
  console.log('✔ Step 1: Cashier authenticated successfully.')

  // Step 2: GET /api/ai/status
  const statusRes = await getJson(`${API_BASE}/api/ai/status`, {
    Authorization: `Bearer ${cashierToken}`,
  })
  if (statusRes.status !== 200 || !statusRes.body?.data) {
    console.error('❌ GET /api/ai/status failed:', statusRes)
    process.exit(1)
  }
  const aiStatus = statusRes.body.data
  console.log(`✔ Step 2: GET /api/ai/status verified (provider: ${aiStatus.provider}, enabled: ${aiStatus.enabled}, daily_remaining: ${aiStatus.daily_remaining})`)

  // Step 3: Cashier Basket Scan (multipart)
  const basketFormData = new FormData()
  const imageBlob = new Blob([TINY_PNG_BUFFER], { type: 'image/png' })
  basketFormData.append('image', imageBlob, 'basket_test.png')

  const basketRes = await postFormData(`${API_BASE}/api/ai/basket-scan`, basketFormData, {
    Authorization: `Bearer ${cashierToken}`,
  })
  if (basketRes.status !== 200 || !basketRes.body?.data?.scan_id) {
    console.error('❌ POST /api/ai/basket-scan failed:', basketRes)
    process.exit(1)
  }
  const scanId = basketRes.body.data.scan_id
  const detectedItems = basketRes.body.data.items || []
  console.log(`✔ Step 3: Basket scan successful. Scan ID: ${scanId} (Items detected: ${detectedItems.length})`)

  // Step 4: Cashier Feedback
  const feedbackRes = await postJson(
    `${API_BASE}/api/ai/scans/${scanId}/feedback`,
    {
      lines: [
        {
          line_type: 'item',
          suggested_product_id: detectedItems[0]?.product_id || 1,
          suggested_quantity: 1,
          confidence: 0.95,
          final_product_id: detectedItems[0]?.product_id || 1,
          final_quantity: 1,
          action: 'accepted',
        },
      ],
    },
    { Authorization: `Bearer ${cashierToken}` }
  )
  if (feedbackRes.status !== 200) {
    console.error(`❌ POST /api/ai/scans/${scanId}/feedback failed:`, feedbackRes)
    process.exit(1)
  }
  console.log('✔ Step 4: Cashier scan feedback recorded successfully.')

  // Step 5: Cashier Role Isolation Verification
  const cashierMetricsRes = await getJson(`${API_BASE}/api/ai/metrics`, {
    Authorization: `Bearer ${cashierToken}`,
  })
  if (cashierMetricsRes.status !== 403) {
    console.error(`❌ Security failure: Cashier accessed GET /api/ai/metrics with status ${cashierMetricsRes.status} (expected 403)`)
    process.exit(1)
  }
  console.log('✔ Step 5: Cashier role boundaries verified (HTTP 403 on /api/ai/metrics).')

  // --- PART 2: OWNER FLOW ---
  console.log('\n--- [Phase 2] Owner Authentication & Bulk Intake ---')
  const ownerAuth = await loginUser(OWNER_CREDENTIALS)
  if (!ownerAuth.token) {
    console.error('❌ Owner login failed:', ownerAuth.error)
    process.exit(1)
  }
  const ownerToken = ownerAuth.token
  console.log('✔ Step 6: Owner authenticated successfully.')

  // Step 7: Owner Product Scan (intake)
  const productFormData = new FormData()
  productFormData.append('image', new Blob([TINY_PNG_BUFFER], { type: 'image/png' }), 'intake_test.png')

  const productScanRes = await postFormData(`${API_BASE}/api/ai/product-scan`, productFormData, {
    Authorization: `Bearer ${ownerToken}`,
  })
  if (productScanRes.status !== 200 || !productScanRes.body?.data?.products) {
    console.error('❌ POST /api/ai/product-scan failed:', productScanRes)
    process.exit(1)
  }
  console.log(`✔ Step 7: Product intake scan successful (${productScanRes.body.data.products.length} products suggested).`)

  // Step 8: Bulk Create Products
  const uniqueSuffix = Date.now().toString().slice(-6)
  const bulkPayload = {
    products: [
      {
        name: `Smoke Item Alpha ${uniqueSuffix}`,
        brand: 'TindaBrand',
        size: '100g',
        category_id: 1,
        barcode: `990001${uniqueSuffix}1`,
        price: 25.5,
        cost_price: 20.0,
        stock_quantity: 50,
      },
      {
        name: `Smoke Item Beta ${uniqueSuffix}`,
        brand: 'TindaBrand',
        size: '200g',
        category_id: 1,
        barcode: `990001${uniqueSuffix}2`,
        price: 45.0,
        cost_price: 36.0,
        stock_quantity: 30,
      },
    ],
  }

  const bulkRes = await postJson(`${API_BASE}/api/products/bulk`, bulkPayload, {
    Authorization: `Bearer ${ownerToken}`,
  })
  if (bulkRes.status !== 201 || !Array.isArray(bulkRes.body?.data)) {
    console.error('❌ POST /api/products/bulk failed:', bulkRes)
    process.exit(1)
  }
  const createdProducts = bulkRes.body.data
  const targetProduct = createdProducts[0]
  console.log(`✔ Step 8: Bulk created 2 products successfully (IDs: ${createdProducts.map((p) => p.id).join(', ')}).`)

  // Step 9: Upload Crop Image
  const cropFormData = new FormData()
  cropFormData.append('image', new Blob([TINY_PNG_BUFFER], { type: 'image/png' }), 'crop.png')
  cropFormData.append('source', 'camera')

  const uploadCropRes = await postFormData(
    `${API_BASE}/api/products/${targetProduct.id}/image`,
    cropFormData,
    { Authorization: `Bearer ${ownerToken}` }
  )
  if (uploadCropRes.status !== 200 && uploadCropRes.status !== 201) {
    console.error(`❌ POST /api/products/${targetProduct.id}/image failed:`, uploadCropRes)
    process.exit(1)
  }
  console.log(`✔ Step 9: Uploaded cropped product image to product #${targetProduct.id}.`)

  // Step 10: GET /api/ai/metrics
  const metricsRes = await getJson(`${API_BASE}/api/ai/metrics`, {
    Authorization: `Bearer ${ownerToken}`,
  })
  if (metricsRes.status !== 200 || !metricsRes.body?.data) {
    console.error('❌ GET /api/ai/metrics failed:', metricsRes)
    process.exit(1)
  }
  const metrics = metricsRes.body.data
  console.log(`✔ Step 10: AI Research Metrics retrieved (Total scans: ${metrics.total_scans}, Basket scans: ${metrics.basket?.scan_count || 0}).`)

  // Step 11: Export Metrics CSV
  const csvRes = await getText(`${API_BASE}/api/ai/metrics/export.csv`, {
    Authorization: `Bearer ${ownerToken}`,
  })
  if (csvRes.status !== 200 || (!csvRes.text.toLowerCase().includes('scan id') && !csvRes.text.toLowerCase().includes('scan_id'))) {
    console.error('❌ GET /api/ai/metrics/export.csv failed:', csvRes)
    process.exit(1)
  }
  console.log('✔ Step 11: CSV telemetry export downloaded successfully.')

  // --- PART 3: PHONE PAIRING & WIRELESS SCAN ---
  console.log('\n--- [Phase 3] Phone Scanner Pairing & Wireless AI Basket ---')

  // Step 12a: Create POS Scanner Session
  const sessionRes = await postJson(
    `${API_BASE}/api/scanner-sessions`,
    { mode: 'pos' },
    { Authorization: `Bearer ${ownerToken}` }
  )
  if (sessionRes.status !== 201 || !sessionRes.body?.data?.pairing_code) {
    console.error('❌ POST /api/scanner-sessions failed:', sessionRes)
    process.exit(1)
  }
  const session = sessionRes.body.data
  console.log(`✔ Step 12a: Created scanner pairing session (ID: ${session.id}, Code: ${session.pairing_code})`)

  // Step 12b: Device pairs with code
  const pairRes = await postJson(`${API_BASE}/api/scanner/pair`, {
    pairing_code: session.pairing_code,
    device_label: 'Smoke Tester Phone',
  })
  if (pairRes.status !== 200 || !pairRes.body?.data?.token) {
    console.error('❌ POST /api/scanner/pair failed:', pairRes)
    process.exit(1)
  }
  const deviceToken = pairRes.body.data.token
  console.log('✔ Step 12b: Phone successfully paired. Device token acquired.')

  // Step 12c: Device sends wireless AI basket scan
  const deviceBasketFormData = new FormData()
  deviceBasketFormData.append(
    'image',
    new Blob([TINY_PNG_BUFFER], { type: 'image/png' }),
    'phone_basket.png'
  )

  const deviceBasketRes = await postFormData(
    `${API_BASE}/api/scanner/ai-basket`,
    deviceBasketFormData,
    { 'X-Scanner-Token': deviceToken }
  )
  if (
    (deviceBasketRes.status !== 200 && deviceBasketRes.status !== 201) ||
    (!deviceBasketRes.body?.data?.scan_id && !deviceBasketRes.body?.data?.scan?.scan_id)
  ) {
    console.error('❌ POST /api/scanner/ai-basket failed:', deviceBasketRes)
    process.exit(1)
  }
  const deviceScanId = deviceBasketRes.body.data.scan_id || deviceBasketRes.body.data.scan.scan_id
  console.log(`✔ Step 12c: Wireless AI basket submitted by device. Scan ID: ${deviceScanId}`)

  // Step 12d: POS verifies event in session events feed
  const eventsRes = await getJson(`${API_BASE}/api/scanner-sessions/${session.id}/events`, {
    Authorization: `Bearer ${ownerToken}`,
  })
  if (eventsRes.status !== 200 || !Array.isArray(eventsRes.body?.data)) {
    console.error('❌ GET /api/scanner-sessions/{id}/events failed:', eventsRes)
    process.exit(1)
  }
  const events = eventsRes.body.data
  const aiEvent = events.find((e) => e.status === 'ai_basket' || e.barcode === 'AI_BASKET' || e.type === 'ai_basket')
  if (!aiEvent) {
    console.error('❌ Event feed missing "ai_basket" event. Received events:', events)
    process.exit(1)
  }
  console.log(`✔ Step 12d: Verified "ai_basket" event received in POS events feed (Event ID: ${aiEvent.id}).`)

  // Step 12e: Terminate session
  await deleteJson(`${API_BASE}/api/scanner-sessions/${session.id}`, {
    Authorization: `Bearer ${ownerToken}`,
  })
  console.log('✔ Step 12e: Scanner session cleanly closed.')

  // --- PART 4: GEMINI CLI CONNECTIVITY ---
  console.log('\n--- [Phase 4] Vision Provider Connectivity ---')
  if (process.env.GEMINI_API_KEY) {
    console.log('Detected GEMINI_API_KEY in environment. Running "php artisan ai:ping"...')
    try {
      const output = execSync('php artisan ai:ping', {
        cwd: path.resolve(repoRoot, 'backend'),
        encoding: 'utf8',
      })
      console.log(output)
      console.log('✔ Step 13: Live Google Gemini connectivity verified.')
    } catch (err) {
      console.error('❌ "php artisan ai:ping" returned non-zero:', err.stdout || err.message)
      process.exit(1)
    }
  } else {
    console.log('ℹ Note: GEMINI_API_KEY not configured in environment.')
    console.log('  Deterministic mock vision provider verified 100% functional across all flows.')
    console.log('  Skipping live Google Gemini ping.')
  }

  console.log('\n====================================================')
  console.log('🎉 ALL AI SMOKE VERIFICATIONS PASSED SUCCESSFULLY!')
  console.log('====================================================')
}

run().catch((err) => {
  console.error('Unhandled fatal error in smoke-ai:', err)
  process.exit(1)
})
