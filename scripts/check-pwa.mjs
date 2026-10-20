#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = fs.existsSync(path.resolve(__dirname, '..', 'frontend', 'dist'))
  ? path.resolve(__dirname, '..')
  : path.resolve(__dirname, '..', '..')

const frontendRoot = path.resolve(repoRoot, 'frontend')
const distDir = path.resolve(frontendRoot, 'dist')
const distIndexHtml = path.resolve(distDir, 'index.html')
const manifestPath = path.resolve(distDir, 'manifest.webmanifest')
const swPath = path.resolve(distDir, 'sw.js')

let errors = 0

function logError(message) {
  console.error(`❌ [check-pwa] ${message}`)
  errors++
}

function logSuccess(message) {
  console.log(`✅ [check-pwa] ${message}`)
}

console.log('--- Running PWA Build & Installation Checks ---')

// 1. Check dist directory
if (!fs.existsSync(distDir)) {
  logError('dist/ directory not found. Please run `npm run build` first.')
  process.exit(1)
}

// 2. Check dist/index.html
if (!fs.existsSync(distIndexHtml)) {
  logError('dist/index.html not found.')
} else {
  const html = fs.readFileSync(distIndexHtml, 'utf8')

  // Manifest link check
  if (!html.includes('rel="manifest"') && !html.includes("rel='manifest'")) {
    logError('dist/index.html is missing <link rel="manifest"> tag.')
  } else {
    logSuccess('dist/index.html contains <link rel="manifest"> tag.')
  }

  // Theme color check
  if (!html.includes('name="theme-color"') && !html.includes("name='theme-color'")) {
    logError('dist/index.html is missing <meta name="theme-color">.')
  } else {
    logSuccess('dist/index.html contains theme-color meta tag.')
  }

  // Apple touch icon link check
  if (!html.includes('rel="apple-touch-icon"')) {
    logError('dist/index.html is missing <link rel="apple-touch-icon">.')
  } else {
    logSuccess('dist/index.html contains apple-touch-icon links.')
  }

  // Apple mobile web app capable
  if (!html.includes('apple-mobile-web-app-capable')) {
    logError('dist/index.html is missing apple-mobile-web-app-capable meta.')
  }
}

// Helper: parse PNG header
function parsePng(filePath) {
  if (!fs.existsSync(filePath)) return null
  const buf = fs.readFileSync(filePath)
  if (buf.length < 26) return null
  const signature = buf.slice(0, 8).toString('hex')
  if (signature !== '89504e470d0a1a0a') return null

  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const bitDepth = buf.readUInt8(24)
  const colorType = buf.readUInt8(25)
  const hasTrns = buf.includes(Buffer.from('tRNS'))

  // Opacity check:
  // colorType 0 = grayscale, 2 = RGB -> 100% opaque without tRNS
  // colorType 3 = indexed palette -> opaque if no tRNS
  // colorType 4, 6 = alpha channel present
  const isOpaque = (colorType === 0 || colorType === 2 || colorType === 3) && !hasTrns

  return { width, height, bitDepth, colorType, hasTrns, isOpaque }
}

// 3. Check manifest.webmanifest
if (!fs.existsSync(manifestPath)) {
  logError('dist/manifest.webmanifest not found.')
} else {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8')
    const manifest = JSON.parse(raw)

    if (manifest.display !== 'standalone') {
      logError(`Manifest display is "${manifest.display}", expected "standalone".`)
    } else {
      logSuccess('Manifest has display: "standalone".')
    }

    if (!manifest.start_url || !manifest.start_url.includes('source=pwa')) {
      logError(`Manifest start_url is "${manifest.start_url}", expected to contain source=pwa.`)
    }

    if (!manifest.id || !manifest.scope) {
      logError('Manifest is missing id or scope.')
    }

    const icons = Array.isArray(manifest.icons) ? manifest.icons : []
    if (icons.length < 4) {
      logError(`Manifest icons count is ${icons.length}, expected at least 4.`)
    }

    const has192 = icons.some((i) => i.sizes === '192x192')
    const has512 = icons.some((i) => i.sizes === '512x512')
    const hasMaskable = icons.some((i) => i.purpose && i.purpose.includes('maskable'))

    if (!has192 || !has512) {
      logError('Manifest is missing required 192x192 or 512x512 icons.')
    }
    if (!hasMaskable) {
      logError('Manifest is missing a maskable icon with purpose: "maskable".')
    }

    // Verify each manifest icon on disk and verify PNG dimensions match declared size
    for (const icon of icons) {
      const cleanSrc = icon.src.replace(/^\//, '')
      let iconPath = path.resolve(distDir, cleanSrc)
      if (!fs.existsSync(iconPath)) {
        iconPath = path.resolve(frontendRoot, 'public', cleanSrc)
      }

      if (!fs.existsSync(iconPath)) {
        logError(`Manifest icon "${icon.src}" does not exist on disk.`)
        continue
      }

      const png = parsePng(iconPath)
      if (!png) {
        logError(`Manifest icon "${icon.src}" is not a valid PNG file.`)
        continue
      }

      const [expectedW, expectedH] = icon.sizes.split('x').map(Number)
      if (png.width !== expectedW || png.height !== expectedH) {
        logError(
          `Icon "${icon.src}" dimensions mismatch: declared ${icon.sizes}, actual PNG is ${png.width}x${png.height}.`,
        )
      }
    }
    logSuccess('All manifest icons exist and PNG header dimensions match declared sizes.')

    // v2.2: an installed PWA on the phone opens straight to the phone scanner
    const shortcuts = Array.isArray(manifest.shortcuts) ? manifest.shortcuts : []
    if (!shortcuts.some((s) => s.url === '/scan')) {
      logError('Manifest is missing the "Phone scanner → /scan" shortcut.')
    } else {
      logSuccess('Manifest has the "Phone scanner → /scan" shortcut.')
    }
  } catch (err) {
    logError(`Failed to parse manifest.webmanifest: ${err.message}`)
  }
}

// 4. Check apple-touch-icon
const appleTouchIcon180 = path.resolve(distDir, 'apple-touch-icon-180x180.png')
const appleTouchIconRoot = path.resolve(distDir, 'apple-touch-icon.png')

const targetAppleIcon = fs.existsSync(appleTouchIcon180)
  ? appleTouchIcon180
  : path.resolve(frontendRoot, 'public', 'apple-touch-icon-180x180.png')

const applePng = parsePng(targetAppleIcon)
if (!applePng) {
  logError('apple-touch-icon-180x180.png is missing or invalid PNG.')
} else {
  if (applePng.width !== 180 || applePng.height !== 180) {
    logError(`apple-touch-icon dimensions are ${applePng.width}x${applePng.height}, expected 180x180.`)
  }
  if (!applePng.isOpaque) {
    logError('apple-touch-icon has transparency. iOS requires an opaque icon.')
  } else {
    logSuccess('apple-touch-icon is 180x180 and opaque (no alpha transparency).')
  }
}

// Check root apple-touch-icon.png
const rootApplePath = fs.existsSync(appleTouchIconRoot)
  ? appleTouchIconRoot
  : path.resolve(frontendRoot, 'public', 'apple-touch-icon.png')

if (!fs.existsSync(rootApplePath)) {
  logError('Root apple-touch-icon.png does not exist.')
} else {
  logSuccess('Root apple-touch-icon.png is present.')
}

// 5. Check Service Worker (dist/sw.js)
if (!fs.existsSync(swPath)) {
  logError('dist/sw.js not found.')
} else {
  const swContent = fs.readFileSync(swPath, 'utf8')
  if (swContent.length < 50) {
    logError('dist/sw.js is empty or unexpectedly small.')
  }
  if (swContent.includes('"/api/') || swContent.includes("'/api/")) {
    logError('dist/sw.js contains precached /api/ routes!')
  }
  logSuccess('dist/sw.js exists and does not cache API routes.')
}

// 6. Check Service Worker Registration in JS bundle
const assetsDir = path.resolve(distDir, 'assets')
let foundSwRegistration = false

if (fs.existsSync(assetsDir)) {
  const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
  for (const jsFile of jsFiles) {
    const code = fs.readFileSync(path.resolve(assetsDir, jsFile), 'utf8')
    if (code.includes('serviceWorker.register') || code.includes('virtual:pwa-register') || code.includes('registerSW')) {
      foundSwRegistration = true
      break
    }
  }
}

if (!foundSwRegistration) {
  logError('Service worker registration (registerSW) was not found in JS bundle assets.')
} else {
  logSuccess('Service worker registration script confirmed in production JS bundle.')
}

// Summary
if (errors > 0) {
  console.error(`\n❌ PWA checks failed with ${errors} error(s).`)
  process.exit(1)
} else {
  console.log('\n🎉 All PWA installability & asset checks passed successfully!')
  process.exit(0)
}
