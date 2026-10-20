# TindaTrack Deployment Guide (Railway + Vercel)

This guide walks you through deploying TindaTrack with a **Laravel 13 API + MySQL on Railway** and a **React 19 SPA on Vercel**.

---

## Deploy-Day Checklist (Beginner Click-by-Click)

Follow these exact steps in order on deploy day:

1. **Railway: Provision Database**
   - Go to [railway.com](https://railway.com) → Log in with GitHub.
   - Click **"+ New Project"** → select **"Database"** → click **"Add MySQL"**.
2. **Railway: Add Backend Service**
   - In the same Railway canvas, click **"+ Create"** → select **"GitHub Repo"** → pick `TindaTrack`.
   - Click on the new service card → **Settings**:
     - Service Name: `tindatrack-api`
     - Root Directory: `/backend`
3. **Railway: Set Environment Variables**
   - Click the `tindatrack-api` card → go to the **Variables** tab → click **"RAW Editor"**.
   - Paste the Railway Environment Variables block from the reference table below (be sure to generate a fresh `APP_KEY` and set your `DEMO_*` passwords).
4. **Railway: Generate Domain**
   - Under `tindatrack-api` → **Settings** → **Networking** → click **"Generate Domain"** (e.g. `tindatrack-api-production.up.railway.app`).
   - Copy this URL. Your API URL is `https://<YOUR-RAILWAY-DOMAIN>/api`.
5. **Railway: Deploy & Healthcheck**
   - Click **Deploy** (or trigger redeploy).
   - Once deployed, visit `https://<YOUR-RAILWAY-DOMAIN>/up` in your browser. It must return HTTP 200 `OK`.
6. **Railway: Run Production Seed Once**
   - In Railway, open the `tindatrack-api` service → open the **Deployments** tab or **Terminal** / **Shell**.
   - If `preDeployCommand` ran automatically, verify tables are populated. To run seed manually:
     ```bash
     php artisan db:seed --force
     ```
7. **Vercel: Import & Deploy Frontend**
   - Go to [vercel.com](https://vercel.com) → Log in with GitHub → click **"Add New..."** → **"Project"**.
   - Import the `TindaTrack` repository.
   - Configure project:
     - Framework Preset: **Vite**
     - Root Directory: click **Edit** → select `frontend`
   - In **Environment Variables**, add:
     - `VITE_API_URL` = `https://<YOUR-RAILWAY-DOMAIN>/api`
     - `VITE_DATA_SOURCE` = `api`
     - `VITE_REALTIME_DRIVER` = `polling`
     - `VITE_PUBLIC_APP_URL` = `https://<YOUR-VERCEL-DOMAIN>.vercel.app` (or your initial custom domain)
   - Click **Deploy**.
8. **Railway: Connect CORS & Redeploy**
   - Copy your assigned Vercel production URL (e.g. `https://tindatrack.vercel.app`).
   - Go back to Railway → `tindatrack-api` → **Variables**.
   - Update:
     ```ini
     FRONTEND_URL=https://tindatrack.vercel.app
     CORS_ALLOWED_ORIGINS=https://tindatrack.vercel.app
     ```
   - Railway will automatically redeploy with the updated CORS configuration.
9. **Final Smoke Verification**
   - [ ] Log in as Owner (`owner@tindatrack.test` / your production owner password).
   - [ ] Create a cash sale and check thermal receipt preview.
   - [ ] Add product by barcode (`9556001257321` or camera scan).
   - [ ] Upload or import a product photo.
   - [ ] Open Phone Scanner pairing QR code (`/scanner/pair`).
   - [ ] Test AI Vision scan (`ai:ping` returns SUCCESS).
   - [ ] Test PWA install prompt on desktop Chrome and "Add to Home Screen" on iPhone Safari.

---

## Complete Environment Variable Reference

### 1. Railway (Backend API) Environment Variables

| Variable | Example Value | Description |
|---|---|---|
| `APP_NAME` | `TindaTrack` | Application name displayed in emails and receipts |
| `APP_ENV` | `production` | Environment mode (`production` enables optimizations and disables debug traces) |
| `APP_KEY` | `base64:YOUR_GENERATED_APP_KEY` | 32-byte encryption key. Generate locally with `php artisan key:generate --show` |
| `APP_DEBUG` | `false` | Must be `false` in production to prevent stack trace leaks |
| `APP_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Public canonical base URL of the API |
| `APP_TIMEZONE` | `Asia/Manila` | Local time zone for sales and inventory timestamps |
| `DB_CONNECTION` | `mysql` | Database driver |
| `DB_URL` | `${{MySQL.DATABASE_URL}}` | Railway MySQL connection string referencing the managed database service |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Canonical URL of the frontend SPA (without trailing slash) |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Comma-separated list of allowed CORS origins |
| `CORS_ALLOWED_ORIGIN_PATTERNS` | `^https:\/\/.*\.vercel\.app$` | Regex pattern allowing Vercel preview branch deployments |
| `SESSION_DRIVER` | `database` | Session storage driver |
| `MAIL_MAILER` | `log` | Mail driver (`log` for local/school demo, or `smtp` for production) |
| `LOG_CHANNEL` | `stderr` | Standard container logging channel for Railway stdout/stderr |
| `SANCTUM_EXPIRATION` | `10080` | Sanctum API bearer token lifespan in minutes (10080 = 7 days). `SANCTUM_TOKEN_EXPIRATION` is accepted as an alias |
| `PRODUCT_LOOKUP_ENABLED` | `true` | Enables Open Food Facts live barcode lookup |
| `OFF_USER_AGENT` | `"TindaTrack/2.0 (contact@yourstore.ph)"` | Required identifying user-agent for Open Food Facts API terms |
| `DEMO_HISTORY_DAYS` | `60` | Days of demo transaction history generated during seeding |
| `DEMO_OWNER_PASSWORD` | `your-secure-production-owner-password` | Initial password for `owner@tindatrack.test` created by production seeder |
| `DEMO_CASHIER_PASSWORD` | `your-secure-production-cashier-password` | Initial password for `cashier@tindatrack.test` created by production seeder |
| `DEMO_OWNER_EMAIL` | `owner@tindatrack.test` | *(optional)* Override email for the primary owner account |
| `DEMO_CASHIER_EMAIL` | `cashier@tindatrack.test` | *(optional)* Override email for the cashier account |
| `DEMO_PASSWORD` | `password` | *(optional, local only)* Password for seeded demo accounts when the specific `DEMO_*_PASSWORD` is unset |
| `DEMO_RESET_PASSWORDS` | `false` | *(optional)* `true` re-applies the demo passwords on every seed (keep `false` in production) |
| `DEMO_BASE_DATE` | `2026-10-07 18:00:00` | *(optional)* Anchor date for generated demo sales history |
| `ALLOW_OWNER_REGISTRATION` | `false` | Public `/register` is closed once an owner exists (single store). Set `true` only to create another owner on purpose |
| `OFF_TIMEOUT` | `5` | *(optional)* Open Food Facts lookup timeout in seconds |
| `AI_PROVIDER` | `gemini` | AI vision provider: `gemini` or `mock` (defaults to `gemini` if API key is set) |
| `GEMINI_API_KEY` | `AIzaSy...` | Google AI Studio Gemini API key. Obtained free from [aistudio.google.com](https://aistudio.google.com) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Primary Gemini multimodal vision model |
| `GEMINI_FALLBACK_MODEL` | `gemini-1.5-flash` | Automated fallback model if primary model experiences 429 rate limit or 404 |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta` | Google Generative Language REST API base endpoint |
| `AI_TIMEOUT` | `30` | Request timeout in seconds for AI vision scans |
| `AI_PER_USER_PER_MINUTE` | `6` | Rate limiting guardrail to stay within Google AI Studio free tier limits |
| `AI_DAILY_LIMIT` | `500` | Maximum daily scan requests across the store |
| `AI_MAX_IMAGE_KB` | `5120` | Maximum uploaded image payload size for AI analysis in KB (keep above the SPA's 1.4 MB AI photo cap) |
| `AI_SAVE_SCAN_IMAGES` | `false` | Whether to persist raw scan photos in storage |
| `BROADCAST_CONNECTION` | `log` | *(optional)* `pusher` if using Pusher WebSockets; otherwise defaults to polling |
| `PUSHER_APP_ID` | `your-app-id` | *(optional)* Pusher App ID if `BROADCAST_CONNECTION=pusher` |
| `PUSHER_APP_KEY` | `your-key` | *(optional)* Pusher App Key |
| `PUSHER_APP_SECRET` | `your-secret` | *(optional)* Pusher App Secret |
| `PUSHER_APP_CLUSTER` | `ap1` | *(optional)* Pusher cluster (e.g. `ap1`, `mt1`) |

### 2. Vercel (Frontend React SPA) Environment Variables

| Variable | Example Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://tindatrack-api.up.railway.app/api` | Railway backend API endpoint (must end in `/api`; a trailing slash is tolerated) |
| `VITE_DATA_SOURCE` | `api` | Production data driver (`api` connects to Laravel backend; `mock` is offline demo fallback) |
| `VITE_REALTIME_DRIVER` | `polling` | Realtime sync driver (`polling` requires zero background workers; `pusher` for WebSockets) |
| `VITE_PUBLIC_APP_URL` | `https://tindatrack.vercel.app` | Public canonical origin of the SPA, used in phone scanner QR code generation |
| `VITE_PUSHER_APP_KEY` | *(optional)* | Pusher public key if `VITE_REALTIME_DRIVER=pusher` |
| `VITE_PUSHER_APP_CLUSTER` | *(optional)* | Pusher cluster (e.g. `ap1`) |
| `VITE_APP_NAME` | `TindaTrack` | *(optional)* App name in the UI |
| `VITE_SHOW_DEMO_ACCOUNTS` | `false` | *(optional)* Show the demo-account picker on the login page (dev builds only) |
| `VITE_MOCK_LATENCY` | `400` | *(optional, mock mode only)* Simulated latency in ms |

Dev-only (never set on Vercel): `VITE_DEV_HTTPS=true` is set by `npm run dev:lan` (HTTPS + listen on Wi-Fi), and `VITE_DEV_LAN_ORIGIN` is injected by `vite.config.js` at dev-server start so the phone-pairing QR uses the laptop's Wi-Fi address. `scripts/check-prod-bundle.mjs` fails a production build made with `VITE_DATA_SOURCE=mock`.

---

## Production Build & Cache Verification

Before deploying, you can verify your build locally using production-like commands:

```bash
# 1. Backend dry-run and configuration caching
cd backend
composer install --no-dev --dry-run
php artisan config:cache && php artisan route:cache
php artisan tindatrack:check --production   # warns: APP_KEY, APP_DEBUG, FRONTEND_URL, Gemini key, storage link, upload limits
php artisan config:clear && php artisan route:clear

# 2. Frontend production build and bundle audit
cd ../frontend
npm run build
node ../scripts/check-prod-bundle.mjs
node ../scripts/check-pwa.mjs
node ../scripts/check-routes.mjs   # every SPA call has a Laravel route + method
```

---

## Architecture & Hosting Details

- **Railway Nixpacks (`backend/nixpacks.toml`)**:
  - PHP 8.4 runtime with required extensions: `pdo_mysql`, `bcmath`, `mbstring`, `fileinfo`.
  - PHP upload limits configured to `upload_max_filesize = 10M` and `post_max_size = 12M` for camera packshot photos.
  - Public directory rooted to `/app/public` with `/index.php` fallback.
- **Railway Configuration (`backend/railway.toml`)**:
  - `startCommand`: `php artisan serve --host=0.0.0.0 --port=$PORT`
  - `preDeployCommand`: `php artisan migrate --force && php artisan db:seed --force && php artisan config:cache && php artisan route:cache && php artisan view:cache`
  - `healthcheckPath`: `/up`
- **Vercel Headers & Routing (`frontend/vercel.json`)**:
  - Single-Page Application rewrites route all non-asset URLs to `/index.html`.
  - Static assets (`/assets/*`, icons, manifest) bypass the SPA rewrite.
  - `/sw.js` is served with `Cache-Control: no-cache, no-store, must-revalidate` to ensure immediate service worker updates upon deployment.
  - `/manifest.webmanifest` is served with `Content-Type: application/manifest+json; charset=utf-8`.
  - Icons and bundles receive long-term immutable caching (`max-age=31536000, immutable`).
