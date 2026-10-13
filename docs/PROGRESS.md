# TindaTrack Phase 3 Progress Tracker

Tracking implementation of Phase 3 tasks (T0–T11).

- [x] **T0 — Pre-Flight & Spec**: Pre-flight setup, API specification in `docs/API.md`, updated `AGENTS.md`, progress checklist.
- [x] **T1 — Database Schema**: Migrations, models, casts, enums, factories, strict mode in AppServiceProvider.
- [x] **T2 — Seeders**: Idempotent seeders with `updateOrCreate`, realistic demo history (`mt_srand(20261007)`), `tindatrack:check` reconciliation command.
- [x] **T3 — Core API**: Reusable list query helper, Actions inside transactions with row locks, Form Requests, API Resources, and Controllers for categories, products, customers, sales, utang, inventory, staff, settings, account.
- [x] **T4 — Dashboard + Reports API**: High-performance SQL aggregates for dashboard (owner & cashier) and reports (sales over time, best sellers, categories, hourly).
- [x] **T5 — Backend Test Suite**: Comprehensive Pest tests for all business logic, permission gates, transactions, and edge cases.
- [x] **T6 — Frontend on Real API**: Real API services in `src/services/api/*`, mock fallback in `src/services/mock/*`, thin facades, contract verification script.
- [x] **T7 — Phase 3A+3B: Motion, States, Accessibility**: motion/react subtle transitions, 4 page states, a11y labels, form linkings, focus rings.
- [x] **T8 — Phase 3C: Power Features**: Park/hold sales, command palette (⌘K), keyboard shortcuts dialog (?), sidebar badges, receipt printing.
- [x] **T9 — Phase 3D: Performance & Hardening**: Code splitting (React.lazy), chunk optimization, proxy trust, health check, production hardening.
- [x] **T10 — Deploy Prep**: Railway & Vercel deployment configuration, `docs/DEPLOY.md` guide, `README.md` updates.
- [x] **T11 — Final Bug Hunt, Merge, Tag**: Code-only scan, fix edge cases, merge `phase-3` to `main`, tag `v1.0.0`.

---
## Task Log
- **T0**: Completed pre-flight, verified branch `phase-3`. Produced `docs/API.md` mapping all service functions to future Laravel endpoints and contracts. Updated `AGENTS.md` and initiated `docs/PROGRESS.md`.
- **T1**: Created business schema migrations (categories, products, customers, sales, sale_items, utang_payments, stock_movements, settings, sale_counters), models with relations/casts, enums (StockMovementType, PaymentType, SaleStatus), factories, and strict mode in AppServiceProvider.
- **T2**: Implemented ReferenceDataSeeder (users, settings, 10 categories, 58 products, 12 customers with updateOrCreate), DemoHistorySeeder (60 days realistic sales, utang, voids, stock movements with mt_srand(20261007), ~14s seed time, idempotent), and tindatrack:check command with 100% reconciliation passing.
- **T3**: Implemented ListQuery helper, atomic Actions (CreateSale, VoidSale, RecordPayment, AdjustStock), API Resources, delete guards, staff toggle with owner safeguards, and routes in routes/api.php matching docs/API.md.
- **T4**: Implemented SQL-aggregated DashboardController and ReportController (sales over time, best sellers, category breakdown, hourly) excluding voided sales, and added Pest feature tests verifying aggregate accuracy.
- **T5**: Added 41 comprehensive Pest feature tests covering all roles/permissions, inactive user blocks, cash/utang sales, oversell prevention, concurrent locks, credit limits and owner override, void reversals, payments, delete guards, stock adjustments, daily counter resets, staff safeguards, list query filtering/sorting/pagination meta, and 422 error structures. All green, pint passed.
- **T6**: Modularized services into real `src/services/api/*` and `src/services/mock/*` with thin facades controlled by `VITE_DATA_SOURCE`. Unified Axios error handling to `ApiError`. Connected real password update in Account, removed prototype banner in api mode, hid reset demo data in API mode. Added `scripts/check-contract.mjs` verifying all 37 service contracts against Laravel routes. Build, lint, mock check, contract check all green.
- **T7**: Integrated `MotionConfig` with `reducedMotion="user"`, page entrance transitions in `PageContainer`, cart add/remove item transitions with `AnimatePresence`, global `OfflineBanner`, 401/403 event toasts and redirect handling in `api.js` and `AuthContext`. Audited all icon buttons for accessible `aria-label`s and updated `index.html` title. Build and ESLint passed.
- **T8**: Implemented hold sales in `cartStore` (up to 3 parked carts, resume/discard, badge counter in CartPanel/CartDrawer), Command Palette (`CommandPalette.jsx` triggered via ⌘K/Ctrl+K with role-aware nav, actions, quick product search), Shortcuts Help Dialog (`ShortcutsHelpDialog.jsx` triggered via `?`), dynamic sidebar badges in `NavMain` (low/out stock count, overdue utang debtors), and thermal 58/80mm receipt printing with dynamic store settings in `SaleDetailPage` and `@media print` CSS. Build and ESLint passed.
- **T9**: Optimized frontend bundle with route lazy loading, DEV-only conditional inclusion of dev routes, and Vite manualChunks (recharts, motion, radix, router, tanstack, lucide, date); reduced main bundle from 876 kB to 715 kB (220 kB gzip). Hardened backend with `GET /` returning JSON `{name, status}`, verified `trustProxies(at: '*')`, `/up` health route, rate limits, eager loading across all index methods, and production .env documentation. All 41 Pest tests, pint, build, and ESLint passed.
- **T10**: Prepared deployment configuration for Railway (`backend/railway.toml` with NIXPACKS, pre-deploy migration/seed, healthcheck `/up`, and `backend/nixpacks.toml` public root configuration) and Vercel (`frontend/vercel.json` SPA rewrites). Authored click-by-click beginner deployment guide in `docs/DEPLOY.md` and complete project documentation in `README.md`. Production config/route cache and build gates verified green.
- **T11**: Conducted final bug hunt and integrity audit: backend tests (41/41 passing), pint (passed), reconciliation (`tindatrack:check` 100% clean), route audit (47 api routes), frontend build & ESLint (0 errors), contract check (37/37 passing), mock data check (discrepancy ₱0.0000), and comprehensive grep scans (zero console.log, zero debugger, zero TODO/FIXME, zero react-router-dom, zero .ts/.tsx, zero hex colors in features, zero unhandled errors). Authored `docs/CHANGELOG.md`. Merged `phase-3` into `main` and tagged `v1.0.0`.

---
## Runtime Audit (F1–F6)
- [x] **F1 — Strict Linter**: Catch undefined components (`no-undef`, `react/jsx-no-undef`), unused vars, react-hooks rules.
- [x] **F2 — Render Tests**: Headless jsdom route and interaction smoke tests using Vitest + RTL.
- [x] **F3 — Fix Runtime Failures**: Fix missing UI imports (`/inventory`), null form controls (`/settings`), and all failures found by F2.
- [x] **F4 — Systematic Code Audit**: Imports graph, mock vs API service contract checks, hook safety, data shape guards.
- [x] **F5 — API-Mode Sanity**: Backend Resource field alignment with frontend models, contract verification.
- [x] **F6 — Wrap Up**: Documentation, full test verification, merge to `main`, and tag `v1.0.1`.

### F1 Log:
- Implemented strict flat ESLint config in `frontend/eslint.config.js` with `no-undef`, `react/jsx-no-undef`, `react/jsx-uses-vars`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, and `unused-imports`.
- Caught and resolved missing `Table` imports in `InventoryPage.jsx` and missing `cmdOpen`/`shortcutsOpen` dialog states in `PosLayout.jsx`.
- Cleaned all unused imports and variables across `src`. `npx eslint src` (0 errors) and `npm run build` both passing.

### F2 & F3 Log:
- Built headless test harness in `src/test`: `setup.js` (DOM stubs: ResizeObserver, IntersectionObserver, matchMedia, print, scrollIntoView), `server.js` (mock DB reset & data source forcing), `renderRoute.jsx` (providers wrapper with QueryClient, MemoryRouter, Theme, and AuthContext with mock roles).
- Implemented table-driven route smoke test `src/test/routes.test.jsx` covering all 33 router routes across roles with error-boundary and console.error assertions.
- Implemented interaction smoke test `src/test/interactions.test.jsx` covering 11 critical flows: Add/Edit dialogs (products, categories, customers, staff), tabs (/inventory, /settings, /customers/:id), and payment/stock dialogs.
- Fixed `SettingsPage.jsx` null `control` runtime crash by explicitly passing `control={control}` and `name="..."` to FormInput/FormTextarea, adding defensive guards in form components, and fixing missing `errors` in `useForm` destructuring.
- Fixed DOM attribute leakage on Radix primitives (`indicatorClassName` on Progress, `hasError` on PasswordInput).
- Made services dynamically delegate to mock implementations in test mode via Proxy to ensure isolated headless testing without backend server dependencies.
- 44 of 44 Vitest tests passing; ESLint (0 errors/warnings) and Vite build clean.

### F4 Log:
- Created `frontend/scripts/check-services.mjs` comparing all 10 service pairs across mock and API implementations and validating all hook calls; all 37 service methods matched 1-to-1.
- Validated import graph: zero broken imports and zero pre-T6 imports across `src/`.
- Validated routes: all 11 paths in `nav.js` map to router paths, and all lazy routes resolve to existing exports.
- Audited environment variables: documented `VITE_MOCK_LATENCY` in `.env.development` and `.env.production.example`.
- Fixed data shape vulnerabilities:
  - `src/features/products/components/ProductFormDialog.jsx:44` -> guarded `categories.map` with `(categories || []).map(...)`.
  - `src/features/customers/pages/CustomersPage.jsx:542` -> safe `Number(blockedCustomer?.credit_balance || 0).toFixed(2)`.
  - `src/features/customers/pages/CustomerDetailPage.jsx:126` -> cast `credit_balance` and `credit_limit` to `Number(...)`.
  - `src/features/utang/components/RecordPaymentDialog.jsx:35` -> cast `currentBalance` to `Number(...)`.
  - `src/features/utang/pages/UtangPage.jsx:112-150` -> cast aging bucket values to `Number(...)`.
- Gates passed: `node scripts/check-services.mjs`, `npx eslint src` (0 errors), `npm run build`, and `npx vitest run` (44/44 green).

### F5 Log:
- Verified all 37 frontend API service endpoints against registered Laravel routes (`php artisan route:list --path=api --json`) with `scripts/check-contract.mjs` (exited 0).
- Audited all API Resource classes (`CategoryResource`, `CustomerResource`, `ProductResource`, `SaleItemResource`, `SaleResource`, `SettingResource`, `StockMovementResource`, `UserResource`, `UtangPaymentResource`). Added `'stock'` alias in `ProductResource` for compatibility with UI components.
- Verified backend suite: `php artisan test` (41/41 passing), `./vendor/bin/pint --test` (passed), and `php artisan tindatrack:check` (100% reconciled).

### F6 Log:
- Documented testing protocol in `README.md` and `docs/PROGRESS.md`: developers MUST run `npm run test` (Vitest) for every change, because build and lint do not render components.
- Final pass verified all gates across frontend and backend:
  - Frontend: `npx vitest run` (44 tests pass), `npx eslint src` (0 errors), `npm run build` (success), `node scripts/check-contract.mjs` (37/37 pass), `node scripts/check-services.mjs` (37/37 pass), `node scripts/check-mockdata.mjs` (pass).
  - Backend: `php artisan test` (41/41 pass), `./vendor/bin/pint --test` (pass), `php artisan tindatrack:check` (100% pass).
- Merged `fix/runtime-audit` to `main`, pushed, and tagged `v1.0.1`.

---
## Final Polish (A1–A4)
- [x] **A1 — Duplicate Navigation**: Eliminate duplicate header in LandingPage, ensure single layout chrome across all routes.
- [x] **A2 — Demo Credentials**: Gate demo accounts behind `SHOW_DEMO_ACCOUNTS` (local dev only), update docs and tests.
- [x] **A3 — Duplication & Layout Guards**: Extend Vitest suite to assert single banner/nav/h1 and non-duplicated CTAs.
- [x] **A4 — Full Bug Sweep & Release**: Comprehensive audit, zero-warning sweep, merge to `main`, tag `v1.0.2`.

### A1 Log:
- Removed duplicate `<header>` and `<footer>` from `LandingPage.jsx`; `PublicLayout.jsx` now strictly owns public chrome.
- Unified public CTA button labels across header and hero to `Magsimula` and `Sign In`.
- Audited all 22 page components across the application to ensure none render duplicate `<header>`, `<nav>`, or extra `<h1>` elements.
- ESLint (0 errors/warnings) and Vite production build passed.

### A2 Log:
- Created `src/config/app.js` exporting `SHOW_DEMO_ACCOUNTS` based on `import.meta.env.DEV && import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false'`, ensuring production builds hide demo credential switchers unconditionally.
- Gated demo account buttons in `LoginPage.jsx` behind `SHOW_DEMO_ACCOUNTS`; replaced all demo placeholders with generic placeholders (`you@email.com`, `cashier@email.com`) across `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, and `StaffPage`.
- Updated `frontend/.env.development` and `frontend/.env.production.example` (set to `false` with documentation).
- Updated `docs/DEPLOY.md` documenting that Vercel must not set `VITE_SHOW_DEMO_ACCOUNTS=true` and provided seeded demo account reference table directly in the deployment guide for presentation use.
- Added Vitest test `src/test/auth.test.jsx` verifying that when `SHOW_DEMO_ACCOUNTS` is false, no demo credentials strings appear in the rendered login page.
- Verified `grep -rn "tindatrack.test" src` returns only the gated UI/test/mock database files. ESLint and build passed.

### A3 Log:
- Extended `src/test/routes.test.jsx` with `assertLayoutIntegrity`:
  - Enforces at most 1 element with role `banner` (`<header>`).
  - Enforces at most 1 primary navigation element (`<nav>` filtering breadcrumbs and pagination).
  - Enforces exactly 1 `<h1>` (or 0 for `/pos`, explicitly documented in `ROUTES_WITHOUT_H1`).
  - Enforces no duplicated CTA button labels in top chrome.
- Vitest suite (45 tests across 3 files) passed green.

### A4 Log:
- Executed full static and runtime sweep:
  - Cleaned double-language parenthetical labels in `LandingPage.jsx` and `PublicLayout.jsx` (`Magsimula (Register)` -> `Magsimula`, `Magbayad (Pay)` -> `Magbayad`).
  - Guarded numeric string formatting and aria labels in `MobileCartBar.jsx` and `PaymentDialog.jsx` with `Number(... || 0)`.
  - Tuned async find timeouts in `interactions.test.jsx` and `routes.test.jsx` for rock-solid headless execution under load.
  - Verified static hygiene clean: 0 console.log, 0 debugger, 0 TODO/FIXME, 0 react-router-dom, 0 .ts/.tsx files, 0 hex colors in `src/features`.
- Verification gates passed across entire stack:
  - Frontend: `npx vitest run` (45/45 pass), `npx eslint src` (0 warnings/errors), `npm run build` (success), `node scripts/check-contract.mjs` (37/37 pass), `node scripts/check-services.mjs` (37/37 pass), `node scripts/check-mockdata.mjs` (pass).
  - Backend: `php artisan test` (41/41 pass), `./vendor/bin/pint --test` (pass), `php artisan tindatrack:check` (100% pass).
- Merged `fix/final-polish` to `main` and tagged `v1.0.2`.

---
## Deep audit (C1–C7)
- [x] **C1 — The Confirmed Bug (Products)**: Complete default entity in create mode, robust `row.original` and `category_id` handling in table columns, mobile cards, and details.
- [x] **C2 — Deep Test Harness**: Comprehensive flow, dialog, edge-state, and role interaction tests with `@testing-library/user-event`.
- [x] **C3 — Page-by-Page Critical Read**: Surgical audit of all 22 page routes, ensuring loading guards, error states, and responsive contracts.
- [x] **C4 — Cross-Cutting Correctness**: Query keys, cart store, auth session, permissions parity, numeric casting, date handling.
- [ ] **C5 — Backend and Contract**: API Resource parity, validation rules alignment, N+1 eager loading, row-locking transaction guarantees.
- [ ] **C6 — Hygiene Sweep**: Zero console.log, debugger, TODO/FIXME, react-router-dom, TS files, hex colors, dead exports.
- [ ] **C7 — Final Verification & Release**: Re-run all test suites and checks, merge to `main`, tag `v1.0.3`.

### C1 Log:
- `ProductsPage.jsx:365` -> `renderMobileCard` was reading `row.original` when `DataTable` already passes `row.original` directly as the first argument, causing `p` to be `undefined` and throwing `Cannot read properties of undefined (reading 'category_id')` on mobile viewports. Fixed with `const p = row?.original || row || {}` and guarded `(p.category_id && categoryMap[p.category_id]) || 'Iba pa'`.
- `ProductsPage.jsx:219` -> Guarded `category_id` table cell with `const p = row?.original || row || {}`.
- `ProductFormDialog.jsx` -> Exported and utilized `DEFAULT_PRODUCT` providing a full default entity for create mode (`name: ''`, `category_id: ''`, `sku: ''`, `barcode: ''`, `unit: 'pc'`, `price: 0`, `cost_price: 0`, `stock_quantity: 0`, `reorder_level: 10`, `is_active: true`, `description: ''`) instead of undefined properties.
- `ProductDetailPage.jsx:69` -> Safely guarded category memoization with `product?.category_id`.
- Gates passed: `npx eslint src` (0 errors) and `npm run build` (success).

### C2 Log:
- Implemented deep interaction and flow test harness:
  - `src/test/flows.test.jsx` (13 tests): End-to-end user flows driving real UI interactions with `@testing-library/user-event` (cash sale, utang sale, inline new suki creation, oversell blocked, credit limit with cashier block & owner override, void with reason & stock/utang reversal, payment recording & overpayment rejection, product CRUD & stock adjustments, category delete constraints, customer phone validation & balance delete guards, cashier staff management & owner deactivation block, settings persistence & receipt update, table filters/search/pagination).
  - `src/test/dialogs.test.jsx` (19 tests): Renders every create/edit dialog in both empty and seeded modes (ProductFormDialog, CategoryFormDialog, CustomerFormDialog, Cashier dialog, AdjustStockDialog, BulkRestock, PaymentDialog cash/utang, NewCustomerMiniForm, ConfirmDialogs) with zero console errors.
  - `src/test/edge-states.test.jsx` (12 tests): Resilient rendering of EmptyState across all 7 list pages when DB is empty, 404 error states on invalid detail route IDs, and ErrorState with Retry when services throw.
  - `src/test/roles.test.jsx` (14 tests): Role-based action presence/absence and 403 Forbidden boundary enforcement for cashiers trying to access owner-only routes.
- Latent bugs discovered and resolved:
  - `src/components/common/EmptyState.jsx:27` -> `EmptyState` ignored `actionText` and `onAction` props passed by `ProductsPage.jsx` and `CategoriesPage.jsx`. Fixed by rendering fallback CTA button.
  - `src/components/common/ErrorState.jsx:18` -> `ErrorState` dropped `description`, `actionText`, and `onAction` props passed by detail pages. Fixed prop acceptance and action button.
  - `src/services/mock/utangService.js:159` -> `customer.credit_balance.toFixed(2)` threw when credit_balance was null/undefined. Guarded with `Number(customer.credit_balance || 0).toFixed(2)`.
  - `src/features/products/schemas.js` -> Moved `DEFAULT_PRODUCT` constant into `schemas.js` to eliminate fast refresh export warning in `ProductFormDialog.jsx`.
  - `vite.config.js` -> Configured `fileParallelism: false` in test config to prevent cross-file state clobbering in the shared in-memory mock database.
- Gates passed: `npx vitest run` (103/103 tests green, up from 45), `npx eslint src` (0 errors/warnings), `npm run build` (success).

### C3 Log:
- Methodical page-by-page critical audit of all 22 application routes and subcomponents:
  - `PaymentDialog.jsx:87-89` -> Raw arithmetic on `currentCreditBalance` and `creditLimit` risked string concatenation when API returns decimal strings ("250.00"). Converted safely with `Number(...)`.
  - `SalesPage.jsx:320` -> `renderMobileCard` destructured `sale.status` directly. Guarded with `const s = sale?.original || sale || {}` and used `s` throughout mobile card renderer.
  - `CustomersPage.jsx:93` -> `handleDeleteClick` checked `customer.credit_balance > 0` without numeric cast. Guarded with `Number(customer?.credit_balance || 0) > 0`.
  - `CustomersPage.jsx:292` -> `renderMobileCard` destructured `customer.name` without row fallback. Guarded with `const c = customer?.original || customer || {}` and `Number(c.credit_balance || 0) > 0`.
  - `CustomerDetailPage.jsx:83` -> `handleDeleteClick` checked `(customer?.credit_balance || 0) > 0`. Guarded with `Number(customer?.credit_balance || 0) > 0`.
  - `UtangPage.jsx:314` -> `renderMobileCard` destructured `debtor.days_overdue` directly. Guarded with `const d = debtor?.original || debtor || {}` and used `d` throughout mobile card renderer.
  - `RecordPaymentDialog.jsx:67` -> `useEffect` reset `amount: customer.credit_balance` directly without cast. Wrapped with `Number(customer.credit_balance || 0)`.
- Gates passed: `npm run build` (success), `npx eslint src` (0 errors/warnings), `npx vitest run` (103/103 tests green).

### C4 Log:
- Cross-cutting audit of query keys, cart, auth session, permissions, and numeric/date integrity:
  - Query Invalidation Completeness: Added `['reports']` invalidation to `useCreateSale`, `useVoidSale`, and `useRecordPayment`; added `['categories']` invalidation to product mutations, and `['products']` invalidation to category mutations.
  - Cart State Robustness: Verified store persistence, maximum 3 held/parked sales, non-negative quantity clamping, and float round safety with `toMoney`.
  - Session Cache Purge: Integrated `useQueryClient` into `AuthContext.jsx` to execute `queryClient?.clear()` on `clearSession()`, guaranteeing that signing out purges all cached tenant queries from memory.
  - Permissions Parity: Cross-checked `src/config/permissions.js` against backend `role:owner` and `role:owner,cashier` middleware. Abilities match backend route authorization with zero divergence.
  - Numeric Type Coercion: Guarded table cell calculations and badges in `CustomersPage.jsx` and `UtangPage.jsx` with `Number(...)`.
- Gates passed: `npm run build` (success), `npx eslint src` (0 errors/warnings), `npx vitest run` (103/103 tests green).

### C5 Log:
- Verified backend and contract parity across API resources, controllers, and validation rules:
  - `php artisan test` (41/41 passing, 206 assertions).
  - `./vendor/bin/pint --test` (passed, zero style issues).
  - `php artisan tindatrack:check` (100% reconciled: product stock, movements, utang balances, payments, unique sale numbers).
  - Contract & Service verification: `check-contract.mjs` (37/37 contracts verified against Laravel API routes), `check-services.mjs` (10/10 services matched 1-to-1 between mock and API), `check-mockdata.mjs` (₱0.0000 balance discrepancy).
  - Resource field parity: Updated `SettingResource.php` to include `contact_number` alias alongside `phone` to ensure exact compatibility with frontend settings forms, and updated `SettingsController.php` to merge `contact_number` into `phone` if supplied.
  - Eager loading & locking: Audited all index controllers for eager relations (`::with(...)`) and verified that transactional writes in actions (`CreateSaleAction`, `VoidSaleAction`, `AdjustStockAction`, `RecordPaymentAction`) lock rows with `lockForUpdate()`.

### C6 Log:
- Performed exhaustive hygiene sweep across frontend and backend:
  - `console.log`: 0 hits across `frontend/src`.
  - `debugger`: 0 hits across `frontend/src`.
  - `TODO|FIXME`: 0 hits in `frontend/src` or `backend/app`.
  - `react-router-dom`: 0 hits in `frontend/src` (all use React Router v8 `react-router`).
  - `.ts` / `.tsx`: 0 files in `frontend/src`.
  - Hex colors in `src/features`: 0 hits (all use Tailwind semantic theme tokens).
  - `dangerouslySetInnerHTML`: Only 1 hit in `src/components/ui/chart.jsx:62` (shadcn ChartStyle injecting CSS variables).
  - `dd(` / `dump(`: 0 hits in `backend/app`.
  - Hard-coded localhost: Only fallback default in `src/lib/api.js` and standard Laravel `config/*` defaults.
  - Demo credentials: Sole usage in `LoginPage.jsx` is guarded by `{SHOW_DEMO_ACCOUNTS && (...)}`, with test coverage in `auth.test.jsx`.
- Gates passed: `npm run build` (success), `npx eslint src` (0 errors/warnings), `npx vitest run` (103/103 tests green), `php artisan test` (41/41 green), `./vendor/bin/pint --test` (clean).

### C7 Log:
- Full verification suite executed and passing across frontend and backend:
  - `npx vitest run`: 7 test files, 103 passed, 0 failed.
  - `npx eslint src`: 0 errors, 0 warnings.
  - `npm run build`: Production bundle compiled cleanly.
  - `node scripts/check-contract.mjs`: 37 API endpoint contracts verified against registered Laravel routes.
  - `node scripts/check-services.mjs`: 10/10 mock/api service contracts matched 1-to-1.
  - `node scripts/check-mockdata.mjs`: ₱0.0000 discrepancy, all balance reconciliations verified.
  - `php artisan test`: 41/41 Pest tests passed (206 assertions).
  - `./vendor/bin/pint --test`: Clean PSR-12 code style.
  - `php artisan tindatrack:check`: 100% database reconciliation passed.
- Documentation updated: `docs/CHANGELOG.md` and `docs/PROGRESS.md` tagged and released as v1.0.3.
- Merged `audit/deep-sweep` into `main`, pushed to GitHub, tagged `v1.0.3`.

---
## UI Polish & Layout Containment (D1–D4)
- [x] **D1 — Layout Containment**: Structurally contain shell and tables (AppLayout, Topbar, PageContainer, PageHeader, table.jsx, DataTable, and all table pages).
- [x] **D2 — Adjust Stock Product Picker & Dialog Entry Points Audit**: Searchable Command + Popover product picker when opened without product; read-only card when passed; audit all dialog entry points.
- [x] **D3 — Automated Test Coverage**: Lock in containment and dialog entry points with tests (`containment.test.jsx`, `entrypoints.test.jsx`).
- [x] **D4 — Final Verification & Release**: Run full test suites across frontend and backend, update docs, merge to main, and tag `v1.0.4`.

### D1 Log:
- Shell containment: Added `min-w-0 w-full overflow-x-hidden` to `SidebarInset` and `<main>` in `AppLayout.jsx`.
- Header & Topbar containment: Added `min-w-0 w-full` to `Topbar.jsx`. In `PageHeader.jsx`, added `min-w-0 flex-1 space-y-1` to title container, responsive `line-clamp-2 sm:truncate` on the title heading, and `shrink-0` on action buttons.
- Table containment: Added `overflow-x-auto min-w-0` scroll container wrapper, `data-slot="table-container"`, and `min-w-max` on `<table>` in `src/components/ui/table.jsx`. Added `min-w-0 w-full` wrapper to `DataTable.jsx`.
- Contained tables across `CustomerDetailPage.jsx`, `InventoryPage.jsx`, `ReportsPage.jsx`, `StaffPage.jsx`, and `SettingsPage.jsx`.

### D2 Log:
- Rewrote `AdjustStockDialog.jsx`: When `product` is null, renders Command + Popover product picker with name, SKU, barcode search and current stock badge; all form inputs remain disabled until a product is selected. When `product` is provided, displays read-only header card.
- Wired `/inventory` toolbar button to open `AdjustStockDialog` with `product={null}`.
- Audited all dialog entry points (`BulkRestockDialog`, `RecordPaymentDialog`, `ProductFormDialog`, `CustomerFormDialog`, `CategoryFormDialog`, `PaymentDialog`, `HeldCartsDialog`, `ConfirmDialog`, void sale) and verified props passed.

### D3 Log:
- Created `src/test/containment.test.jsx` (7 tests) validating PageHeader rendering, table scroll container presence, and no fixed widths > 320px without breakpoint prefix across all table pages.
- Created `src/test/entrypoints.test.jsx` (12 tests) verifying AdjustStockDialog toolbar picker vs row modes, stock mutation correctness, and all dialog entry point configurations.
- Full Vitest suite expanded from 103 to 123 tests across 9 test files (100% green).

### D4 Log:
- Ran full frontend test and verification suite: Vitest (123/123 tests green), ESLint (0 errors), build (clean), contract check (37/37 routes), service parity (10/10 matched), mock data check (₱0.0000 discrepancy).
- Ran full backend test suite: Pest (41/41 tests green, 206 assertions), Pint (clean), `tindatrack:check` (100% reconciled).
- Updated `docs/CHANGELOG.md` and `docs/PROGRESS.md`. Merged to `main` and tagged `v1.0.4`.

---
## TindaTrack v1.1.0: Barcode Scanning, Open Food Facts Auto-Fill, and Phone-to-POS Live Sync (B0–B12)

- [x] **B0 — Preflight**: Repository sanity, baseline test gates, branch creation `feat/barcode-scan`, barcode feature map.
- [x] **B1 — Backend Schema**: Migrations for products columns (`image_url`, `brand`, `size`, `source`, `source_ref`), `barcode_catalog`, `scanner_sessions`, and `scanner_events`. Models, relationships, and casts.
- [x] **B2 — Barcode Rules & Open Food Facts Lookup**: `App\Support\Barcode` helpers, services config, `ProductLookupService`, `GET /api/barcode-lookup/{barcode}`, Pest tests with `Http::fake`.
- [x] **B3 — Scanner Sessions & Realtime**: `scanner.device` middleware, authenticated session endpoints, device endpoints (pair, scan, heartbeat), Pusher broadcasting and polling feed, Pest tests.
- [x] **B4 — Backend Hardening**: Mass assignment, authorization, N+1, index checks, reconciliation, routes audit.
- [x] **B5 — Frontend Scanning Core**: `barcode-detector`, `qrcode.react`, `jsbarcode`, `laravel-echo`, `pusher-js`. `lib/barcode.js`, `useCameraScanner`, `feedback.js`, `CameraScanner.jsx`, `ScannerSheet.jsx`, `useBarcodeWedge`.
- [x] **B6 — Frontend Services & Realtime Layer**: `barcode.js`, `scanner.js` (api + mock), `lib/realtime.js` polling and Pusher driver, Vitest tests.
- [x] **B7 — POS Integration**: POS header actions ("I-scan", "Ikonekta ang Phone"), wedge support, `handleScannedCode`, `PairPhoneDialog`, phone scanner badge & subscription.
- [x] **B8 — Phone Scanner Page (`/scan`)**: Public minimal layout, pair flow, continuous camera scan, scan feedback, last scans list, wake lock, heartbeat.
- [x] **B9 — Owner Product Flows**: Product form auto-fill with OFF data & attribution, homemade internal barcode generator & print label, Products page quick scan & unknown barcodes panel, inventory restock scan.
- [ ] **B10 — Frontend Tests**: Parity fixtures, wedge tests, realtime polling driver, POS scan handler, PairPhoneDialog, /scan page, ProductForm, CameraScanner, layout integrity.
- [ ] **B11 — Dev LAN/HTTPS Mode, Env & Docs**: `@vitejs/plugin-basic-ssl`, `npm run dev:lan`, `docs/BARCODE.md`, `docs/DEPLOY.md`, `README.md`, `CHANGELOG.md`.
- [ ] **B12 — Final Gate, Merge, Tag**: All gates clean, runtime-safety scan, Tinker smoke test, merge `feat/barcode-scan` to `main`, tag `v1.1.0`.

### B0 Log:
- Verified repository status: branch `fix/ui-polish` was already merged into `main`.
- Created branch `feat/barcode-scan` from `main`.
- Baseline test gates:
  - Frontend: 9 test files, 123 tests passing (Vitest); ESLint 0 errors; build clean; contract checks 37/37 routes matching; mock services 10/10 matching; mock data ₱0.0000 discrepancy.
  - Backend: 41 tests passing (Pest, 206 assertions); Pint clean.

### Barcode feature map:
- **Products table, model, resource, form requests**:
  - `products` table has a `barcode` column (`nullable`, `unique`).
  - Columns `image_url`, `brand`, `size`, `source`, `source_ref` are missing and will be added in B1.
  - `Product` model has `$fillable` containing `barcode`, lacks the new columns.
  - `ProductResource` returns `barcode`, needs `image_url`, `brand`, `size`, `source`, `source_ref`.
  - `ProductController` validates `barcode` directly (`nullable`, `string`, `max:50`, `unique`).
- **Categories in ReferenceDataSeeder**:
  - Seeded from `database/data/categories.json` with 10 categories:
    1: Drinks (`DRK`), 2: Coffee & Milk (`COF`), 3: Instant Noodles (`NOO`), 4: Canned Goods (`CAN`), 5: Snacks (`SNA`), 6: Bread (`BRD`), 7: Condiments (`CND`), 8: Rice & Cooking (`RCE`), 9: Personal Care (`PER`), 10: Household (`HOU`).
- **POS Terminal**:
  - `PosPage.jsx` has search input that already queries `name`, `sku`, and `barcode`.
  - Adding to cart uses `useCartStore((state) => state.add)(product, quantity)`.
  - Header is located in `PosLayout.jsx` with dashboard link, store title, clock, and user avatar.
- **AdjustStockDialog**:
  - Located in `src/features/products/components/AdjustStockDialog.jsx`.
  - Implements Command + Popover product picker with SKU and barcode search when `product` is null, and read-only card when `product` is passed.
- **ProductFormDialog & Zod Schema**:
  - Form dialog in `src/features/products/components/ProductFormDialog.jsx`.
  - Schema in `src/features/products/schemas.js` (`productSchema` and `DEFAULT_PRODUCT`).
  - Currently validates barcode as optional regex `^\d{8,13}$`.
- **API Client & Auth Tokens**:
  - `src/lib/api.js` configures Axios with `VITE_API_URL || 'http://localhost:8000/api'`.
  - Reads Sanctum bearer token from `localStorage.getItem('tindatrack_token')`.
  - Services use `apiClient.js` wrapping `api` calls with standard `ApiError` normalization.
- **Routes & Layouts**:
  - Router in `src/app/router.jsx`.
  - Layouts: `PublicLayout`, `AuthLayout`, `PosLayout`, `AppLayout`, `MinimalLayout`.
  - Route guards: `ProtectedRoute`, `GuestRoute`, `RoleRoute` (with `usePermissions().can(ability)`).
  - Public route `/scan` will be placed in a minimal layout without landing or app chrome.

### B1 Log:
- Created migration `2026_10_13_000001_add_catalog_fields_to_products_table.php` adding `image_url` (nullable 2048), `brand` (nullable), `size` (nullable), `source` (default `manual`), and `source_ref` (nullable).
- Created migration `2026_10_13_000002_create_barcode_catalog_table.php` caching online and local barcode lookups (`barcode` string 32 primary, `found`, `source`, `name`, `brand`, `size`, `image_url`, `categories`, `fetched_at`, timestamps).
- Created migration `2026_10_13_000003_create_scanner_sessions_table.php` managing paired phone sessions (`id` ulid primary, `user_id` FK cascade, `mode`, `pairing_code` unique, `pairing_expires_at`, `device_token_hash`, `device_label`, `paired_at`, `last_seen_at`, `ended_at`, `expires_at`, index `[user_id, ended_at]`).
- Created migration `2026_10_13_000004_create_scanner_events_table.php` tracking scanned barcode items (`id` bigint, `scanner_session_id` FK ulid cascade, `barcode` string 32, `status`, `product_id` FK null on delete, `quantity`, `payload` json, `resolved_at`, `created_at`, index `[scanner_session_id, id]`).
- Created Eloquent models: `BarcodeCatalog`, `ScannerSession` (with `HasUlids`), and `ScannerEvent` (`const UPDATED_AT = null`).
- Updated `Product` model `$fillable` and `scannerEvents()` relation; updated `User` model with `scannerSessions()` relation.
- Updated `ProductResource` to expose new catalog fields.
- Updated `ProductController` store/update validation and auto-resolved unknown scan events on product creation with barcode.
- Updated `ProductFactory` and `ReferenceDataSeeder` with new catalog fields.
- Gates: Pest (41/41 passing), Pint clean, contract check (37/37 passing).

### B2 Log:
- Implemented `App\Support\Barcode` helpers:
  - `normalize`: trims, strips spaces and hyphens, automatically converts 12-digit UPC-A to 13-digit EAN-13 with '0' prefix.
  - `computeCheckDigit` / `isValidGtin`: verifies standard GS1 modulo-10 check digits for EAN-8, EAN-13, and UPC-A.
  - `isInternal`: detects restricted-circulation prefixes (20 to 29).
  - `isAcceptable`: accepts valid GTINs, internal barcodes, and custom 4-32 alphanumeric codes.
  - `makeInternal`: generates valid EAN-13 with "20" prefix + 10-digit zero-padded sequence + check digit.
- Implemented `App\Support\CategoryGuesser` matching Open Food Facts tags and product names against store categories.
- Configured `config/services.php` with `openfoodfacts` settings (base URLs for OFF, Open Products Facts, Open Beauty Facts, user agent, timeout). Updated `.env.example`.
- Implemented `App\Services\ProductLookupService`:
  - 1. Checks local active products (returns `{ local_product, catalog: null }`).
  - 2. Checks `barcode_catalog` cache (30-day TTL for found, 1-day TTL for not-found).
  - 3. Queries base URLs in sequence, mapping attributes (`name`, `brand`, `size`, `image_url`, `categories`), skipping internal/custom codes.
  - 4. Caches hits in `barcode_catalog` with ODbL attribution.
  - 5. Treats 429, timeouts, and 5xx errors as transient without poisoning cache.
- Implemented `App\Http\Controllers\BarcodeLookupController` on `GET /api/barcode-lookup/{barcode}`:
  - Protected with `auth:sanctum`, `active`, and `role:owner,cashier`.
  - Rate limited with `throttle:30,1`.
  - Rejects invalid barcode formats with 422.
  - Cashiers receive only `local_product` with `catalog: null`.
  - Owners receive full result.
- Added comprehensive unit tests in `tests/Unit/BarcodeTest.php` (5 tests) and feature tests in `tests/Feature/BarcodeLookupTest.php` (10 tests with `Http::fake`).
- Gates: Pest (56/56 passing, 267 assertions), Pint clean, contract check passing.

### B3 Log:
- Created and configured `scanner.device` middleware (`EnsureValidScannerDevice`):
  - Validates `X-Scanner-Token` via sha256 equality on `device_token_hash`.
  - Ensures session is unexpired and unended; updates `last_seen_at` at most once per 30s.
  - Binds verified session object onto request attributes.
- Implemented authenticated `ScannerSessionController`:
  - `POST /api/scanner-sessions`: creates ULID session, ends previous sessions of same mode, lazily prunes events (>24h) and sessions (>24h). Enforces owner-only restriction on `mode=inventory` (403 for cashier).
  - `GET /api/scanner-sessions/{id}`: returns session status (`paired`, `device_label`, `online`, `ended_at`). Owner-checked.
  - `GET /api/scanner-sessions/{id}/events?after={lastId}`: polling feed with ascending order and limit 50.
  - `DELETE /api/scanner-sessions/{id}`: ends session.
  - `GET /api/scanner/unknown-barcodes`: retrieves distinct unresolved unknown barcodes from owner's store over last 14 days with scan counts and latest seen timestamp.
- Implemented device `ScannerDeviceController`:
  - `POST /api/scanner/pair`: verifies unexpired pairing code, ensures single-use, issues 40-character random device token, records sha256 hash, and returns store & user info (throttled 10/min).
  - `POST /api/scanner/scans`: normalizes barcode, verifies `isAcceptable`, resolves active local product, determines status (`found`, `out_of_stock`, `unknown`), creates `ScannerEvent`, dispatches `ScannerItemScanned` broadcast event, and returns product snapshot payload (throttled 120/min). In inventory mode, unknown scans auto-query catalog.
  - `POST /api/scanner/heartbeat`: touches `last_seen_at` and returns `{ ended: false }`.
- Integrated optional Laravel Broadcasting:
  - Installed `pusher/pusher-php-server` via Composer.
  - Configured `config/broadcasting.php` with `pusher`, `log`, and `null` drivers.
  - Configured `withBroadcasting` in `bootstrap/app.php` with bearer token auth on `/api/broadcasting/auth`.
  - Created `routes/channels.php` authorizing private channel `scanner-session.{id}` strictly for session creator.
  - Created `App\Events\ScannerItemScanned` implementing `ShouldBroadcastNow` on channel `scanner-session.{id}` with name `scanner.scanned`. Broadcast dispatch errors are safely swallowed so Pusher downtime never disrupts POS scans.
- Added comprehensive Pest feature tests in `tests/Feature/ScannerSessionAndDeviceTest.php` (13 tests): full pairing flow, code reuse block, expiration check, 401 on wrong/ended tokens, scan status branches, polling feed `after`, cross-user access boundaries, role constraints, device token route isolation, `Event::fake` assertion, heartbeat, and unknown barcodes feed.
- Gates: Pest (69/69 passing, 320 assertions), Pint clean, contract check passing.

### B4 Log:
- Conducted full backend hardening audit across all new controllers, services, middleware, resources, and models:
  - Mass assignment: all attributes explicitly gated via `$fillable` on `Product`, `BarcodeCatalog`, `ScannerSession`, `ScannerEvent`.
  - Client data isolation: phone scans only submit `barcode` and optional `quantity`. Prices, stock counts, and names are strictly retrieved server-side from active local inventory.
  - Zero N+1 queries: `scanner_events` stores product snapshot payload directly; feed polling requires no eager relations or joins.
  - Indexes verified: `scanner_sessions [user_id, ended_at]`, `scanner_events [scanner_session_id, id]`, `barcode_catalog [barcode primary]`.
  - Timezone integrity: all timestamps use `now()` conforming to `Asia/Manila` with ISO 8601 formatting.
- Extended `tindatrack:check` reconciliation command to include row counts for `Barcode Catalog`, `Scanner Sessions`, and `Scanner Events`.
- Audited API routes and middleware via `php artisan route:list --path=api -v`:
  ```
  GET|HEAD api/barcode-lookup/{barcode} -> api, Authenticate:sanctum, EnsureUserIsActive, EnsureUserHasRole:owner,cashier, ThrottleRequests:30,1
  POST api/scanner-sessions -> api, Authenticate:sanctum, EnsureUserIsActive, EnsureUserHasRole:owner,cashier
  GET|HEAD api/scanner-sessions/{id} -> api, Authenticate:sanctum, EnsureUserIsActive, EnsureUserHasRole:owner,cashier
  DELETE api/scanner-sessions/{id} -> api, Authenticate:sanctum, EnsureUserIsActive, EnsureUserHasRole:owner,cashier
  GET|HEAD api/scanner-sessions/{id}/events -> api, Authenticate:sanctum, EnsureUserIsActive, EnsureUserHasRole:owner,cashier
  POST api/scanner/pair -> api, ThrottleRequests:10,1
  POST api/scanner/scans -> api, EnsureValidScannerDevice, ThrottleRequests:120,1
  POST api/scanner/heartbeat -> api, EnsureValidScannerDevice
  GET|HEAD api/scanner/unknown-barcodes -> api, Authenticate:sanctum, EnsureUserIsActive, EnsureUserHasRole:owner
  GET|POST|HEAD api/broadcasting/auth -> api, Authenticate:sanctum
  ```
- Gates: Pest (69/69 passing, 320 assertions), Pint clean, route check passing.

### B5 Log:
- Installed frontend dependencies: `barcode-detector`, `qrcode.react`, `jsbarcode`, `laravel-echo`, `pusher-js`.
- Configured self-hosted WebAssembly ponyfill with native fallback (`src/lib/detector.js`):
  - Prepares `zxing-wasm/dist/reader/zxing_reader.wasm?url` via `prepareZXingModule` overrides so production bundle does not rely on third-party CDNs.
  - Queries `window.BarcodeDetector` when available with `ean_13` format support, falling back to WebAssembly ponyfill.
- Created `src/lib/barcode.js` porting `normalize`, `computeCheckDigit`, `isValidGtin`, `isInternal`, `isAcceptable`, and `makeInternal` to JavaScript.
- Created `src/hooks/useCameraScanner.js`:
  - Captures environment camera stream using `navigator.mediaDevices.getUserMedia`.
  - Frame detection loop with ~200ms throttle, `requestAnimationFrame`, tab visibility pause, and 1500ms deduplication window.
  - Handles HTTPS insecure context warning (`isSecureContext`), permission denied states, torch toggle, and front/back camera switching.
- Created `src/lib/feedback.js` with WebAudio oscillator `beep()` (1400-1800Hz smooth chime) and haptic `vibrate()` (60ms), persisting user sound preferences in localStorage.
- Created `src/components/scanner/CameraScanner.jsx` with dark rounded viewfinder overlay, animated laser scan beam (`@keyframes scan-line` respecting `prefers-reduced-motion`), torch toggle, and fallback manual entry form.
- Created `src/components/scanner/ScannerSheet.jsx` wrapping `CameraScanner` in a `ResponsiveDialog` with single-scan and continuous scan modes.
- Created `src/hooks/useBarcodeWedge.js` capturing rapid hardware barcode scanner keystrokes (<50ms inter-key gap) while ignoring human typing and textarea focus.
- Authored Vitest unit tests in `src/test/barcode.test.jsx` (9 tests) verifying parity with backend fixtures and keyboard wedge buffering.
- Gates: ESLint clean, production build clean, Vitest (9 tests passed in barcode suite), check-contract (37/37 passing), check-services (10/10 passing), check-mockdata passing.

### B6 Log:
- Implemented frontend barcode and scanner services in both API and Mock modes:
  - `src/services/api/barcodeService.js`: `lookupBarcode(code)` -> `GET /api/barcode-lookup/{barcode}`.
  - `src/services/api/scannerService.js`:
    - Authenticated: `createScannerSession`, `getScannerSession`, `listScannerEvents`, `endScannerSession`, `getUnknownBarcodes`.
    - Device: `pairScanner`, `sendScan`, `scannerHeartbeat` using scoped `X-Scanner-Token` from `sessionStorage` with dedicated Axios client that never transmits user bearer tokens or triggers logout on 401.
  - `src/services/mock/barcodeService.js`: realistic 8 PH product fixtures, online open food facts hit simulation with ODbL attribution, cashier role restriction (null catalog).
  - `src/services/mock/scannerService.js`: cross-tab synchronization with `BroadcastChannel('tt-scanner')` and `localStorage`, pairing code generation, session state management, inventory online lookup.
  - Facades `src/services/barcode.js`, `src/services/barcodeService.js`, `src/services/scanner.js`, `src/services/scannerService.js`.
- Implemented `src/lib/realtime.js`:
  - `subscribeToScanner(sessionId, { onEvent })`: supports `polling` (1200ms visible, 5000ms hidden, deduplication via `lastId`, auto-stop after 3 consecutive 401/404 errors) and optional `pusher` (lazy Echo/Pusher with 10s catch-up polling fallback).
- Updated validation scripts:
  - `scripts/check-contract.mjs`: added 9 contracts (46 total endpoints verified against backend).
  - `scripts/check-services.mjs`: verified 1-to-1 method parity across all 12 services (100% matched).
- Authored Vitest unit tests in `src/test/realtime.test.jsx` (4 tests) verifying chronological ordering, deduplication, hidden tab backoff, and 401 cancellation.
- Gates: ESLint clean, production build clean, Vitest (136 tests green across 11 files), check-contract (46/46 passing), check-services (12/12 passing).

### B7 Log:
- Implemented POS Terminal barcode & scanner integration (`PosPage.jsx`):
  - POS header actions:
    - "I-scan": launches `ScannerSheet` in continuous mode for direct laptop webcam or mobile scanning.
    - "Ikonekta ang Phone": opens `PairPhoneDialog` for pairing with phone scanner.
    - Persistent compact badge: "📱 Phone scanner: Online/Offline" with DropdownMenu to disconnect ("Idiskonekta").
  - Hardware Wedge Scanner: enabled `useBarcodeWedge` on POS page, marked search input `data-barcode-input="true"`.
  - Shared scan handler `handleScannedCode(code, { source, event })`:
    - Checks loaded local product list by normalized barcode first.
    - If missing locally, calls `lookupBarcode(normalized)`:
      - Found in local inventory: adds to cart, increments quantity, emits audio `beep()`, and toasts "+1 {name}".
      - Out of stock: displays warning toast ("Ubos na ang stock ng {name}") and prevents adding.
      - Unknown:
        - Owner: toast with CTA "Irehistro ang produkto" pre-populates and opens `ProductFormDialog`.
        - Cashier: toast "Hindi pa naka-rehistro ang barcode na ito. Sabihan ang may-ari."
  - Pairing Dialog (`PairPhoneDialog.jsx`):
    - Generates 10-minute ephemeral session with human pairing code `XXXX-XXXX` and QR code pointing to `${PUBLIC_APP_URL}/scan?code=...`.
    - Detects `localhost` and shows warning pointing to `npm run dev:lan` or production URL.
    - Polls session status every 2 seconds until paired; displays animated green status indicator.
  - Session persistence:
    - Stores active session in `sessionStorage` (`tt_pos_scanner_session`) surviving page reloads.
    - Automatically cleans up session tokens on user logout in `AuthContext.jsx`.
- Gates: ESLint clean, production build clean, Vitest (136/136 tests passing), contract & mock data checks passing.

### B8 Log:
- Implemented standalone Phone Scanner page (`src/features/scanner/pages/PhoneScannerPage.jsx`):
  - Registered public route `/scan` with lazy-loading outside `AppLayout` and `PublicLayout` in `router.jsx` (zero app sidebar or landing header duplication).
  - Unpaired state:
    - Auto-pairs when query param `?code=XXXX-XXXX` is present with client device label (e.g., iPhone / Android phone).
    - Manual 8-character input field (`formatCode` with auto-hyphen and auto-uppercase).
    - Friendly error alerts for invalid, used, or expired codes.
  - Paired state:
    - Top bar shows store name, "Konektado kay {user_name}", mode badge (POS / Inventory), dark mode toggle, and "Idiskonekta" button.
    - Full-screen `CameraScanner` running in continuous detection mode.
    - Screen Wake Lock (`navigator.wakeLock.request('screen')`, re-acquired on tab visibility changes).
    - 10-second periodic heartbeat via `scannerHeartbeat()`; handles 401 session expiration cleanly.
    - Quantity stepper (default 1, stepper `[-]` / `[+]`, 1–99) to scan and send multiplied quantities in one pass.
    - Audio `beep()` and haptic `vibrate()` on every successful scan.
    - Result card displaying product name, price, stock warnings, and online catalog suggestions for inventory mode.
    - "Huling na-scan" reverse-chronological list showing the last 10 scans with timestamps and status.
  - Fully responsive and touch-optimized down to 360px width with lightweight 11.8 kB bundle footprint.
- Gates: ESLint clean, production build clean, Vitest (136/136 tests passing), all check scripts passing.

### B9 Log:
- Implemented owner product workflows:
  - `ProductFormDialog.jsx`:
    - Barcode field enhanced with "I-scan" (opens `ScannerSheet` in single mode) and "Hanapin online" (`lookupBarcode`).
    - Auto-lookup triggered on camera scan of valid GTIN in create mode.
    - Local duplicate detection: warns "Naka-rehistro na ito: {name}" with direct edit option and prevents saving duplicate barcode.
    - Online catalog auto-fill: prefills name (formatted as `{brand} {name} {size}`), brand, size, image_url, and suggested category while preserving user-entered values; keeps price/cost/stock manual and auto-focuses price input.
    - Open Food Facts ODbL attribution badge with outbound link.
    - Image preview supporting pasted URLs with graceful fallback.
    - "Gumawa ng sariling barcode": generates internal EAN-13 starting with `20` using `Barcode.makeInternal()`.
    - "I-print ang label": opens `PrintLabelsDialog` using `JsBarcode` SVG in a printable grid (12 copies default, print CSS hiding app chrome).
  - `ProductsPage.jsx`:
    - Passed `imageUrl={p.image_url}` to `ProductThumb` in both desktop table and mobile cards.
    - Added "I-scan para magdagdag" action button opening camera scanner -> online lookup -> prefilled product creation dialog.
    - Added dismissible "Mga barcode na hindi pa naka-rehistro (N)" panel querying `/api/scanner/unknown-barcodes` with instant "Irehistro" CTA.
  - `AdjustStockDialog.jsx`:
    - Added camera scan button and `useBarcodeWedge` hardware scanner support to product picker.
  - `InventoryPage.jsx`:
    - Added "I-scan gamit ang Phone" action button launching `PairPhoneDialog` in `mode="inventory"`.
    - Real-time subscription queues/opens `AdjustStockDialog` with scanned product preselected, or routes unknown barcodes to prefilled product create dialog.
  - Backend: Added Pest test asserting `ScannerEvent` records with status `unknown` are automatically resolved (`resolved_at`) when a product with that barcode is created.
- Gates: ESLint clean, production build clean, Vitest (136/136 tests passing), Pest (70/70 tests passing, 323 assertions), Pint clean, all check scripts passing.

### B10 Log:
- Implemented comprehensive frontend test suite covering all barcode, scanner, and pairing flows:
  - Extended layout guard in `src/test/containment.test.jsx` ensuring `/scan` does not render app sidebar or landing header.
  - Created `src/test/scan-flows.test.jsx` with 14 automated tests:
    - POS scan handler: adds found item to cart, increments quantity on subsequent scans, blocks out-of-stock items, respects stock limits.
    - `PairPhoneDialog`: renders pairing code and QR code, displays localhost warning when accessing via local hostname.
    - `PhoneScannerPage`: auto-pairs from `?code=XXXX-XXXX` URL parameter, renders scan result cards with product info, handles 401 expired sessions with user-friendly alerts.
    - `CameraScanner`: displays HTTPS requirement banner in insecure contexts, manual barcode entry properly invokes `onDetected`.
    - `ProductFormDialog`: internal barcode generator creates valid EAN-13 starting with `20`, online catalog lookup auto-fills empty fields without overwriting user input, duplicate local barcode prevents submission, unknown barcode displays manual fallback notice.
- Gates: ESLint clean, production build clean, Vitest (151/151 tests green across 12 test files), Pest (70/70 tests green), Pint clean, all check scripts passing.

### B11 Log:
- Implemented Dev LAN/HTTPS mode, environment configs, and documentation:
  - Installed `@vitejs/plugin-basic-ssl` and `cross-env`.
  - Configured `frontend/vite.config.js`: when `VITE_DEV_HTTPS === 'true'`, enables `basicSsl()`, `server.host: true` (0.0.0.0), and proxies `/api` requests to `http://127.0.0.1:8000`.
  - Updated `src/lib/api.js`, `src/services/api/scannerService.js`, and `src/lib/realtime.js` to dynamically support relative `/api` bases when running behind Vite reverse proxy.
  - Added scripts: `"dev:lan": "cross-env VITE_DEV_HTTPS=true VITE_API_URL= vite"` in `frontend/package.json` and `"dev:lan"` / `"dev:web:lan"` in root `package.json`.
  - Added environment templates: created `frontend/.env.example` documenting `VITE_REALTIME_DRIVER=polling`, `VITE_PUBLIC_APP_URL`, and optional Pusher credentials; updated `.env.development` and `.env.production.example`.
  - Created `docs/BARCODE.md` covering:
    - End-to-end ASCII event flow architecture diagram.
    - Open Food Facts API integration, caching policy (30d hit / 1d miss), User-Agent headers, and ODbL licensing.
    - Zero-login scoped device token security model (`X-Scanner-Token`), sha256 hashing at rest, expiration, throttles, and role authorization.
    - Local phone testing guide via `npm run dev:lan` and Cloudflare tunnel fallback.
    - 5-minute presentation demo script.
  - Updated `docs/DEPLOY.md` with Railway and Vercel environment variables, clarifying zero-worker deployment.
  - Updated `README.md` features list and local development guides.
  - Updated `docs/API.md` with request and response examples for all barcode and scanner endpoints.
  - Updated `docs/CHANGELOG.md` with full `[v1.1.0]` release notes.
### B12 Log:
- Final gate verification executed from clean state:
  - Backend: `php artisan migrate:fresh --seed` ran cleanly with all 14 tables and idempotent demo history seeders.
  - Backend Pest: 70 passed (323 assertions).
  - Pint code styling: 100% clean.
  - Frontend: `oxlint` (0 errors), `vite build` (production build clean), Vitest (151 tests passed across 12 files).
  - Contract & Service verification: 46/46 API contracts verified, 12/12 Mock vs API service facades verified, mock data generation and balance reconciliation passed with 0 discrepancies.
- Live smoke test performed in Tinker:
  - Successfully resolved `3017620422003` -> `"Nutella"`, brand `"Nutella"`, size `"400 g e"`, attribution `"Data from Open Food Facts (ODbL)"`. Temporary catalog row purged after assertion.
- Runtime safety scan:
  - Verified layout containment, no horizontal scrolling, proper `Number(...)` coercion, and full lazy-loading across all 33 routes and the new `/scan` route.

---

## Final v1.1.0 Summary

### Test Suite Comparison (Before & After)
- **Backend (Pest PHP)**:
  - Baseline (B0): 41 tests, 206 assertions
  - Final (B12): **70 tests, 323 assertions** (+29 tests, +117 assertions)
- **Frontend (Vitest)**:
  - Baseline (B0): 123 tests (10 files)
  - Final (B12): **151 tests (12 files)** (+28 tests, +2 new test files)
- **API Contracts (`scripts/check-contract.mjs`)**:
  - Baseline (B0): 37 contracts
  - Final (B12): **46 contracts** (+9 new endpoints verified 1-to-1 against Laravel routes)

### New Endpoints & Routes
- **Backend Endpoints**:
  1. `GET /api/barcode-lookup/{barcode}` — Throttled catalog lookup (Cashiers: local only; Owners: local + Open Food Facts cache).
  2. `POST /api/scanner-sessions` — Creates 10-minute pairing session (`pos` or `inventory` mode).
  3. `GET /api/scanner-sessions/{id}` — Polls pairing health and status.
  4. `GET /api/scanner-sessions/{id}/events` — Polling feed for POS terminal with `after={id}` parameter.
  5. `DELETE /api/scanner-sessions/{id}` — Ends active session.
  6. `POST /api/scanner/pair` — Public endpoint redeeming pairing code for scoped 40-char device token.
  7. `POST /api/scanner/scans` — Device endpoint submitting scans and broadcasting real-time events.
  8. `POST /api/scanner/heartbeat` — Device endpoint maintaining active session liveness.
  9. `GET /api/scanner/unknown-barcodes` — Owner endpoint tracking uncatalogued barcodes scanned in the store.
- **Frontend Routes**:
  - `/scan` — Standalone public phone scanner page (responsive down to 360px, zero app shell duplication, screen wake lock, quantity stepper, continuous camera scanning).
- **New Environment Variables**:
  - Backend: `PRODUCT_LOOKUP_ENABLED`, `OFF_USER_AGENT`, optional `PUSHER_APP_ID`, `PUSHER_APP_KEY`, `PUSHER_APP_SECRET`, `PUSHER_APP_CLUSTER`.
  - Frontend: `VITE_REALTIME_DRIVER` (`polling` | `pusher`), `VITE_PUBLIC_APP_URL`, `VITE_PUSHER_APP_KEY`, `VITE_PUSHER_APP_CLUSTER`.

### Skipped Items
- None. All sub-features implemented in full according to blueprint and prompt specifications.

---

## Morning Checklist for the User
1. `git pull`
2. `composer install` (in `backend/`) and `npm install` (in repo root and `frontend/`)
3. `php artisan migrate` (in `backend/`)
4. Restart development server: `npm run dev`
5. Visit `http://localhost:5173/pos` → click **"I-scan"** to test laptop webcam scanning.
6. Run `npm run dev:lan`, click **"Ikonekta ang Phone"** in POS, and scan the QR code with your mobile smartphone!

---

## Phase 3.1: Phone Pairing Investigation & Fixes (v1.1.1)

### F0: Root Cause Investigation & Hypothesis Matrix

1. **API Base URL (Partially True / Hardening Opportunity)**:
   - In `src/lib/api.js`, `getApiBaseUrl()` checked `typeof envUrl === 'string' && envUrl.trim().length > 0`. If `VITE_API_URL` was explicitly empty (`""`), it relied on `VITE_DEV_HTTPS === 'true'` to return `'/api'`. If `VITE_DEV_HTTPS` was missing or falsy, it fell back to `'http://localhost:8000/api'`.
   - Paths in `apiClient` (`/categories`, `/scanner-sessions`) and `scannerService` (`/scanner/pair`) are prepended with `/api`, resulting in `/api/...` calls.
   - Vite proxy in `vite.config.js` was configured as `proxy: { '/api': 'http://127.0.0.1:8000' }`. Adding `changeOrigin: true` and `secure: false` is required to ensure consistent host header rewriting and TLS termination.
2. **Data Source (True)**:
   - `.env.development` sets `VITE_DATA_SOURCE=api`. However, the `dev:lan` script in `frontend/package.json` (`cross-env VITE_DEV_HTTPS=true VITE_API_URL= vite`) did not explicitly specify `VITE_DATA_SOURCE=api`. If an environment or developer had `VITE_DATA_SOURCE=mock`, mock mode would run, preventing external phone pairing.
3. **Duplicate Session Creation in React StrictMode (True)**:
   - In `PairPhoneDialog.jsx`, `useEffect` invoked `startNewSession()` on mount without a guard ref. In React StrictMode (active in development), effects run, unmount, and re-run.
   - The second `POST /api/scanner-sessions` triggered `ScannerSessionController@store`'s cleanup query:
     `ScannerSession::where('user_id', $user->id)->where('mode', $mode)->whereNull('ended_at')->update(['ended_at' => now()])`,
     which instantly terminated Session 1.
   - Additionally, closing the dialog before pairing did not clean up sessions, leaving orphaned active sessions in the database.
4. **Response Shape Unwrapping (TRUE - PRIMARY ROOT CAUSE)**:
   - `ScannerSessionController@store` returns:
     `{ "data": { "id": "...", "pairing_code": "K7RM-92NP", "pairing_expires_at": "...", "expires_at": "...", "mode": "pos" } }`.
   - `apiClient` in `frontend/src/services/api/apiClient.js` returns Axios `response.data`, which is `{ data: { ... } }`.
   - `scannerService.createScannerSession` returned `apiClient.post(...)` directly without unwrapping `.data`.
   - `PairPhoneDialog.jsx` read `res.pairing_code` directly from `res` (`res.pairing_code` === `undefined`).
   - Consequently:
     - `pairingCode` evaluated to `session?.pairing_code || '----'` -> displayed `----`.
     - `scanUrl` was constructed as `${publicAppUrl}/scan?code=undefined`.
     - The QR code encoded a URL with `?code=undefined`.
     - Scanning the QR on a phone opened `/scan?code=undefined`, which submitted `"UNDEFINED"` to `/api/scanner/pair`.
     - The backend could not find a session with pairing code `"UNDEFINED"` and returned HTTP 422: `"Luma o paso na ang pairing code"`.
     - `res.pairing_expires_at` was `undefined`, triggering the fallback `setTimeLeft(600)` (9:59 countdown).
   - The same issue affected `scannerService.pairScanner`, `getScannerSession`, `listScannerEvents`, and `barcodeService.lookupBarcode`.
5. **Error & Loading State Handling (True)**:
   - `PairPhoneDialog.jsx` rendered the `'----'` code container, QR box, and 9:59 countdown even when `session` was null or if `createScannerSession` failed with an error. It lacked a loading skeleton and a dedicated error view with retry capability.
6. **Backend Code Normalization & Machine-Readable Reasons (True)**:
   - Routes: Verified all 8 routes and middleware via `php artisan route:list --path=scanner -v`.
   - In `ScannerDeviceController@pair`, the controller checked `where('pairing_code', $code)` strictly requiring the exact hyphenated format. Lowercase characters or codes entered without the hyphen failed.
   - The 422 responses returned only generic human messages without machine-readable `reason` tags (`not_found`, `expired`, `used`).
7. **CORS / Sanctum (True)**:
   - With the Vite reverse proxy, all requests from the browser/phone on LAN go to `https://192.168.x.x:5173/api/...` (same-origin), avoiding CORS preflight. Adding `changeOrigin: true` to Vite's proxy ensures backend receives `127.0.0.1:8000` as Host.
### F1 Log:
- Minimal, surgical fixes applied across frontend and backend for phone scanner pairing:
  - **Response unwrapping**: In `frontend/src/services/api/scannerService.js` and `barcodeService.js`, unwrapped `res?.data ?? res` on all methods (`createScannerSession`, `getScannerSession`, `listScannerEvents`, `endScannerSession`, `getUnknownBarcodes`, `pairScanner`, `sendScan`, `scannerHeartbeat`, `lookupBarcode`). Defensive unwrapping also added in `PhoneScannerPage.jsx` and `PairPhoneDialog.jsx`.
  - **Pairing code normalization**: In `ScannerDeviceController@pair` and mock `scannerService.pairScanner`, sanitized incoming codes by stripping dashes and whitespace, auto-formatting 8-character inputs into uppercase `XXXX-XXXX`, and matching case-insensitively.
  - **Machine-readable error reasons**: `ScannerDeviceController@pair` and mock service now return `{ reason: 'not_found' | 'expired' | 'used', message: '...' }` with HTTP 422. `PhoneScannerPage.jsx` maps each reason to distinct Taglish instructions (including network/Wi-Fi unreachable and missing code in URL).
  - **Strict single-session lifecycle & StrictMode protection**: In `PairPhoneDialog.jsx`, added `hasCreatedForOpenRef` and `isCreatingRef` guards to ensure exactly ONE session is created per dialog open. Added cleanup that terminates un-paired sessions (`endScannerSession`) on close and unmount.
  - **Server-driven countdown**: Countdown now strictly computes remaining seconds from `res.pairing_expires_at`. At 0 seconds, displays "Paso na ang code" and automatically requests a fresh session.
  - **Loading skeleton & error handling**: `PairPhoneDialog.jsx` renders an animated skeleton while creating, displays an error alert with plain HTTP status reason and a "Subukan ulit" button on rejection, and never renders a QR code or code display without a valid server `pairing_code`.
  - **Localhost origin and API mismatch warnings**: Alerts user if app origin is localhost (preventing LAN phone scanning) or if API base resolves to localhost while app origin is on LAN.
  - **API base and Vite proxy**: In `frontend/src/lib/api.js`, added explicit check for empty string (`VITE_API_URL=""`) returning `'/api'`. In `vite.config.js`, added `changeOrigin: true` and `secure: false`. In `frontend/package.json`, forced `VITE_DATA_SOURCE=api` in `dev:lan`.
- Gates passed: Backend Pint clean, Pest 70/70 passed (323 assertions); Frontend lint clean, build clean.

### F2 Log:
- Implemented real end-to-end smoke verification harness:
  - **Pest feature test**: `backend/tests/Feature/ScannerEndToEndTest.php` exercises the full end-to-end HTTP route lifecycle with real Sanctum bearer authentication and SQLite/MySQL transactions:
    1. Owner creates POS session -> returns 201 with `data.id`, `data.pairing_code` (validated against regex `/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/`), and `data.pairing_expires_at` in the future.
    2. Phone pairs with dashless lowercase variant -> returns 200 with 40-character device token.
    3. Device submits scan for seeded product -> returns 201 with `data.event_id`, `data.status === 'found'`, and product payload.
    4. Laptop polls session events -> returns 200 with event array including the scan event.
    5. Re-pairing with already paired code fails with 422 `reason === 'used'`.
    6. Second session creation automatically ends the first session.
    7. Pairing with non-existent code fails with 422 `reason === 'not_found'`.
    8. Pairing with ended/superseded session code fails with 422 `reason === 'expired'`.
  - **Smoke script**: `scripts/smoke-pairing.mjs` (Node 20+ built-in `fetch`, zero extra dependencies):
    - Added root npm script `smoke:pairing`.
    - Tests complete flow against direct API (`http://127.0.0.1:8000`) and Vite reverse proxy (`https://127.0.0.1:5173`).
    - Both Direct API and Vite Proxy passed with 100% success against running servers.
- Gates passed: Backend Pest (71/71 tests passed, 380 assertions), Pint clean; `smoke:pairing` PASS on both Direct API and Vite Reverse Proxy.

### F3 Log:
- Implemented comprehensive frontend automated tests catching this class of pairing bug:
  - **Laravel wrapped response fixture test**: Added test in `src/test/scan-flows.test.jsx` providing the exact `{ data: { ... } }` payload returned by Laravel `ScannerSessionController@store`. Verifies `PairPhoneDialog` unwraps the payload, displays the code `AHAW-YD4S` and QR code, and does not show an error.
  - **Error state verification**: Verified that when `createScannerSession` rejects (e.g. 500 Network connection refused), `PairPhoneDialog` displays "Hindi makagawa ng code: Network connection refused", renders a "Subukan ulit" button, and completely hides the code container and QR instructions.
  - **StrictMode single session invocation**: Wrapped `PairPhoneDialog` in `<React.StrictMode>` and asserted `createScannerSession` is called exactly once despite React 19 dev double-invocation lifecycle.
  - **Server expiry countdown & auto-refresh**: Using `vi.useFakeTimers()`, initialized session with server `pairing_expires_at` 2 seconds in the future. Verified initial single call, advanced time past 0, and asserted auto-request for a new code (`toHaveBeenCalledTimes(2)`).
  - **PhoneScannerPage failure reason assertions**: Tested `/scan` with simulated API responses returning 422 with `reason: 'not_found'`, `reason: 'expired'`, `reason: 'used'`, and empty code in query params (`/scan?code=`). Verified distinct Taglish explanations for each scenario.
  - **API client relative base resolution**: Added unit test verifying `getApiBaseUrl()` resolves to relative `/api` when `VITE_API_URL=""`, without falling back to `http://localhost:8000/api`.
- Gates passed:
  - Vitest: 23/23 tests green in `src/test/scan-flows.test.jsx`.
  - Frontend Lint: 0 errors.
  - Frontend Build: compiled cleanly.
  - Backend: Pint clean, Pest 71/71 passed (380 assertions).
  - Smoke script: `npm run smoke:pairing` PASS on Direct API and Vite Reverse Proxy.

### F4 Log (Final Gate, Merge & Tag):
- **Final Verification**:
  - Backend: `./vendor/bin/pint --test` clean, `php artisan test` passed 71/71 tests (380 assertions).
  - Frontend: `npm run lint` 0 errors, `npm run build` clean production bundle.
  - Mock data: `check-mockdata.mjs` passed with ₱0.0000 balance discrepancy.
  - Smoke verification: `npm run smoke:pairing` (both Direct API and Vite HTTPS reverse proxy) passed all 6 steps cleanly.
- **Documentation**:
  - Updated `docs/BARCODE.md` with comprehensive Section 6: "Troubleshooting Pairing" covering prerequisites, local IP configuration, mobile self-signed SSL acceptance, smoke script usage, and failure message reference table.
  - Updated `docs/CHANGELOG.md` with complete `[v1.1.1]` release notes.
- **Root Causes Summary**:
  1. *Primary Root Cause*: `apiClient` returns Axios `response.data` (`{ data: { ... } }`). `scannerService` was not unwrapping `.data`, so `res.pairing_code` evaluated to `undefined`. This caused `----` on screen, `?code=undefined` in QR code, 422 rejected pairing on phone, and fallback 9:59 countdown.
  2. *Secondary Root Cause*: React StrictMode double-mounting in `PairPhoneDialog.jsx` created a second session that immediately ended session 1 in the database while session 1's code was on screen.
  3. *Secondary Root Cause*: Lack of uppercase/dash-less code normalization in `ScannerDeviceController@pair` and missing machine-readable `reason` tags (`not_found`, `expired`, `used`).
  4. *Secondary Root Cause*: API client base resolution for empty string `VITE_API_URL=""` and missing `changeOrigin: true` in Vite reverse proxy.
- **Release**:
  - Merged `fix/pairing` into `main` with `--no-ff`.
  - Tagged `v1.1.1` and pushed to remote origin.

---

## Phase 3.2: Pre-Deployment Hardening, English-First i18n, Product Images, and One-Step Barcode Auto-Fill (v1.2.0)

### H0 Log (Preflight):
- Created branch `hardening/v1.2` branched from `main` (clean at `v1.1.1`).
- Verified database setup in `backend/phpunit.xml`:
  - Unit/Feature tests use `DB_CONNECTION="sqlite"`, `DB_DATABASE=":memory:"`.
  - Development and production deployments use MySQL. All subsequent migrations will use driver-aware logic (e.g. `DB::getDriverName() === 'mysql'` for `MEDIUMBLOB`) to maintain SQLite in-memory test compatibility alongside MySQL production safety.
- Mirrored root scripts: created `scripts/check-contract.mjs` and `scripts/check-services.mjs` at the repository root, ensuring root execution passes seamlessly.
- Baseline test verification:
  - Backend Pest: 71/71 tests green (380 assertions).
  - Pint: Clean PSR-12 code style.
  - `php artisan tindatrack:check`: 100% reconciled across customer balances, stock movements, and unique sales numbers.
  - Frontend Lint: 0 errors, 72 warnings.
  - Frontend Build: Clean production bundle compiled in 9.23s.
  - Frontend Vitest: 23/23 tests green in `src/test/scan-flows.test.jsx`.
  - Contract & Service check: 46/46 API contracts verified, 12/12 service facades matched, ₱0.0000 mock data discrepancy.
  - Smoke script: `smoke:pairing` passed on both Direct API (`http://127.0.0.1:8000`) and Vite Reverse Proxy (`https://127.0.0.1:5173`).

### H1 Log (Full Audit):
- Conducted exhaustive pre-deployment audit across security, authentication, data integrity, frontend runtime, deployment readiness, and localization.
- Documented findings in `docs/AUDIT-v1.2.md` with structured severity ratings (7 High, 6 Medium, 2 Low):
  - **High**:
    - `SEC-01`: Missing route throttle on `POST /api/login`.
    - `SEC-02`: Demo credentials bundled directly into frontend JavaScript bundle.
    - `SEC-03`: Production seeders create demo accounts with default passwords (`password`).
    - `SEC-04`: Missing product image uploads and SSRF risks on external image imports.
    - `SEC-05`: Persisted cart and scanner session not cleared on logout / user switch.
    - `DEP-01`: `nixpacks.toml` pins PHP 8.3 while `composer.lock` requires PHP >= 8.4.1.
    - `DEP-02`: `vercel.json` rewrites asset paths and lacks long-term caching.
  - **Medium**:
    - `SEC-06`: Sanctum expiration env naming (`SANCTUM_EXPIRATION` vs `SANCTUM_TOKEN_EXPIRATION`).
    - `DEP-03`: Missing `URL::forceScheme('https')` in production `AppServiceProvider`.
    - `DEP-04`: Direct `env()` calls in seeders evaluate to null under `config:cache`.
    - `UI-01`: No debounced auto-lookup on typed valid GTIN; no Quick Add by Scan shelf flow.
    - `UI-02`: `imageError` state does not reset on URL change; no camera capture/upload for homemade items.
    - `I18N-01`: Hardcoded Taglish without English default or localization system.
  - **Low**:
    - `UI-03`: Hotkey listener firing during text typing when `metaOrCtrl` is false.
    - `DEP-05`: Production deployment script missing config/route caching.
- Gates verified: Backend Pest 71/71 passing, Pint clean, frontend lint clean, build clean.

### H2 Log (Demo Credentials Local-Only & Production Safety):
- **Backend**:
  - Wired `throttle:10,1` rate limiting to `POST /api/login` in `backend/routes/auth.php` (`SEC-01`).
  - Added support for `SANCTUM_EXPIRATION` and `SANCTUM_TOKEN_EXPIRATION` in `backend/config/sanctum.php` (`SEC-06`).
  - Added `demo_password`, `demo_owner_password`, `demo_cashier_password`, `demo_owner_email`, `demo_cashier_email`, `demo_reset_passwords`, `demo_history_days`, and `demo_base_date` in `backend/config/app.php`.
  - Replaced direct `env()` calls with `config('app.demo_...')` in `DemoHistorySeeder.php` so seeders remain functional when `php artisan config:cache` is active (`DEP-04`).
  - Updated `ReferenceDataSeeder.php`: in production (`app()->environment('production')`), creates demo owner/cashier only if `DEMO_OWNER_PASSWORD` and `DEMO_CASHIER_PASSWORD` are defined. Warns and skips otherwise; never seeds well-known default passwords (`SEC-03`). Idempotent unless `DEMO_RESET_PASSWORDS=true`.
  - Authored `backend/tests/Feature/ProductionSeederTest.php` testing production seeder execution with and without demo env vars, plus idempotency.
- **Frontend**:
  - Extracted demo credentials and quick-login switcher to `src/features/auth/dev/demoAccounts.js` and `src/features/auth/dev/DemoAccountsPanel.jsx` (`SEC-02`).
  - Updated `src/features/auth/pages/LoginPage.jsx` to load `DemoAccountsPanel` lazily strictly within `if (import.meta.env.DEV && SHOW_DEMO_ACCOUNTS)`, allowing Vite/Rollup tree-shaking to eliminate all demo strings and UI from production bundles.
  - Guarded `http://localhost:8000/api` in `src/lib/api.js` with `import.meta.env.DEV`.
  - Sanitized `src/lib/authBridge.js` and `src/mocks/data/staff.js` to avoid `tindatrack.test` demo email leaks in production bundle.
  - Implemented `scripts/check-prod-bundle.mjs` verifying that `dist/**` contains zero demo emails, passwords, `DemoAccounts` references, or `localhost:8000` URLs. Wired as `npm run check:bundle` in root and frontend `package.json`.
  - Updated `src/test/auth.test.jsx` verifying login page rendering with demo accounts enabled and disabled.
- **Documentation**:
  - Updated `docs/DEPLOY.md` to document Railway production credentials (`DEMO_OWNER_PASSWORD`, `DEMO_CASHIER_PASSWORD`, `SANCTUM_EXPIRATION`) and isolated local development credentials.
- **Gates passed**:
  - Backend: Pest 74/74 tests green (393 assertions), Pint clean.
  - Frontend: `npm run lint` 0 errors, `npm run build` clean, `npm run check:bundle` (89 assets checked, 0 violations), Vitest 2/2 in `auth.test.jsx`.

### H3 Log (i18n Infrastructure — English Default, Filipino/Taglish Optional):
- **Dependencies & Setup**:
  - Installed `i18next` and `react-i18next` in `frontend/`.
  - Implemented `frontend/src/i18n/index.js` synchronously with bundled namespaces, `fallbackLng: 'en'`, `supportedLngs: ['en', 'fil']`, localStorage persistence via `tt_lang`, and automatic synchronization with `document.documentElement.lang`.
  - Generated all 18 locale namespaces under `frontend/src/locales/en/` and `frontend/src/locales/fil/` (`common`, `nav`, `auth`, `landing`, `dashboard`, `pos`, `products`, `inventory`, `categories`, `sales`, `customers`, `utang`, `reports`, `users`, `settings`, `scanner`, `validation`, `errors`) with 100% key parity and zero empty values.
- **Components & Language Switcher**:
  - Authored `src/components/common/LanguageSwitcher.jsx` supporting card mode (used in Settings), compact dropdown mode (used in `PublicLayout`, `AuthLayout`, and `Topbar`), and menu item mode (used in `NavUser`).
  - Integrated Language card in `SettingsPage.jsx`, compact switcher in `PublicLayout.jsx`, `AuthLayout.jsx`, and `Topbar.jsx`, and language toggle item in `NavUser.jsx`.
- **Localization Formatting & Validation**:
  - Extended `src/lib/format.js` to format dates according to active locale (`en-PH` vs `fil-PH`) via `Intl.DateTimeFormat` while strictly preserving `₱` (`PHP`) currency formatting in both languages.
  - Updated `src/lib/errors.js` and form kit (`FormInput.jsx`, `FormTextarea.jsx`) with centralized `translateErrorMessage` mapping Zod error keys and backend machine-readable reason tags.
- **Backend Response Translation**:
  - Converted Taglish validation errors and success messages to clear, standard English across `CreateSaleAction`, `VoidSaleAction`, `RecordPaymentAction`, `AdjustStockAction`, `SaleController`, `SettingsController`, `AccountController`, `UtangPaymentController`, `BarcodeLookupController`, `ScannerDeviceController`, and `UserController`.
  - Updated backend Pest test assertions to match English messages in `ScannerSessionAndDeviceTest.php`.
- **Testing & Verification Script**:
  - Authored Vitest suite `src/test/i18n.test.jsx` (7/7 tests passed) testing English default, live Taglish re-render, localStorage persistence, fallback handling, localized dates, and error translation.
  - Authored `scripts/check-i18n.mjs` (and mirrored to `frontend/scripts/check-i18n.mjs`), validating 18/18 namespace key parities, non-empty dictionaries, code key invocations, and recording baseline untranslated candidate count: **385 strings**.
  - Added `"check:i18n"` to root and frontend `package.json`.
### H4b Log (Dashboard, POS, and Scanner Feature Localization):
- **POS & Scanner Localization**:
  - Translated all POS and Scanner components with full i18n support:
    - POS: `PosPage.jsx`, `CartPanel.jsx`, `CartDrawer.jsx`, `MobileCartBar.jsx`, `CartItemRow.jsx`, `CartSummary.jsx`, `ProductGrid.jsx`, `ProductTile.jsx`, `ProductDetailDialog.jsx`, `PaymentDialog.jsx`, `HeldCartsDialog.jsx`, `ReceiptView.jsx`, `NewCustomerMiniForm.jsx`.
    - Dashboard: `DashboardPage.jsx`, `OwnerDashboard.jsx`, `CashierDashboard.jsx`.
    - Scanner: `PairPhoneDialog.jsx`, `ScannerSheet.jsx`, `PhoneScannerPage.jsx`, `CameraScanner.jsx`.
  - Expanded `en/pos.json` & `fil/pos.json` (114 keys each, 100% key parity).
  - Expanded `en/scanner.json` & `fil/scanner.json` (80 keys each, 100% key parity).
  - Expanded `en/dashboard.json` & `fil/dashboard.json` (45 keys each, 100% key parity).
- **Test Suite Updates**:
  - Updated `routes.test.jsx`, `scan-flows.test.jsx`, `entrypoints.test.jsx`, `interactions.test.jsx`, `dialogs.test.jsx`, `containment.test.jsx`, and `flows.test.jsx` to support bilingual assertions (matching both English default and Taglish).
- **Verification & Gates**:
  - `check-i18n.mjs`: 18/18 namespaces verified, 0 missing keys, untranslated candidate strings decreased from 385 to 321.
  - Vitest: All 13 test files passing, 168/168 tests green.
  - ESLint: 0 errors, 0 warnings.
  - Vite build: Production bundle built cleanly.
  - Backend: Pest 74/74 tests green, Pint clean.

### H4c Log (Products, Inventory, and Categories Feature Localization):
- **Feature Component Translation**:
  - Fully translated all 9 target files with standard English default and rich Taglish/Filipino translation:
    - Products: `ProductsPage.jsx`, `ProductDetailPage.jsx`, `ProductFormDialog.jsx`.
    - Inventory: `InventoryPage.jsx`, `AdjustStockDialog.jsx`, `BulkRestockDialog.jsx`, `PrintableRestockList.jsx`.
    - Categories: `CategoriesPage.jsx`, `CategoryFormDialog.jsx`.
- **Locale Dictionary Alignment**:
  - Expanded `en/products.json` & `fil/products.json` (72 keys each, 100% key parity).
  - Expanded `en/inventory.json` & `fil/inventory.json` (124 keys each, 100% key parity).
  - Expanded `en/categories.json` & `fil/categories.json` (34 keys each, 100% key parity).
- **Test Suite Updates**:
  - Updated `routes.test.jsx`, `roles.test.jsx`, `edge-states.test.jsx`, `interactions.test.jsx`, `scan-flows.test.jsx`, `dialogs.test.jsx`, and `entrypoints.test.jsx` for bilingual assertions (handling both English default and Filipino language modes).
- **Verification & Gates**:
  - `check-i18n.mjs`: 18/18 namespaces verified, 0 missing keys, 701 validated `t(...)` calls, untranslated candidate count reduced from 321 to 242.
  - Vitest: All 13 test files passing, 168/168 tests green.
  - ESLint: 0 errors, 0 warnings.
  - Vite build: Production bundle built cleanly.
  - Backend: Pest 74/74 tests green, Pint clean.
### H4d Log (Sales, Customers, and Utang Feature Localization):
- **Feature Component Translation**:
  - Fully translated all 7 target files with standard English default and rich Taglish/Filipino translation:
    - Sales: `SalesPage.jsx`, `SaleDetailPage.jsx`.
    - Customers: `CustomersPage.jsx`, `CustomerDetailPage.jsx`, `CustomerFormDialog.jsx`.
    - Utang: `UtangPage.jsx`, `RecordPaymentDialog.jsx`.
- **Locale Dictionary Alignment**:
  - Expanded `en/sales.json` & `fil/sales.json` (100 keys each, 100% key parity).
  - Expanded `en/customers.json` & `fil/customers.json` (94 keys each, 100% key parity).
  - Expanded `en/utang.json` & `fil/utang.json` (62 keys each, 100% key parity).
- **Test Suite Updates**:
  - Updated `routes.test.jsx`, `dialogs.test.jsx`, `entrypoints.test.jsx`, and `interactions.test.jsx` for bilingual assertions and heading role queries on dual-label modals.
- **Verification & Gates**:
  - `check-i18n.mjs`: 18/18 namespaces verified, 0 missing keys, 979 validated `t(...)` calls (+278 calls verified), untranslated candidate count reduced from 242 to 187.
  - Vitest: All 13 test files passing, 168/168 tests green.
  - ESLint: 0 errors, 0 warnings.
  - Vite build: Production bundle built cleanly.

### H4e Log (Reports, Users/Staff, Settings, Errors Feature Localization):
- **Feature Component Translation**:
  - Fully translated all remaining feature pages with standard English default and Taglish/Filipino translation:
    - Reports: `ReportsPage.jsx` (charts, stat cards, time-of-day heatmap, export actions, date filters).
    - Staff: `StaffPage.jsx` (directory, cashier status toggling, permissions, add cashier dialog, confirm toggle dialog).
    - Settings: `SettingsPage.jsx` (store profile, receipt customizer and live receipt preview, stock defaults, data reset dialog).
    - Account: `AccountPage.jsx` (user profile, auth info, theme switcher, change password modal and form).
    - System: `NotFoundPage.jsx` (404), `ForbiddenPage.jsx` (403).
- **Locale Dictionary Alignment**:
  - Expanded `en/reports.json` & `fil/reports.json` (75 keys each, 100% key parity).
  - Expanded `en/users.json` & `fil/users.json` (53 keys each, 100% key parity).
  - Expanded `en/settings.json` & `fil/settings.json` (97 keys each, 100% key parity).
  - Expanded `en/errors.json` & `fil/errors.json` (23 keys each, 100% key parity).
- **Test Suite Updates**:
  - Updated `interactions.test.jsx` for bilingual tab matchers (`Receipt & Preview`, `Stock Defaults`, `Data & Reset`, `Store Profile`).
  - Updated `flows.test.jsx` for bilingual assertions on `/staff`.
- **Verification & Gates**:
  - `check-i18n.mjs`: 18/18 namespaces verified, 0 missing keys, 1,175 validated `t(...)` calls (+196 calls verified), untranslated candidate count reduced from 187 to 137.
  - Vitest: All 13 test files passing, 168/168 tests green.
  - ESLint: 0 errors, 0 warnings.
  - Vite build: Production bundle built cleanly.

### H5 Log (Backend In-DB Product Images, ULID Binary Storage, and SSRF Import):
- **Database Schema & Models**:
  - Migration `2026_10_13_000005_create_product_images_table.php`:
    - ULID primary `id`; `product_id` nullable FK cascade; `mime` string; `size_bytes` unsigned int; `width`/`height` nullable; `sha256` string(64) indexed; `source` string/enum; `source_url` nullable; `data` binary (`MEDIUMBLOB` up to 16MB on MySQL, binary on SQLite); timestamps.
  - Model `App\Models\ProductImage`:
    - Uses `HasUlids`, casts for dimensions and byte size, `belongsTo(Product::class)`.
  - Model `App\Models\Product`:
    - Added `image(): HasOne` relationship.
- **Service Layer (`ProductImageService`)**:
  - Validates image MIME (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) via `finfo` buffer inspection.
  - Computes `sha256` checksum and extracts dimensions via `getimagesizefromstring`.
  - Atomically stores image in `product_images` and updates `products.image_url` to `/api/product-images/{ulid}`.
  - SSRF-safe URL import:
    - Host allowlist (`*.openfoodfacts.org`, `*.openfoodfacts.net`).
    - Resolves IPs and rejects loopback (`127.0.0.1`, `::1`), link-local / cloud metadata (`169.254.169.254`), and private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
    - 8-second timeout, 2MB max download limit.
  - Auto-import triggered on `ProductController` `store` and `update` when receiving external Open Food Facts image URLs.
- **Endpoints & Controller (`ProductImageController`)**:
  - `GET /api/product-images/{ulid}`: Public streaming with `Content-Type`, `Content-Length`, `ETag: "{sha256}"`, `304 Not Modified`, and `Cache-Control: public, max-age=31536000, immutable`.
  - `POST /api/products/{id}/image`: Owner-only file upload up to 1MB.
  - `POST /api/products/{id}/image/import`: Owner-only Open Food Facts URL import.
  - `DELETE /api/products/{id}/image`: Owner-only deletion, clears `image_url`.
- **Testing & Verification**:
  - Authored `backend/tests/Feature/ProductImageTest.php` with 10 comprehensive tests (57 assertions) covering streaming, 304 ETag caching, 404 handling, owner upload, cashier/guest 403 blocks, file size limits & MIME checking, Open Food Facts import, SSRF rejection, image deletion, and automatic store/update import.
  - Backend Pest: 84/84 tests passing (450 assertions).
  - Pint: Clean PSR-12 code style.



