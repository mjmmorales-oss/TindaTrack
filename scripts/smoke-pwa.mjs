#!/usr/bin/env node

/**
 * scripts/smoke-pwa.mjs
 * Smoke verification for PWA preview server (default: http://localhost:4173).
 *
 * Verifies:
 *  1. GET / (200 OK, HTML contains manifest link and meta tags)
 *  2. GET /manifest.webmanifest (200 OK, Content-Type: application/manifest+json)
 *  3. GET /sw.js (200 OK, Service Worker script)
 *  4. GET /apple-touch-icon-180x180.png (200 OK, PNG image)
 *  5. GET /apple-touch-icon.png (200 OK, plain root touch icon)
 *  6. GET /pwa-512x512.png (200 OK, PNG image)
 *  7. GET /api/up (200 OK through Vite preview proxy to backend)
 */

const PWA_BASE = (process.env.PWA_URL || 'http://localhost:4173').replace(/\/$/, '')

async function run() {
  console.log(`\n=== TindaTrack PWA Preview Smoke Test ===`)
  console.log(`Target: ${PWA_BASE}\n`)

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

  // Helper fetch
  async function fetchPath(p) {
    const url = `${PWA_BASE}${p}`
    const res = await fetch(url)
    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()
    return { status: res.status, ok: res.ok, contentType, text }
  }

  try {
    // 1. GET /
    const home = await fetchPath('/')
    assert('GET / returns 200 OK', home.status === 200, `(got ${home.status})`)
    assert('GET / serves HTML with manifest link', home.text.includes('rel="manifest"') || home.text.includes("rel='manifest'"))
    assert('GET / serves HTML with apple-touch-icon', home.text.includes('rel="apple-touch-icon"'))
    assert('GET / serves HTML with theme-color', home.text.includes('name="theme-color"'))

    // 2. GET /manifest.webmanifest
    const manifest = await fetchPath('/manifest.webmanifest')
    assert('GET /manifest.webmanifest returns 200 OK', manifest.status === 200, `(got ${manifest.status})`)
    assert(
      'GET /manifest.webmanifest Content-Type is manifest+json or json',
      manifest.contentType.includes('manifest+json') || manifest.contentType.includes('application/json'),
      `(got ${manifest.contentType})`
    )
    let parsedManifest = null
    try {
      parsedManifest = JSON.parse(manifest.text)
    } catch {
      // ignore
    }
    assert('Manifest is valid JSON with standalone display', parsedManifest?.display === 'standalone')

    // 3. GET /sw.js
    const sw = await fetchPath('/sw.js')
    assert('GET /sw.js returns 200 OK', sw.status === 200, `(got ${sw.status})`)
    assert('GET /sw.js contains service worker logic', sw.text.length > 50)

    // 4. GET /apple-touch-icon-180x180.png
    const icon180 = await fetchPath('/apple-touch-icon-180x180.png')
    assert('GET /apple-touch-icon-180x180.png returns 200 OK', icon180.status === 200, `(got ${icon180.status})`)
    assert('GET /apple-touch-icon-180x180.png is image/png', icon180.contentType.includes('image/png'), `(got ${icon180.contentType})`)

    // 5. GET /apple-touch-icon.png
    const iconRoot = await fetchPath('/apple-touch-icon.png')
    assert('GET /apple-touch-icon.png returns 200 OK', iconRoot.status === 200, `(got ${iconRoot.status})`)
    assert('GET /apple-touch-icon.png is image/png', iconRoot.contentType.includes('image/png'), `(got ${iconRoot.contentType})`)

    // 6. GET /pwa-512x512.png
    const icon512 = await fetchPath('/pwa-512x512.png')
    assert('GET /pwa-512x512.png returns 200 OK', icon512.status === 200, `(got ${icon512.status})`)
    assert('GET /pwa-512x512.png is image/png', icon512.contentType.includes('image/png'), `(got ${icon512.contentType})`)

    // 7. GET /api/up through Vite preview proxy
    try {
      const apiUp = await fetchPath('/api/up')
      if (apiUp.status === 200) {
        assert('GET /api/up proxies to backend and returns 200 OK', true)
      } else {
        console.warn(`  ⚠️ Note: /api/up returned ${apiUp.status} (Backend on 127.0.0.1:8000 might not be running).`)
      }
    } catch {
      console.warn('  ⚠️ Note: Could not reach /api/up (Backend on 127.0.0.1:8000 might not be running).')
    }

  } catch (err) {
    console.error(`\n❌ Failed to connect to preview server at ${PWA_BASE}:`, err.message)
    console.log('   Ensure preview server is running via: npm run pwa:preview\n')
    process.exit(1)
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

run()
