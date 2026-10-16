# Progressive Web App (PWA) Guide

TindaTrack v1.4.0 transforms the web application into an installable Progressive Web App (PWA) designed to feel like a native mobile application on iOS, Android, and desktop operating systems.

---

## 1. Installation Guide

### iPhone and iPad (iOS / iPadOS Safari)
1. Open TindaTrack in **Safari** on your iOS device.
2. Tap the **Share** button (box with an upward arrow) in the bottom toolbar.
3. Scroll down the share sheet and tap **Add to Home Screen** (`Idagdag sa Home Screen`).
4. Tap **Add** in the top right corner.
5. Launch TindaTrack directly from your home screen. It will open in **full-screen standalone mode** with no Safari URL bar or bottom navigation bar, styled with a translucent status bar seamlessly blending into the emerald header.

> [!NOTE]
> On iOS, third-party browsers (Chrome, Firefox, Edge) use WebKit but only Safari has permission to add PWAs to the home screen with full standalone display mode support.

### Android (Chrome / Chromium)
1. Open TindaTrack in **Google Chrome** on your Android device.
2. Either tap the **Install** banner that appears, or open the Chrome menu (three dots) and tap **Install App** / **Add to Home screen**.
3. Alternatively, navigate to **Settings → Store Profile** or click your avatar in the app and choose **Install app**.
4. Confirm installation. The TindaTrack icon will appear in your app drawer and home screen.

### Desktop (Chrome / Edge)
1. Open TindaTrack in Chrome, Edge, or Brave.
2. Click the install icon in the right side of the address bar, or go to **Settings → Store Profile → Install TindaTrack App**.
3. TindaTrack launches in its own dedicated, chromeless desktop window with OS taskbar/dock integration and app shortcuts.

---

## 2. Development vs. Production Behavior

### Service Worker is Disabled in Development
In `vite.config.js`, `devOptions.enabled` is explicitly set to `false`:
- Avoids stale cache confusion during active development.
- Prevents service worker registration failures and self-signed certificate errors when testing over local network (`npm run dev:lan`).
- Fast refresh (HMR) operates cleanly without service worker interception.

### Production Testing on Deployed HTTPS (Vercel)
- Progressive Web App service workers and Web App Manifest installation **require a valid HTTPS context**.
- iOS Safari strictly refuses to register service workers or prompt for PWA installation over untrusted or self-signed certificates.
- Always test installation and service worker lifecycle on the deployed Vercel production HTTPS URL.

---

## 3. Brand Assets & Icon Generation

TindaTrack uses a unified vector brand mark (`public/logo.svg` and `public/logo-maskable.svg`) featuring the signature emerald gradient (`#0e7c66` → `#064e3b`) and warm amber accent (`#fbbf24`).

### Generating PWA Icons
Whenever the brand logo or maskable background is modified, regenerate all production icons with:
```bash
# In frontend directory or workspace root:
npm run gen:icons
```
This script leverages `@vite-pwa/assets-generator` and `pwa-assets.config.js` to create:
- `public/favicon.ico` (multi-resolution 16x16, 32x32, 48x48)
- `public/favicon.svg` (crisp vector tab icon, zero Vite purple)
- `public/apple-touch-icon-180x180.png` (iOS home screen icon)
- `public/pwa-64x64.png`
- `public/pwa-192x192.png` (Android home screen icon)
- `public/pwa-512x512.png` (Splash screen & install dialogue)
- `public/maskable-icon-512x512.png` (Adaptive icons for Android adaptive launcher icons)

---

## 4. Caching & Offline Strategy

TindaTrack's service worker is generated with Workbox via `vite-plugin-pwa` with strict security boundaries:

| Asset Type | Cache Strategy | Expiration / Notes |
| :--- | :--- | :--- |
| **App Shell** (JS, CSS, HTML, Wasm, Fonts) | Precached (`generateSW`) | Automatically version-hashed on build; instant startup |
| **Demo Packshots** (`/demo-products/*.svg`) | `CacheFirst` | 30 days, max 100 entries; immutable SVG illustrations |
| **Uploaded Product Images** (`/api/product-images/*`) | `CacheFirst` | 30 days, max 100 entries; immutable UUID storage |
| **Google Fonts** (`fonts.googleapis.com`, `gstatic.com`) | `CacheFirst` | 1 year, max 10 entries |
| **Business API Endpoints** (`/api/**`) | **`NetworkOnly`** | **NEVER CACHED**. Preserves real-time accuracy and prevents leaking authenticated multi-user business data |

### Workbox Configuration Highlights
- `registerType: 'prompt'`: Displays a gentle sonner toast (`"A new version is available"`) with a `"Reload"` action when an updated service worker is waiting in the background.
- `navigateFallbackDenylist: [/^\/api\//]`: Guarantees API calls will never fallback to `index.html` during transient offline or error states.
- `cleanupOutdatedCaches: true`: Cleans up legacy cache versions immediately upon activation.

---

## 5. Standalone Display & Native Polish

When running in standalone mode (`@media (display-mode: standalone)` or `[data-standalone="true"]`):
1. **Status Bar & Safe Areas:**
   - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` ensures the interface extends beneath the iPhone dynamic island / notch.
   - Sticky headers apply `padding-top: env(safe-area-inset-top)` and height compensation.
   - Bottom navigation bars apply `padding-bottom: env(safe-area-inset-bottom)`.
2. **Native App Touch Behaviors:**
   - `overscroll-behavior: none` prevents undesirable pull-to-refresh page bouncing.
   - `-webkit-tap-highlight-color: transparent` eliminates gray flash on taps.
   - Long-press selection and callouts are suppressed on navigation, buttons, and product tiles (`-webkit-touch-callout: none; user-select: none`), while standard inputs and text areas preserve text selection.
3. **Chromeless Back Navigation:**
   - Since standalone mode eliminates browser back buttons, detail pages (`/products/:id`, `/sales/:id`, `/customers/:id`, `/pos`) include explicit in-page back navigation buttons.
   - Any external links open in a separate tab (`target="_blank" rel="noopener"`) to prevent trapping the user inside third-party domains.

---

## 6. Verification

Run the automated PWA build verification gate anytime:
```bash
npm run check:pwa
```
This tests:
1. Manifest validity (`display: standalone`, `start_url`, maskable icon, shortcuts).
2. Physical existence of all generated icon PNGs on disk.
3. Service worker generation and absence of cached `/api/` endpoints.
4. Meta tags in `index.html` (`apple-touch-icon`, `apple-mobile-web-app-capable`, `theme-color`).
5. Absence of legacy Vite placeholder assets or colors.
