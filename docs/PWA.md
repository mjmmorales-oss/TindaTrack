# Progressive Web App (PWA) Guide & Installation Diagnosis

TindaTrack transforms into an installable Progressive Web App (PWA) designed to operate like a native mobile application on iOS, Android, and desktop devices.

---

## 1. Quick Reference: Install Availability by Environment

| Mode | Install? | Why |
| :--- | :---: | :--- |
| `npm run dev` / `dev:lan` | ❌ | Service worker is explicitly disabled (`devOptions.enabled: false`) to avoid stale development caches, and self-signed certificates prevent Chrome and Safari from registering service workers. |
| `npm run pwa:preview` on laptop | ✅ Chrome / Edge | Serves the production build over `http://localhost:4173`, which Chromium treats as a trusted secure origin. The manifest is active, the service worker is registered, and the install button appears in the browser address bar and top bar. |
| `npm run pwa:tunnel` on iPhone / Android | ✅ Safari / Chrome | Exposes the local production preview over a trusted public Cloudflare HTTPS tunnel without certificate warnings. Allows testing real iOS Safari "Add to Home Screen" with official icons before deploying to production. |
| Deployed on Vercel | ✅ All platforms | Fully trusted production HTTPS context. Service worker, manifest, long-term asset caching, and native standalone modes are 100% active. |

---

## 2. Step-by-Step Instructions per Mode

### Mode A: Local Production Preview (`npm run pwa:preview`)
Use this mode to test PWA installation directly on your development machine (laptop / desktop).

1. Ensure the local Laravel backend is running:
   ```bash
   cd backend && php artisan serve
   ```
2. In the workspace root, run:
   ```bash
   npm run pwa:preview
   ```
   *This compiles the production frontend bundle with `VITE_API_URL=/api` and launches Vite Preview on port `4173` with the backend API proxy.*
3. Open `http://localhost:4173` in **Google Chrome** or **Microsoft Edge**.
4. Observe the install indicator:
   - In Chrome's address bar (omnibox), click the **Install TindaTrack** icon on the right.
   - Alternatively, click the **Install App** button with the download icon in the TindaTrack top bar.
5. Click **Install**. The application launches in a standalone, dedicated desktop window with OS taskbar integration.

---

### Mode B: Mobile Testing with Cloudflare Tunnel (`npm run pwa:tunnel`)
Use this mode to test "Add to Home Screen" on an iPhone (iOS Safari) or Android phone before deploying to production.

1. Start the preview server in one terminal:
   ```bash
   npm run pwa:preview
   ```
2. In a second terminal, launch the tunnel:
   ```bash
   npm run pwa:tunnel
   ```
   *If `cloudflared` is not globally installed, `npx cloudflared` will automatically run it without requiring an account.*
3. Copy the generated HTTPS tunnel URL (e.g. `https://random-subdomain.trycloudflare.com`).
4. **On iPhone (iOS Safari):**
   1. Open the HTTPS URL in **Safari** (must be Safari; iOS WebKit restrictions block install from Chrome/Firefox).
   2. Tap the **Share** button (square with upward arrow) in Safari's bottom toolbar.
   3. Scroll down the sheet and select **Add to Home Screen** (`Idagdag sa Home Screen`).
   4. Verify the icon preview shows the official green/gold TindaTrack icon (not a web page screenshot).
   5. Tap **Add**. Open TindaTrack from your home screen. It will launch in full-screen standalone mode.
5. **On Android (Google Chrome):**
   1. Open the HTTPS URL in **Google Chrome**.
   2. Tap the in-app **Install TindaTrack App** mobile banner on the dashboard or open the Chrome menu (⋮) → **Install App**.
   3. The app will install with its adaptive maskable icon into your launcher.

---

### Mode C: Production Deployment (Vercel)
The standard production workflow:

1. Push your changes to GitHub and deploy to Vercel.
2. Ensure Vercel environment variables are configured:
   - `VITE_API_URL`: Your production Railway backend URL (e.g., `https://api.tindatrack.ph/api`).
   - `VITE_DATA_SOURCE`: `api`.
3. Open your production domain in Safari or Chrome.
4. Install prompts and banners will automatically offer installation to all visitors.

---

## 3. PWA Diagnostics & Verification (`npm run check:pwa`)

TindaTrack includes an automated pre-flight audit script to verify PWA installability rules:

```bash
npm run check:pwa
```

This script verifies:
1. `dist/index.html` contains `<link rel="manifest" href="/manifest.webmanifest">`.
2. `dist/index.html` contains `<meta name="theme-color">` and `<link rel="apple-touch-icon">`.
3. `dist/manifest.webmanifest` exists, is valid JSON, and has:
   - `display: "standalone"`
   - `start_url` with `source=pwa` query parameter
   - Valid `id` and `scope`
   - Required standard icons (`192x192` and `512x512`)
   - Adaptive maskable icon (`512x512`, `purpose: "maskable"`)
4. **PNG Header Dimensions:** Directly parses the binary PNG header bytes (IHDR chunk) of every declared icon to guarantee the real image dimensions match the manifest declaration.
5. **iOS Icon Opacity:** Verifies that `apple-touch-icon-180x180.png` and `apple-touch-icon.png` have no alpha transparency (iOS Safari will display transparency as black or fallback to a screenshot if an icon is transparent or broken).
6. **Service Worker:** Checks that `dist/sw.js` exists, is non-empty, and does not precache any `/api/` endpoints.
7. **Bundle Registration:** Confirms that service worker registration logic (`registerSW`) is compiled into production JS assets.

---

## 4. Smoke Testing Preview Server (`npm run smoke:pwa`)

To smoke test the running preview server via curl/fetch:

```bash
# In terminal 1:
npm run pwa:preview

# In terminal 2:
npm run smoke:pwa
```

Checks that:
- `GET /` returns HTTP 200 with HTML shell and manifest links.
- `GET /manifest.webmanifest` returns HTTP 200 with `application/manifest+json` content-type.
- `GET /sw.js` returns HTTP 200 service worker script.
- `GET /apple-touch-icon-180x180.png` and `GET /apple-touch-icon.png` return HTTP 200 PNG images.
- `GET /pwa-512x512.png` returns HTTP 200 PNG image.
- `GET /api/up` returns HTTP 200 through the Vite preview proxy.

---

## 5. Caching & Security Architecture

TindaTrack uses Workbox via `vite-plugin-pwa` with strict boundaries:

| Asset Type | Strategy | Caching Rule |
| :--- | :--- | :--- |
| **App Shell** (JS, CSS, HTML, Wasm) | Precached (`generateSW`) | Cache-first, version-hashed per deployment |
| **Demo Illustrations** (`/demo-products/*.svg`) | `CacheFirst` | 30 days, max 100 entries |
| **Product Images** (`/api/product-images/*`) | `CacheFirst` | 30 days, max 100 entries |
| **Google Fonts** (`fonts.googleapis.com`) | `CacheFirst` | 1 year, max 10 entries |
| **Business API Endpoints** (`/api/**`) | **`NetworkOnly`** | **NEVER CACHED**. Guarantees zero stale business data and prevents leaking multi-tenant financial data across user logins. |

### Vercel Edge Headers (`frontend/vercel.json`)
- `sw.js`: `Cache-Control: no-cache, no-store, must-revalidate` (clients always receive service worker updates immediately).
- `manifest.webmanifest`: `Content-Type: application/manifest+json; charset=utf-8` and `Cache-Control: public, max-age=0, must-revalidate`.
- Static icons (`/pwa-*.png`, `/apple-touch-icon*.png`): `Cache-Control: public, max-age=31536000, immutable`.
- SPA rewrites explicitly exclude manifest, service workers, and icons.
