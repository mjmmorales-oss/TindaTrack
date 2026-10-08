# Changelog — TindaTrack Phase 3

All notable changes in Phase 3 of TindaTrack are documented here.

## [v1.0.0] - Phase 3 Complete

### Backend (Laravel 13 & MySQL)
- **Database Schema**: Full production schema migrations for `categories`, `products`, `customers`, `sales`, `sale_items`, `utang_payments`, `stock_movements`, `settings`, `sale_counters`, and `users` (`last_login_at`).
- **Models & Enums**: Eloquent models with strict relations, typed enums (`StockMovementType`, `PaymentType`, `SaleStatus`), attribute casts, and model factories. Strict mode active in non-production.
- **Idempotent Seeders**:
  - `ReferenceDataSeeder`: Stores settings, 10 categories, 58 products with barcodes/SKUs, 12 customers, and 3 demo users using `updateOrCreate`.
  - `DemoHistorySeeder`: Generates 60 days of realistic sales, utang, voided transactions, and stock movements with reproducible PRNG (`mt_srand(20261007)`). Runs once when sales table is empty.
- **Reconciliation Engine**: `php artisan tindatrack:check` command verifying Σ customer balance = Σ unpaid utang − Σ payments, stock integrity against movements, no negative stock, and sale number uniqueness.
- **Atomic Business Actions**:
  - `CreateSaleAction`: Row-locked product inventory decrements, sequential Manila sale numbers (`TT-YYYYMMDD-####`), cash tender validation, and customer credit limit checks.
  - `VoidSaleAction`: Owner-only voiding requiring ≥ 5 char reason, restoring product stock, reversing customer balance, and recording audit details.
  - `RecordPaymentAction`: Safe debt reduction with positive balance validation and payment ledger records.
  - `AdjustStockAction`: Non-negative inventory corrections with movement tracking.
- **High-Performance Reporting & Dashboard**:
  - SQL aggregate endpoints for Dashboard metrics and full Reports (sales over time, gross margins, best sellers, category distribution, hourly heatmaps) excluding voided sales.
- **Security & Authorization**:
  - Role-based routing (`role:owner` and `role:owner,cashier`), token revocation on user deactivation, guard against deactivating self or last active owner, and cashier-scoped sale visibility.
  - Production proxy trust (`trustProxies(at: '*')`), `/up` healthcheck endpoint, JSON fallback on `GET /`.
- **Test Suite**: 41 comprehensive Pest feature tests (206 assertions) validating all business logic, permission gates, transactions, and edge cases.

### Frontend (React 19 & Vite 8)
- **API Services & Mock Fallback**: Modular service layer (`src/services/api/*` and `src/services/mock/*`) dynamically selected via `VITE_DATA_SOURCE`. Unified Axios error handling with `ApiError` mapping.
- **Contract Verification**: `scripts/check-contract.mjs` verifying 37 service contracts against Laravel routes.
- **Phase 3A/3B Polish & Motion**:
  - `motion/react` subtle page transitions and cart item list animations (`AnimatePresence`) honoring `prefers-reduced-motion` via `MotionConfig`.
  - 4 states across all queries (loading skeletons, empty state with CTA, error state with retry, and data view).
  - Complete accessibility overhaul (aria-labels, tooltip wrappers, form field aria bindings, focus rings).
  - Global `OfflineBanner`, 401/403 automated toast handlers and redirects.
- **Phase 3C Power Features**:
  - Hold/Park sales in POS: park up to 3 active carts with badge counts, resume, or discard.
  - Command Palette: ⌘K / Ctrl+K modal with role-filtered navigation, fast actions, and instant product search.
  - Shortcuts Help Dialog: Keyboard reference modal triggered with `?` key.
  - Dynamic Sidebar Badges: Live counts for low/out-of-stock inventory and overdue debtors.
  - Thermal Receipt Printing: 58mm and 80mm roll formatting with dynamic store settings (`store_name`, `address`, `contact_number`, `receipt_footer`).
- **Phase 3D Performance**:
  - Route-level code splitting using `React.lazy` and `Suspense`.
  - Dev pages conditionally excluded in production builds.
  - Vite `manualChunks` optimization separating recharts, motion, radix, router, tanstack, lucide, and date libraries, reducing main index bundle by >160 kB.

### Deployment Preparation
- **Railway**: Production configuration (`railway.toml` and `nixpacks.toml`) with pre-deploy migration/seeding commands and health probes.
- **Vercel**: `vercel.json` SPA routing rewrites.
- **Documentation**: Comprehensive step-by-step `docs/DEPLOY.md` guide and complete root `README.md`.
