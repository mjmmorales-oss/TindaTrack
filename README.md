# TindaTrack

> A web-based Point-of-Sale (POS) and inventory management system purpose-built for Philippine sari-sari stores.

TindaTrack digitizes traditional pen-and-paper sari-sari store operations (*lista ng utang*, *sukli*, *benta*, and stock reorders) with a fast, touch-friendly, mobile-first interface designed for phones, tablets, and desktop POS stations.

---

## Features

- **🎨 Deterministic Demo Packshot Catalog (v1.4)**: 58 crisp, lightweight vector SVG packshots (`/demo-products/*.svg`) illustrating classic Philippine sari-sari items (Coke Mismo, Lucky Me Pancit Canton, Bear Brand, Datu Puti, Silver Swan, Chippy, San Miguel, Kopiko). Preserves user-uploaded photos during re-seeding and includes a one-click "Restore demo images" action in Settings.
- **🛍️ Image-First POS Experience (v1.4)**: Aspect-square cover packshots with clean SVG padding, floating cart quantity badges (`×{qty}`), floating out-of-stock and low-stock chips, bold high-contrast prices, clutter-free tile design with SKU removed, responsive auto-fill grid (`minmax(140px, 1fr)` mobile, `minmax(160px, 1fr)` desktop), and a persistent view mode toggle (Grid vs Compact List).
- **🛒 Rich Cart Ergonomics & Mobile Bar (v1.4)**: 48x48 rounded product thumbnails in cart items, stacked name and unit price breakdowns, compact quantity stepper with tactile scale animation, swipe-to-remove gesture with Sonner undo toast, and overlapping product thumbnail previews in the mobile cart trigger.
- **📱 Installable Progressive Web App (PWA) (v1.4)**: Native app feel on iOS, Android, and Desktop. Runs in chromeless standalone mode, respects dynamic island / status bar safe areas (`black-translucent`), suppresses page bounce and touch callouts, and features step-by-step iOS Safari install instructions, desktop/Android install banners, and Workbox caching (network-only authenticated `/api/`, cache-first demo packshots).
- **⚡ Unified Add by Barcode**: Seamless product onboarding in a single unified flow. Scan via hardware USB barcode guns, webcam/phone cameras, paired smartphones, or manual typing with 400ms GTIN debounce. Detects existing in-store inventory for instant restock shortcuts (`+5`, `+10`, `+20`, `+50`), auto-fills new products from Open Food Facts, and supports continuous "Save & scan next" cataloging with live session history.
- **📱 Mobile Ergonomics & Input Polish**: Flawless phone experience with a 16px font-size touch floor preventing iOS/Android auto-zoom on input focus. Features dynamic visual viewport adaptation (`useVisualViewport`) that eliminates keyboard gaps, responsive full-height bottom drawers with scrollable bodies and pinned sticky footers, and automatic bottom navigation hiding when overlays or sheets open.
- **👥 Full Staff & Cashier Management**: Comprehensive cashier administration for store owners. Create cashier accounts with cryptographically generated 8-character temporary passwords, one-click clipboard copying, and a mandatory first-login password update banner. Supports soft-delete archiving, instant password resets, and account restorations with domain rule code guards (`self_action`, `last_owner`, `owner_protected`, `email_taken`).
- **⚡ Fast POS**: Barcode and SKU search, quick categories, numeric keypad, cash change calculation (*sukli*), and cart parking (up to 3 held carts).
- **📷 Barcode Scanning & Hardware Wedge**: Scan via webcam/phone camera (`barcode-detector` WASM), USB/Bluetooth hardware scanner wedge, or manual entry with duplicate deduplication.
- **📱 Phone-to-POS Live Sync**: Turn any mobile phone into a wireless scanner via zero-login QR code pairing (`/scan`) syncing instantly with laptop POS or inventory.
- **🌐 Open Food Facts Auto-Fill**: Auto-detects product names, brands, package sizes, categories, and images from Open Food Facts open-data catalog (ODbL).
- **🖼️ In-DB Product Images**: MySQL `MEDIUMBLOB` and ULID binary storage, client-side canvas downscaling (WebP/JPEG <= 300KB), mobile camera photo capture (`capture="environment"`), and SSRF-safe URL import.
- **🌏 Bilingual Internationalization**: English-first default with Taglish/Filipino toggle in Settings, 18 complete namespaces, zero English UI Taglish leaks, and automated dictionary parity verification.
- **🏷️ Homemade Barcode Generator & Labels**: Generate internal EAN-13 barcodes (`20xxxx...`) for home-cooked goods (ice candy, turon) and print 12-per-page thermal/sticker labels.
- **📒 Digital Utang Ledger**: Track credit balances per suki, payment recordings, 30-day aging alerts, and credit limit enforcement with owner overrides.
- **📦 Inventory & Stock Movements**: Real-time stock counts, low/out-of-stock badges, atomic stock deductions, and audit movement logs.
- **📊 Analytics & Reports**: Gross profit, sales over time (daily/weekly/monthly), best-selling products, category distribution, and peak hours.
- **🖨️ Thermal Receipts**: 58mm and 80mm printable receipts with custom store headers, footers, and void audit trails.
- **👥 Role-Based Access Control**: Separate permissions for Store Owner (full access, staff management, void sales, cost prices) and Cashiers.
- **⌨️ Keyboard & Power Tools**: ⌘K / Ctrl+K Command Palette, keyboard shortcuts (`F2`, `F9`, `Esc`, `?`), hotkey input suppression, and offline indicator.

---

## Tech Stack

- **Frontend**: React 19 SPA, Vite 8, Tailwind CSS v4, shadcn/ui (Radix primitives), TanStack Query v5, Zustand, React Hook Form + Zod, `motion/react`, `lucide-react`.
- **Backend**: Laravel 13, PHP 8.4+, Laravel Sanctum (Bearer token authentication), Form Requests, API Resources, Pest PHP test suite.
- **Database**: MySQL 8.x with strict decimal arithmetic, transactions, and row-level locking (`lockForUpdate`).
- **Deployments**: Railway (Laravel API + MySQL) & Vercel (React Vite SPA).

---

## Demo Accounts

The database comes pre-seeded with 3 demo accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Owner** | `owner@tindatrack.ph` | `password123` | Full administrative access, voiding, staff, reports |
| **Cashier 1** | `cashier@tindatrack.ph` | `password123` | POS sales, customer utang payments, product view |
| **Cashier 2** | `juan@tindatrack.ph` | `password123` | POS sales, customer utang payments, product view |

---

## Local Setup

### Prerequisites

- **PHP 8.4+** with extensions: `pdo_mysql`, `bcmath`, `mbstring`, `intl`, `fileinfo`
- **Composer** (v2.x)
- **Node.js** (v20+ recommended) & **npm**
- **MySQL 8.x** (or via XAMPP / MariaDB)

---

### macOS Setup

1. **Clone repository**:
   ```bash
   git clone https://github.com/mjmmorales-oss/TindaTrack.git
   cd TindaTrack
   ```

2. **Root Dependencies**:
   ```bash
   npm install
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   ```
   *Edit `.env` to match your local MySQL credentials (`DB_DATABASE=tindatrack`, `DB_USERNAME`, `DB_PASSWORD`).*

4. **Run Migrations & Seeders**:
   ```bash
   mysql -u root -e "CREATE DATABASE IF NOT EXISTS tindatrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   php artisan migrate:fresh --seed
   ```

5. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   ```
   *Ensure `VITE_API_URL=http://localhost:8000/api` and `VITE_DATA_SOURCE=api`.*

6. **Start Local Development**:
   From the repository root:
   ```bash
   npm run dev
   ```
   This concurrently runs the Laravel API (`http://localhost:8000`) and the Vite frontend (`http://localhost:5173`).

7. **Mobile Phone Testing via Wi-Fi (`dev:lan`)**:
   To test camera barcode scanning on a physical smartphone on the same local network:
   ```bash
   npm run dev:lan
   ```
   This serves Vite over HTTPS with local SSL and proxies API requests to Laravel. Open `https://<YOUR-LAN-IP>:5173/pos` on your computer, click **"Ikonekta ang Phone"**, and scan the QR code with your mobile device. See [docs/BARCODE.md](docs/BARCODE.md) for full architecture and live demo script.

---

### Windows / XAMPP Setup

1. **Start Apache and MySQL** from the XAMPP Control Panel.
2. Open **phpMyAdmin** (`http://localhost/phpmyadmin`) and create a database named `tindatrack`.
3. Open PowerShell or Git Bash in your projects directory:
   ```bash
   git clone https://github.com/mjmmorales-oss/TindaTrack.git
   cd TindaTrack
   npm install
   ```
4. **Backend Setup**:
   ```bash
   cd backend
   composer install
   copy .env.example .env
   php artisan key:generate
   ```
   In `.env`:
   ```ini
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=tindatrack
   DB_USERNAME=root
   DB_PASSWORD=
   ```
5. **Run Migrations & Seed Database**:
   ```bash
   php artisan migrate:fresh --seed
   ```
6. **Frontend Setup**:
   ```bash
   cd ..\frontend
   npm install
   copy .env.example .env
   ```
7. **Start**:
   From repository root:
   ```bash
   npm run dev
   ```

---

## Helpful Commands & Scripts

| Command | Working Directory | Description |
|---|---|---|
| `npm run dev` | Root | Runs backend API + frontend dev server concurrently |
| `npm run test` | `frontend/` | Runs Vitest headless jsdom route & dialog render smoke tests (catches runtime crashes that build and lint miss) |
| `php artisan test` | `backend/` | Runs Pest feature test suite |
| `./vendor/bin/pint` | `backend/` | Fixes backend PHP formatting (PSR-12) |
| `php artisan tindatrack:check` | `backend/` | Reconciles customer utang balances and stock movements |
| `npm run build` | `frontend/` | Builds production SPA bundle |
| `npx eslint src` | `frontend/` | Lints frontend codebase with strict rules |
| `node scripts/check-contract.mjs` | `frontend/` | Verifies frontend API service contracts match Laravel routes |
| `node scripts/check-services.mjs` | `frontend/` | Verifies mock and API service methods match 1-to-1 |
| `node scripts/check-mockdata.mjs` | `frontend/` | Validates in-memory mock datasets and generator |
| `npm run check:i18n` | Root / `frontend/` | Verifies 100% dictionary key parity across all 18 namespaces between `en` and `fil` |
| `npm run check:bundle` | Root / `frontend/` | Verifies production bundle size and ensures zero memory/bundle leaks |
| `npm run smoke:pairing` | Root | Headless WebSocket pairing smoke test between POS station and phone scanner |
| `npm run smoke:prod` | Root | Production-like pre-flight smoke test verifying build assets, Vercel SPA rewrites, and Railway deployment configs |

> **Note on Frontend Quality Checks:** Always run `npm run test` (Vitest) in `frontend/` when verifying changes. `npm run build` and `npx eslint src` validate syntax and static imports, but **only Vitest renders components in jsdom**, catching runtime errors such as missing Radix/UI imports or null form controls.

---

## Deployment

For step-by-step instructions on deploying the Laravel API and MySQL to **Railway** and the React SPA to **Vercel**, refer to the deployment documentation:

👉 **[Deployment Guide](docs/DEPLOY.md)**

---

## License

This project is open-source school coursework developed for Integrative Programming.
