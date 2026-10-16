import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const distDir = path.resolve(frontendRoot, 'dist')
const manifestPath = path.resolve(distDir, 'manifest.webmanifest')
const swPath = path.resolve(distDir, 'sw.js')
const indexHtmlPath = path.resolve(frontendRoot, 'index.html')
const faviconPath = path.resolve(frontendRoot, 'public', 'favicon.svg')

let errors = 0

function logError(message) {
  console.error(`❌ [check-pwa] ${message}`)
  errors++
}

function logSuccess(message) {
  console.log(`✅ [check-pwa] ${message}`)
}

console.log('🔍 Running PWA build validation checks...')

// 1. Check dist/ directory exists
if (!fs.existsSync(distDir)) {
  logError('dist/ directory not found. Please run `npm run build` before checking PWA assets.')
  process.exit(1)
}

// 2. Check dist/manifest.webmanifest
if (!fs.existsSync(manifestPath)) {
  logError('dist/manifest.webmanifest not found.')
} else {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8')
    const manifest = JSON.parse(raw)

    if (manifest.display !== 'standalone') {
      logError(`manifest display is "${manifest.display}", expected "standalone".`)
    }

    if (!manifest.start_url || !manifest.start_url.includes('source=pwa')) {
      logError(`manifest start_url is "${manifest.start_url}", expected to contain source=pwa.`)
    }

    const icons = Array.isArray(manifest.icons) ? manifest.icons : []
    if (icons.length < 4) {
      logError(`manifest icons count is ${icons.length}, expected at least 4 icons.`)
    }

    const hasMaskable = icons.some((icon) => icon.purpose && icon.purpose.includes('maskable'))
    if (!hasMaskable) {
      logError('manifest is missing a maskable icon with purpose: "maskable".')
    }

    // Check each icon exists on disk
    for (const icon of icons) {
      const cleanSrc = icon.src.replace(/^\//, '')
      const iconPathDist = path.resolve(distDir, cleanSrc)
      const iconPathPublic = path.resolve(frontendRoot, 'public', cleanSrc)
      if (!fs.existsSync(iconPathDist) && !fs.existsSync(iconPathPublic)) {
        logError(`Manifest icon file "${icon.src}" does not exist in dist/ or public/.`)
      }
    }

    // Check shortcuts
    if (!Array.isArray(manifest.shortcuts) || manifest.shortcuts.length < 3) {
      logError('manifest shortcuts missing or has fewer than 3 items.')
    }

    // Check no vite logo reference
    if (raw.includes('vite.svg') || raw.includes('#863bff')) {
      logError('manifest references vite.svg or vite brand purple #863bff.')
    }

    logSuccess('manifest.webmanifest valid with standalone mode, maskable icon, and shortcuts.')
  } catch (err) {
    logError(`Failed to parse manifest.webmanifest as valid JSON: ${err.message}`)
  }
}

// 3. Check dist/sw.js
if (!fs.existsSync(swPath)) {
  logError('dist/sw.js not found.')
} else {
  const swContent = fs.readFileSync(swPath, 'utf8')
  if (swContent.length < 50) {
    logError('dist/sw.js is empty or unexpectedly small.')
  }
  // Ensure service worker does NOT precache /api/
  if (swContent.includes('"/api/') || swContent.includes("'/api/")) {
    logError('dist/sw.js contains precached /api/ routes!')
  }
  logSuccess('dist/sw.js exists and does not cache API routes.')
}

// 4. Check index.html meta tags
if (fs.existsSync(indexHtmlPath)) {
  const html = fs.readFileSync(indexHtmlPath, 'utf8')

  if (!html.includes('rel="apple-touch-icon"')) {
    logError('index.html missing rel="apple-touch-icon" link.')
  }
  if (!html.includes('apple-mobile-web-app-capable')) {
    logError('index.html missing apple-mobile-web-app-capable meta.')
  }
  if (!html.includes('name="theme-color"')) {
    logError('index.html missing name="theme-color" meta.')
  }
  logSuccess('index.html contains apple-touch-icon, apple-mobile-web-app-capable, and theme-color.')
} else {
  logError('index.html not found.')
}

// 5. Check favicon.svg
if (fs.existsSync(faviconPath)) {
  const svg = fs.readFileSync(faviconPath, 'utf8')
  if (svg.includes('#863bff') || svg.includes('vite.svg')) {
    logError('public/favicon.svg still contains Vite brand colors (#863bff).')
  } else {
    logSuccess('public/favicon.svg has been replaced and does not contain Vite purple.')
  }
} else {
  logError('public/favicon.svg not found.')
}

if (errors > 0) {
  console.error(`\n❌ PWA check failed with ${errors} error(s).`)
  process.exit(1)
} else {
  console.log('\n✨ All PWA checks passed successfully!')
  process.exit(0)
}
