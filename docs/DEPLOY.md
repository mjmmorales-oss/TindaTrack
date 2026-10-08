# TindaTrack Deployment Guide (Railway + Vercel)

This step-by-step guide walks you through deploying TindaTrack with a **Laravel API + MySQL on Railway** and a **React SPA on Vercel**.

---

## Architecture Overview

- **Backend & Database**: Railway
  - **API Service**: Laravel 13, Root Directory = `backend`
  - **Database Service**: MySQL 8.x
- **Frontend**: Vercel
  - **SPA Service**: React 19 + Vite 8, Root Directory = `frontend`
- **Networking**:
  - Railway routes HTTPS API calls to Laravel and provides an internal private network connection (`DB_URL`) to MySQL.
  - Vercel serves static assets with client-side routing rewrites (`vercel.json`), calling the Railway backend API via HTTPS.

---

## Part 1: Deploy Backend & Database on Railway

### Step 1: Create a Railway Project
1. Log in to [Railway](https://railway.com) (sign in with your GitHub account).
2. Click **"+ New Project"**.
3. Choose **"Deploy from GitHub repo"**.
4. Select your **TindaTrack** repository.

### Step 2: Configure the Backend Service
1. In the newly created service card in the Railway canvas, click on it and navigate to **Settings**.
2. **Service Name**: Rename it to `tindatrack-api` (or similar).
3. **Root Directory**: Change Root Directory to `/backend`.
4. Railway will automatically detect `backend/railway.toml` and `backend/nixpacks.toml`.

### Step 3: Add a MySQL Database
1. In the Railway project canvas, click **"+ Create"** (or press `Cmd/Ctrl + K` and type "Database").
2. Select **"Database"** -> **"Add MySQL"**.
3. Railway will provision a MySQL service in your project within seconds.

### Step 4: Configure Backend Environment Variables
1. Click on the `tindatrack-api` service card.
2. Go to the **Variables** tab.
3. Click **"New Variable"** (or **"RAW Editor"**) and add the following variables:

```ini
APP_NAME=TindaTrack
APP_ENV=production
APP_KEY=base64:YOUR_GENERATED_APP_KEY
APP_DEBUG=false
APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
APP_TIMEZONE=Asia/Manila

# Connects to Railway MySQL service
DB_CONNECTION=mysql
DB_URL=${{MySQL.DATABASE_URL}}

# Client & CORS
FRONTEND_URL=https://your-tindatrack.vercel.app
CORS_ALLOWED_ORIGINS=https://your-tindatrack.vercel.app
CORS_ALLOWED_ORIGIN_PATTERNS=^https:\/\/.*\.vercel\.app$

SESSION_DRIVER=database
MAIL_MAILER=log
LOG_CHANNEL=stderr
DEMO_HISTORY_DAYS=60
```

> **Tip for `APP_KEY`**: If you need a fresh key, run `php artisan key:generate --show` locally and paste the output.
>
> **Tip for `DB_URL`**: Using Railway's reference `${{MySQL.DATABASE_URL}}` automatically resolves to MySQL's internal private connection string without exposing database credentials to the public internet.

### Step 5: Generate a Public Domain
1. In `tindatrack-api` -> **Settings** -> **Networking**.
2. Under **Public Networking**, click **"Generate Domain"** (e.g. `tindatrack-api-production.up.railway.app`).
3. Note this domain: your API base URL will be `https://tindatrack-api-production.up.railway.app/api`.

### Step 6: Deploy & Verify Logs
1. Click **Deploy** (or trigger a redeploy if already started).
2. The `preDeployCommand` in `backend/railway.toml` will run:
   ```bash
   php artisan migrate --force && php artisan db:seed --force
   ```
   This creates all tables and runs idempotent seeders (`ReferenceDataSeeder` and `DemoHistorySeeder`).
3. Click the **Deployments** tab and view the deployment logs to ensure the build succeeded and the server is healthy (`/up` healthcheck passes).

---

## Part 2: Deploy Frontend on Vercel

### Step 1: Import Repository
1. Log in to [Vercel](https://vercel.com) with GitHub.
2. Click **"Add New..."** -> **"Project"**.
3. Find and import the **TindaTrack** repository.

### Step 2: Configure Project Settings
1. **Project Name**: `tindatrack` (or custom name).
2. **Framework Preset**: Vite (detected automatically).
3. **Root Directory**: Click **Edit** and choose `frontend`.
4. **Build and Output Settings**: Defaults (`npm run build`, output directory `dist`).

### Step 3: Add Frontend Environment Variables
Expand **Environment Variables** and add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://<YOUR-RAILWAY-DOMAIN>/api` | Railway API endpoint (with `/api`) |
| `VITE_DATA_SOURCE` | `api` | Connects directly to the Laravel backend |
| `VITE_SHOW_DEMO_ACCOUNTS` | `true` | Displays demo account switcher on login screen |

### Step 4: Deploy
1. Click **"Deploy"**.
2. Vercel will install dependencies and run `vite build`.
3. When finished, Vercel gives you your production URL (e.g. `https://tindatrack.vercel.app`).

---

## Part 3: Connect CORS & Redeploy

1. Copy your Vercel production URL (e.g., `https://tindatrack.vercel.app`).
2. Go back to Railway -> `tindatrack-api` -> **Variables**.
3. Update `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` to match your Vercel URL exactly (no trailing slash):
   ```ini
   FRONTEND_URL=https://tindatrack.vercel.app
   CORS_ALLOWED_ORIGINS=https://tindatrack.vercel.app
   ```
4. Railway will automatically trigger a rolling redeploy with the updated CORS configuration.

---

## Part 4: Post-Deployment Smoke Test Checklist

Once both services are running:

- [ ] **Health Endpoint**: Visit `https://<YOUR-RAILWAY-DOMAIN>/up` — returns HTTP 200.
- [ ] **Root API Endpoint**: Visit `https://<YOUR-RAILWAY-DOMAIN>/` — returns `{"name":"TindaTrack","status":"ok"}`.
- [ ] **Frontend Load**: Open your Vercel URL in a browser. The landing page and login modal should appear cleanly with no console errors.
- [ ] **Login as Owner**: Log in using `owner@tindatrack.ph` / `password123`. Verify dashboard loads with real metrics.
- [ ] **Cash Sale**: Navigate to `/pos`, add 2 items to the cart, checkout with Cash, print thermal receipt preview, and check stock decremented.
- [ ] **Utang Sale**: Create an utang sale for an existing suki customer. Verify customer balance increased and sale recorded.
- [ ] **Void Sale**: Go to `/sales`, open the cash sale created above, click **"I-void ang Benta"**, provide a reason (≥ 5 chars), and confirm. Verify items returned to stock.
- [ ] **Reports Reconciliation**: Go to `/reports` and `/sales`. Ensure sales totals and payment breakdowns match the summary numbers.
