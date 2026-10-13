# TindaTrack v1.2.0 Pre-Deployment Audit & Hardening Matrix

This document records the comprehensive audit across security, authentication, data integrity, frontend runtime, deployment readiness, and localization ahead of Railway (backend + MySQL) and Vercel (frontend) deployment.

## Audit Findings Matrix

| ID | Severity | Area | File:Line | Problem | Fix Plan |
|---|---|---|---|---|---|
| **SEC-01** | **High** | Security / Auth | `backend/routes/auth.php:13` | `POST /api/login` has no route-level throttle middleware (`throttle:10,1`). IP-based brute-force requests are not blocked prior to controller execution. | Add `throttle:10,1` middleware to `POST /api/login` route in `routes/auth.php`. |
| **SEC-02** | **High** | Security / Demo | `frontend/src/features/auth/pages/LoginPage.jsx:146` | Demo credentials (`owner@tindatrack.test`, passwords) are bundled directly in the client bundle and leak into production builds. | Move demo account logic and panel to dev-only module `src/features/auth/dev/demoAccounts.js`, loaded strictly behind `import.meta.env.DEV`. Add `scripts/check-prod-bundle.mjs`. |
| **SEC-03** | **High** | Security / Demo | `backend/database/seeders/ReferenceDataSeeder.php:32` | Seeders create demo accounts with static default passwords (`password`) even in production if run without configuration. | In production environment, create demo users only if `DEMO_OWNER_PASSWORD` and `DEMO_CASHIER_PASSWORD` are set. Skip and warn operator otherwise. Never create default passwords in production. |
| **SEC-04** | **High** | Security / Images | `backend/routes/api.php` | Custom products have no way to upload images, and external image URLs could introduce SSRF if fetched server-side without allowlist and protocol guards. | Implement binary image database storage (`product_images` table), multipart upload endpoint, and SSRF-safe image import endpoint with host allowlist. |
| **SEC-05** | **High** | Session / Cart | `frontend/src/context/AuthContext.jsx:21` | Logout / user switch does not clear the persisted cart (`useCartStore`) or active POS scanner session. Cart items leak between accounts (e.g., owner cart displayed when cashier logs in). | Clear cart store and purge `tt_pos_cart` from storage on `clearSession()`. |
| **DEP-01** | **High** | Deployment / Railway | `backend/nixpacks.toml:6` | `nixpacks.toml` pins `php83` packages while `composer.lock` requires PHP >= 8.4.1. Railway build will fail. | Update `nixpacks.toml` to pin PHP 8.4 and required extensions (`php84Extensions.pdo_mysql`, `mbstring`, `bcmath`, `fileinfo`). |
| **DEP-02** | **High** | Deployment / Vercel | `frontend/vercel.json:3` | `vercel.json` rewrites all paths including static assets, and lacks cache headers for `/assets/*`. | Update `vercel.json` with clean SPA rewrite and 1-year immutable caching for `/assets/*`. |
| **SEC-06** | **Medium** | Security / Sanctum | `backend/config/sanctum.php:53` | Sanctum expiration uses `SANCTUM_TOKEN_EXPIRATION`, whereas deployment guides reference `SANCTUM_EXPIRATION`. | Support both `SANCTUM_EXPIRATION` and `SANCTUM_TOKEN_EXPIRATION` in `config/sanctum.php`. |
| **DEP-03** | **Medium** | Deployment / HTTPS | `backend/app/Providers/AppServiceProvider.php:23` | `URL::forceScheme('https')` is not called in production, risking mixed-content asset generation behind Railway's reverse proxy. | Add `if (app()->environment('production')) { URL::forceScheme('https'); }` in `AppServiceProvider::boot()`. |
| **DEP-04** | **Medium** | Deployment / Config Cache | `backend/database/seeders/ReferenceDataSeeder.php:32` | Direct `env()` calls in seeders evaluate to `null` when `config:cache` is active. | Route seed configuration through `config/app.php` and use `config('app....')`. |
| **UI-01** | **Medium** | UX / Barcode Auto-Fill | `frontend/src/features/products/components/ProductFormDialog.jsx:165` | Typing a valid barcode does not auto-lookup online; scanning requires multiple manual clicks; no Quick Add by Scan shelf-onboarding mode. | Implement 500ms debounce auto-lookup on valid GTIN, dedicated Quick Add by Scan dialog, and continuous "Save & scan next" flow. |
| **UI-02** | **Medium** | UX / Product Images | `frontend/src/features/products/components/ProductFormDialog.jsx:533` | `imageError` state does not reset when image URL updates, permanently breaking preview; no camera capture or file upload for local products. | Add image upload, camera capture (`capture="environment"`), client-side canvas resize to WebP/JPEG <= 300KB, and proper preview error resets. |
| **I18N-01** | **Medium** | Localization | Whole application | User-facing copy is hardcoded Taglish without English translation or localization system. | Implement `i18next` with English default, Filipino/Taglish option, settings toggle, and `check-i18n.mjs` parity validation. |
| **UI-03** | **Low** | UX / Hotkeys | `frontend/src/hooks/useHotkey.js:14` | Hotkeys not checking `ignoreInputs` can trigger while typing in text inputs if metaOrCtrl is false. | Add `ignoreInputs: true` by default in `useHotkey.js`. |
| **DEP-05** | **Low** | Deployment / Hygiene | `backend/railway.toml:6` | `preDeployCommand` in `railway.toml` should cache config, routes, and views for optimal startup performance. | Optimize Railway deployment commands to cache configs and routes after migrations. |

---

## Detailed Audit Observations

### 1. Security & Authentication
- **Role Matrix**: Audited all 57 API routes via `php artisan route:list --path=api -v`. Ownership checks, `active` middleware, and role enforcement (`owner` vs `cashier`) are correctly bound.
- **Login Rate Limiter**: FormRequest `LoginRequest` contains `RateLimiter` hitting `email|ip` with 5 attempts. Adding route-level `throttle:10,1` ensures connection-level protection.
- **Sanctum Tokens**: Token revocation on logout (`$request->user()->currentAccessToken()->delete()`) verified. Token expiration is configured to 7 days (10080 minutes).
- **Sensitive Error Exposure**: In `bootstrap/app.php`, JSON responses are forced on API routes; in production (`APP_DEBUG=false`), stack traces are completely suppressed.

### 2. Data Integrity
- **Transactional Consistency**: `CreateSaleAction`, `VoidSaleAction`, `AdjustStockAction`, and `RecordPaymentAction` all use `DB::transaction()` and pessimistic locking (`lockForUpdate()`).
- **Stock Floor Guard**: Negative stock is blocked at both database validation and domain action layers (`min:0` check and exception throw).
- **Monetary Precision**: Money attributes cast to decimal(10,2) in Eloquent models and rounded to 2 decimal places before database insertion.
- **Timezone**: Set to `Asia/Manila` in `config/app.php` and `phpunit.xml`.
- **System Reconciliation**: `php artisan tindatrack:check` verified 100% data reconciliation (customer utang balances, stock movements, unique sale numbers).

### 3. Frontend Runtime & Containment
- **Containment & Responsiveness**: Audited shell layout and wide tables at 360px viewport; horizontal scroll containment and overflow guards verified.
- **Error Boundaries**: Every route group in `router.jsx` includes `errorElement: <RouteErrorBoundary />`. 404 page is registered at wildcard `*`.
- **Double-Submit Protection**: Submit buttons across `PaymentDialog`, `ProductFormDialog`, `RecordPaymentDialog`, `AdjustStockDialog`, and `ConfirmDialog` disable during async mutations.
- **Cart & Session Isolation**: Persisted cart store must be purged on logout to prevent state leakage between accounts.

### 4. Deployment Readiness
- **Railway**: Nixpacks must pin PHP 8.4 to satisfy `composer.lock`. Caches (`config:cache`, `route:cache`) succeed. `URL::forceScheme('https')` must be enforced in production.
- **Vercel**: `vercel.json` SPA rewrite must route all non-asset requests to `/index.html` and configure long-term cache headers for assets.
