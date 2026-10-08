# TindaTrack

> A web-based Point-of-Sale (POS) and inventory management system purpose-built for Philippine sari-sari stores.

TindaTrack digitizes traditional pen-and-paper sari-sari store operations (*lista ng utang*, *sukli*, *benta*, and stock reorders) with a fast, touch-friendly, mobile-first interface designed for phones, tablets, and desktop POS stations.

---

## Features

- **⚡ Fast POS**: Barcode and SKU search, quick categories, numeric keypad, cash change calculation (*sukli*), and cart parking (up to 3 held carts).
- **📒 Digital Utang Ledger**: Track credit balances per suki, payment recordings, 30-day aging alerts, and credit limit enforcement with owner overrides.
- **📦 Inventory & Stock Movements**: Real-time stock counts, low/out-of-stock badges, atomic stock deductions, and audit movement logs.
- **📊 Analytics & Reports**: Gross profit, sales over time (daily/weekly/monthly), best-selling products, category distribution, and peak hours.
- **🖨️ Thermal Receipts**: 58mm and 80mm printable receipts with custom store headers, footers, and void audit trails.
- **👥 Role-Based Access Control**: Separate permissions for Store Owner (full access, staff management, void sales, cost prices) and Cashiers.
- **⌨️ Keyboard & Power Tools**: ⌘K / Ctrl+K Command Palette, keyboard shortcuts (`F2`, `F9`, `Esc`, `?`), and offline indicator.

---

## Tech Stack

- **Frontend**: React 19 SPA, Vite 8, Tailwind CSS v4, shadcn/ui (Radix primitives), TanStack Query v5, Zustand, React Hook Form + Zod, `motion/react`, `lucide-react`.
- **Backend**: Laravel 13, PHP 8.3+, Laravel Sanctum (Bearer token authentication), Form Requests, API Resources, Pest PHP test suite.
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

- **PHP 8.3+** with extensions: `pdo_mysql`, `bcmath`, `mbstring`, `intl`
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
| `php artisan test` | `backend/` | Runs Pest feature test suite |
| `./vendor/bin/pint` | `backend/` | Fixes backend PHP formatting (PSR-12) |
| `php artisan tindatrack:check` | `backend/` | Reconciles customer utang balances and stock movements |
| `npm run build` | `frontend/` | Builds production SPA bundle |
| `npx eslint src` | `frontend/` | Lints frontend codebase |
| `node scripts/check-contract.mjs` | `frontend/` | Verifies frontend API service contracts match Laravel routes |
| `node scripts/check-mockdata.mjs` | `frontend/` | Validates in-memory mock datasets and generator |

---

## Deployment

For step-by-step instructions on deploying the Laravel API and MySQL to **Railway** and the React SPA to **Vercel**, refer to the deployment documentation:

👉 **[Deployment Guide](docs/DEPLOY.md)**

---

## License

This project is open-source school coursework developed for Integrative Programming.
