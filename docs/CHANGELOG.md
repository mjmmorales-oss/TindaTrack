# Changelog — TindaTrack Phase 3

All notable changes in Phase 3 of TindaTrack are documented here.

## [v2.0.0] - 2026-10-17 - AI Basket Scan, AI Product Add, On-Device Visual Search & AI Research Lab
- **AI Multi-Object POS Basket Scan (A1, A4)**:
  - Google Gemini multi-modal vision provider (`gemini-2.5-flash` with automatic fallback to `gemini-2.5-flash-lite`), catalog-constrained recognition (`basket-v1`), and deterministic offline mock vision provider (`MockVisionProvider`).
  - Interactive bounding box review sheet (`BasketReviewSheet.jsx`) rendering normalized bounding boxes over canvas captures, confidence badges (`high`, `check`, `low`), quantity steppers, stock overflow warnings, and inline unmatched item assignment.
  - POS toolbar AI Scan trigger with sparkles button and shortcut in scanner modal tabs (**Barcode | Visual | AI basket**).
  - Paired phone camera basket capture (`PhoneScannerPage.jsx`) submitting to `POST /api/scanner/ai-basket` using device token authentication and broadcasting realtime sync event `type: 'ai_basket'`.
  - Cashier feedback tracking (`POST /api/ai/scans/{scan}/feedback`) recording accepted, edited, and rejected item decisions for research metrics.
- **AI Bulk Product Intake & GTIN Enrichment (A3, A5)**:
  - Multi-product intake extraction prompt (`products-v1`) parsing up to 5 items simultaneously from a single counter layout photo.
  - Automatic OCR of packaging barcodes with Open Food Facts GTIN enrichment (`ProductLookupService`) and prefilled Filipino product titles, brands, net weights, and categories.
  - Existing inventory duplicate detection via normalized GTIN matching and fuzzy Levenshtein distance ($\ge 85\%$) offering one-click restock shortcuts.
  - Unified Add menu on `ProductsPage.jsx` ("Add by barcode", "Add from photo (AI)", "Add product") with responsive mobile dropdown adaptation.
  - Interactive multi-row review table (`AiProductReviewTable.jsx`) with client-side canvas bounding box cropping, per-item image editing, and bulk creation endpoint (`POST /api/products/bulk`).
- **On-Device Feature Extraction & Visual Search (A6)**:
  - Integrated `@huggingface/transformers` running Meta DINov2 (`onnx-community/dinov2-small`, quantized `q8`, 384-dimensional embeddings) in a dedicated Web Worker (`embedder.worker.js`).
  - WebGPU execution with automatic WASM fallback, zero main-thread UI blocking, and bundle chunk isolation (`vendor-transformers`).
  - High-performance dot-product cosine similarity engine (`visualSearch.js`) with confidence threshold ($\ge 0.60$) and margin threshold ($\ge 0.03$).
  - Continuous learning loop allowing store owners to teach visual corrections directly from POS scans (`POST /api/products/{id}/embeddings` with `source: 'correction'`).
  - Settings visual index builder (`AiSettingsCard.jsx`) and per-product reference photo management in `ProductDetailPage.jsx`.
- **AI Research Lab & Benchmark Runner (A7)**:
  - AI Research Lab interface (`/ai-lab`) with metrics overview (precision, recall, quantity MAE, latency percentiles, scan history).
  - Transaction checkout speed analytics tracking elapsed duration by entry method (`ai_basket`, `visual`, `barcode`, `tap`).
  - Evaluation benchmark runner (`ai_experiments`, `ai_experiment_cases`) executing ground-truth photo datasets with precision/recall scoring and per-case error diagnostics.
  - One-click CSV export endpoints (`/api/ai/metrics/export.csv` and `/api/ai/experiments/{id}/export.csv`).
- **Settings, Privacy & Cashier Safety (A8)**:
  - Mandatory bilingual first-use consent dialog (`FirstUseAiConsentDialog.jsx`) in English and Filipino with strict "no human faces" instructions.
  - Per-user device consent storage (`tt_ai_consent_{userId}`) ensuring explicit agreement before image transmission.
  - Strict role-based boundaries: cashiers can use POS basket scan and visual search; only owners can access AI Lab, bulk intake, index building, and AI settings.
  - Ephemeral image buffers by default; optional persistent image retention with 30-day lazy pruning and CLI pruning command (`php artisan ai:prune`).
  - Bundle secret scanning (`check-prod-bundle.mjs`) blocking Google AI Studio keys (`AIza`, `GEMINI`, `generativelanguage`).
- **Backend Infrastructure & Testing (A1–A3, A9)**:
  - 6 new database tables: `ai_scans`, `ai_scan_feedback`, `ai_scan_images`, `product_embeddings`, `ai_experiments`, `ai_experiment_cases`.
  - Transaction-level telemetry tracking `cart_started_at` and `cart_duration_ms` on `sales`, and `add_method` on `sale_items`.
  - `php artisan ai:ping` command for testing connectivity and latency to vision providers.
  - 136 passing Pest tests, 247 passing Vitest tests across 24 suites.

## [v1.4.0] - 2026-10-17 - Packshot Demo Catalog, Image-First POS & Installable PWA
- **Deterministic Demo Packshot Catalog (P1)**:
  - 58 deterministic vector SVG packshots (`frontend/public/demo-products/*.svg`) crafted specifically for traditional Philippine sari-sari items across 8 categories (Beverages, Instant Noodles, Canned Goods, Snacks, Condiments & Cooking, Coffee & Milk, Personal Care, and Household & Cleaning).
  - Scripted reproducibility: `npm run gen:demo-art` (`frontend/scripts/generate-demo-product-art.mjs`) generates all 58 packshots deterministically from seed product data.
  - Seeder & Mock Data synchronization: `backend/database/data/products.json` and `frontend/src/mocks/data/products.js` mapped to `/demo-products/*.svg`.
  - Image URL resolution: `resolveImageUrl` updated to map `/demo-products/*` and root-relative static assets against frontend origin (`window.location.origin`), keeping them independent of the backend API host.
  - Image preservation on re-seeding: `ReferenceDataSeeder.php` preserves existing non-null `image_url` on re-seeds, protecting uploaded photos.
  - Demo packshot restoration: Added `POST /api/settings/restore-demo-images` endpoint and frontend Settings action ("Restore demo images") guarded with `ConfirmDialog` to restore demo packshots for standard products missing an image without altering custom uploads.
- **Image-First POS Experience (P2)**:
  - Redesigned `ProductTile.jsx`: aspect-square cover container with subtle padding for SVG packshots (`ProductThumb variant="cover"`), high-contrast bold price below the title, floating stock chips only for low-stock and out-of-stock states, floating in-cart quantity badge (`×{qty}`) animated via `motion/react`, and removed cluttered SKU and category tags.
  - Tactile card micro-interactions: `active:scale-[0.98]` press feedback, keyboard `Enter`/`Space` activation, and context-menu inspection.
  - Responsive auto-fill grid: `ProductGrid.jsx` migrated to `grid-cols-[repeat(auto-fill,minmax(140px,1fr))]` on mobile and `minmax(160px,1fr)` on desktop. Skeleton loaders updated to match aspect-square cover cards.
  - Compact List Mode: Added optional list row layout (`ProductListRow.jsx`) with 48x48 thumbnail, stock indicator, price, and quick-add button.
  - View mode toggle: Grid vs. List toggle in POS header, persisted in `localStorage('tindatrack-pos-view-mode')`.
- **Rich Cart Ergonomics & Mobile Bar (P3)**:
  - Cart item thumbnails: `CartItemRow.jsx` now renders a 48x48 rounded thumbnail on the left, stacked item name and unit price breakdown, and hides SKU text.
  - Quantity Stepper: Compact stepper with micro-scale pulse animation (`scale: [1, 1.25, 1]`) on quantity modification.
  - Swipe-to-Remove gesture: Touch swipe gesture on mobile reveals an underlying red trash action; swiping past threshold removes the item and triggers a Sonner toast with an "Undo" action.
  - Mobile Cart Bar: `MobileCartBar.jsx` renders overlapping circular thumbnails (up to 3 items) alongside the item count, total price, and checkout trigger.
- **Brand Icon Suite & Asset Generator (P4)**:
  - Unified vector brand identity: Vector source marks `public/logo.svg` and `public/logo-maskable.svg` with emerald theme (`#0e7c66`, `#064e3b`) and amber accents (`#fbbf24`).
  - Automated asset generation: Configured `pwa-assets.config.js` and wired `npm run gen:icons` (`pwa-assets-generator`) generating `favicon.ico`, `apple-touch-icon-180x180.png`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, and `maskable-icon-512x512.png`.
  - Replaced purple Vite placeholder favicon with TindaTrack store vector icon (verified 0 references to `#863bff` or `vite.svg`).
  - Added theme-color and apple-touch-icon metadata to `index.html`.
- **Installable Progressive Web App (PWA) with Native Feel (P5)**:
  - `vite-plugin-pwa` integration: `registerType: 'prompt'`, `devOptions: { enabled: false }` (disabled in development to prevent stale caches and cert issues).
  - Web App Manifest: `display: standalone`, `display_override: ['standalone', 'minimal-ui']`, `start_url: '/?source=pwa'`, brand theme colors, maskable icon, and shortcuts for POS, Inventory, and Scan to add.
  - Workbox Caching Rules: App shell precaching (JS, CSS, HTML, Wasm, fonts), CacheFirst for `/demo-products/*` and `/api/product-images/*` (30 days), and strictly **NetworkOnly** for all authenticated `/api/**` business routes.
  - Standalone Polish: CSS rules for safe-area insets (`padding-top: env(safe-area-inset-top)` on sticky headers, `padding-bottom: env(safe-area-inset-bottom)` on mobile bottom nav), `overscroll-behavior: none` to prevent pull-to-refresh bounce, `-webkit-tap-highlight-color: transparent`, and touch callout suppression on navigation and tiles.
  - `usePwaInstall` hook: Captures `beforeinstallprompt` on Android/Chrome, detects iOS Safari standalone state, and suppresses installation UI once installed.
  - Install helpers: `PwaInstallCard` in Settings Profile, `PwaInstallMenuItem` in user dropdown menu, and `PwaInstallIosDialog` with step-by-step Safari instructions (Share → Add to Home Screen).
  - Update Prompt: `PwaUpdatePrompt` mounts `useRegisterSW` and displays an unobtrusive Sonner toast ("A new version is available") with a "Reload" button when an update is waiting.
  - Automated gate: `scripts/check-pwa.mjs` (`npm run check:pwa`) verifying manifest, service worker, disk icons, meta tags, and absence of legacy Vite branding.
  - Vitest coverage: 7/7 automated tests in `src/test/pwa.test.jsx`.

## [v1.3.0] - 2026-10-16 - Unified Add by Barcode, Mobile Input Polish & Staff Management
- **Unified "Add by Barcode" Flow (U1)**:
  - Replaced fragmented barcode entry paths (`QuickAddScanDialog` and separate scanner sheets) with unified `BarcodeCapture.jsx` and `AddByBarcodeDialog.jsx`.
  - Four distinct product states seamlessly managed in a single responsive modal:
    1. *Local match*: Displays existing product with price, stock, and quick restock / edit shortcuts.
    2. *Found online (Open Food Facts)*: Displays item preview with photo, pre-filling name, brand, size, and auto-suggested category with attribution.
    3. *Not found anywhere*: Clean minimal manual entry form with photo upload and inline GTIN confirmation.
    4. *Custom / homemade*: One-click internal barcode generator (`makeInternal`) generating valid `20xxxx...` EAN-13 barcodes with printable sticker label sheet shortcut (`PrintLabelsDialog`).
  - Continuous shelf inventory intake with session counter ledger ("Added this session (N)") and clickable thumbnails for rapid post-creation edits.
  - Camera resilience: 8-second initialization timeout guard, explicit retry mechanisms, pointer-coarse auto-open toggle with `localStorage` persistence, synthetic WebAudio oscillator beep, haptic vibration, and 1500ms duplicate suppression.
  - Hardware USB and Bluetooth barcode scanner wedge support (`useBarcodeWedge`) capturing rapid keystroke bursts and Enter/CR termination while preserving standard keyboard typing.
- **Mobile Input Zoom Prevention & Safety Floor (U2)**:
  - Pointer-coarse safety floor (`@media (pointer: coarse)`) under Tailwind CSS `@layer base` setting `font-size: max(16px, 1em) !important;` on all inputs, textareas, selects, `contenteditable`, and `cmdk-input`, eliminating iOS Safari viewport auto-zooming on focus.
  - Global touch optimization: `overscroll-behavior-y: none; -webkit-text-size-adjust: 100%;` and `touch-action: manipulation;` on buttons and form controls to eliminate 300ms double-tap zoom delays.
  - Component input sizing audited: `CommandInput` updated to `text-base md:text-sm`, and all table filter inputs upgraded to responsive `text-base md:...`.
  - Replaced legacy viewport units with dynamic viewport height (`min-h-dvh`) across all layouts and auth wrappers.
  - Viewport meta updated to include `viewport-fit=cover, interactive-widget=resizes-content`.
  - Added automated mobile lint gate `scripts/check-mobile.mjs` (`npm run check:mobile`).
- **Mobile Drawers & Sheets Keyboard Polish (U3)**:
  - Dynamic visual viewport tracking hook `useVisualViewport.js` computing `--vvh` and `--keyboard-inset` with throttled `requestAnimationFrame` and `data-keyboard="open"|"closed"` DOM state.
  - Resilient drawer geometry: drawer heights bound to `calc(var(--vvh, 100dvh) - env(safe-area-inset-top) - 12px)`; sticky footers with `safe-area-inset-bottom`; `repositionInputs={false}` to prevent transform jitter with virtual keyboard.
  - `overlayStore.js` coordinating active modals and drawers; `MobileBottomNav` and `MobileCartBar` automatically hide during active modal or keyboard presentation.
  - Comprehensive documentation in `docs/MOBILE.md` and automated Vitest suite `mobile-drawers.test.jsx`.
- **Full Staff Management & Security Rule Codes (U4)**:
  - Soft-deletes (`deleted_at`) for cashiers, preserving historical sales, utang records, and stock audit trails with `withTrashed()` model associations.
  - Added `phone` and `must_change_password` attributes to users.
  - Backend `UserController` with role gates, `status` filtering (`active`, `inactive`, `archived`, `all`), and live sales metrics (`sales_count`, `sales_total_today`) without N+1 queries.
  - High-entropy 12-character temporary password auto-generation (`generate_password`), returning `temporary_password` upon creation and password reset.
  - Strict security rule codes: `self_action`, `last_owner`, `owner_protected`, `email_taken`, and `user_archived`.
  - Session revocation (`revokeSessions`) invalidating all Sanctum bearer tokens and ending active phone scanner sessions.
  - Frontend `StaffPage` with tabbed views, mobile cards, detail sheets, temporary password copy dialog, and top `MustChangePasswordBanner`.
  - 14/14 backend Pest tests (`StaffManagementTest.php`) and 5/5 Vitest tests (`staff.test.jsx`).
- **Bilingual i18n Parity & Zero Marker Leaks (U5)**:
  - English default verified with complete Taglish/Filipino toggle coverage across all UI namespaces.
  - Hardened `scripts/check-i18n.mjs` scanning both frontend and backend for forbidden Filipino markers in default English strings and ensuring exact placeholder parity (`{name}`, `{count}`, `{amount}`, etc.).
  - Synchronized dictionary keys across `en/` and `fil/` with 0 missing translations.
  - Bilingual test assertion compatibility across all Vitest suites.
- **Regression Verification & Deployment Readiness (U6–U7)**:
  - Verified image upload, camera capture, and Open Food Facts import pipelines (`images.test.jsx`).
  - Automated smoke testing: production build bundle scan (`check-prod-bundle.mjs`, 94 assets, 0 leaks), production-like HTTP smoke test (`smoke-prod-like.mjs`), and direct API phone pairing smoke test (`smoke-pairing.mjs`).
  - Layout containment and single-header chrome verified across all public and protected routes (`containment.test.jsx`).
  - Backend test coverage: 98/98 Pest tests green, 100% clean Pint styling.
  - Frontend test coverage: 206/206 Vitest tests green across 17 test suites.

## [v1.2.0] - Pre-Deployment Hardening, English-First i18n, In-DB Images & Quick Add Barcode Flow
- **Pre-Deployment Hardening & Security Audit (H0–H2, H8)**:
  - Sanctum token authentication hardening: connection-level `throttle:10,1` on `POST /api/login`, dual environment expiration (`SANCTUM_EXPIRATION` and `SANCTUM_TOKEN_EXPIRATION`), token revocation on logout.
  - Secret & credential segregation: dev-only demo accounts module, zero demo strings in production bundles verified via `scripts/check-prod-bundle.mjs`. Production seeders require explicit operator passwords (`DEMO_OWNER_PASSWORD`, `DEMO_CASHIER_PASSWORD`).
  - Cart and session isolation: purged cart stores, POS cart storage, scanner pairing sessions, and TanStack query caches on user switch or logout (`SEC-05`).
  - Production HTTPS scheme enforcement (`DEP-03`) via `URL::forceScheme('https')` in `AppServiceProvider.php`.
  - Hotkey typing suppression (`UI-03`): `ignoreInputs: true` prevents inadvertent triggers while typing in inputs.
- **Bilingual Internationalization (H3–H4e)**:
  - English default with Taglish/Filipino toggle in Settings (`I18N-01`).
  - 18 complete namespaces across `en/` and `fil/` with 100% dictionary key parity verified by `scripts/check-i18n.mjs` over 1,213 `t(...)` calls.
- **In-DB Product Images with ULID Binary Storage & SSRF Protection (H5–H6)**:
  - `product_images` table with `MEDIUMBLOB` up to 16MB on MySQL, ULID primary keys, and SHA-256 checksum indexing (`SEC-04`).
  - Public streaming endpoint `GET /api/product-images/{ulid}` with 1-year immutable caching and 304 ETag revalidation.
  - Owner-only upload (`POST /api/products/{id}/image`) and SSRF-safe URL import (`POST /api/products/{id}/image/import`) with host allowlist and IP block.
  - Frontend client-side canvas downscaling (max 800px, WebP/JPEG <= 300KB) and camera photo capture (`capture="environment"`).
  - Dynamic `resolveImageUrl` with origin resolution and preview error state resets on URL update (`UI-02`).
- **One-Step Barcode Auto-Fill & Continuous Quick Add Flow (H7)**:
  - Continuous "Quick Add by Scan" modal (`QuickAddScanDialog`) for high-speed shelf inventory intake with automatic price focus and session counter (`UI-01`).
  - Local duplicate inventory restock buttons (`+5`, `+10`, `+20`, `+50`).
  - 500ms debounced GTIN auto-lookup on manual typing in `ProductFormDialog`.
  - Configurable "Auto Online Barcode Lookup" preference toggle in Settings (`tt_auto_barcode_lookup`).
- **Deployment Hardening (H9)**:
  - Pinned PHP 8.4 runtime in `backend/nixpacks.toml` with `pdo_mysql`, `bcmath`, `mbstring`, and `fileinfo` (`DEP-01`).
  - Optimized Railway `preDeployCommand` with `config:cache`, `route:cache`, and `view:cache` (`DEP-05`).
  - Hardened Vercel `vercel.json` SPA rewrites and 1-year immutable cache headers for `/assets/*` (`DEP-02`).
  - Production-like HTTP smoke test script `scripts/smoke-prod-like.mjs` (`npm run smoke:prod`).
- **Verification Gates**:
  - Vitest: 15/15 test files passing (184/184 tests green).
  - Pest: 84/84 tests passing (450 assertions).
  - Pint: Clean PSR-12 code style.
  - ESLint: 0 errors.
  - Vite build: Clean production bundle compiled.
  - Bundle security: 92 assets scanned, 0 secrets/dev leaks.
  - Contract check: 49/49 API contracts verified against Laravel routes, 12/12 service facades matched.

## [v1.1.1] - Fix Phone Pairing & End-to-End Live Sync Hardening
- **Phone Pairing Response Unwrapping & API Base Fixes (F0–F1)**:
  - Resolved primary root cause where `apiClient.js` returns Axios `response.data`, leaving nested `{ data: { ... } }` wrapped in `scannerService.js` and `barcodeService.js`. Unwrapped all response payloads so `pairing_code`, `id`, and `pairing_expires_at` evaluate properly.
  - Eliminated "----" placeholder and `?code=undefined` QR links; QR codes now consistently encode valid session codes (`XXXX-XXXX`).
  - Fixed API base resolution in `src/lib/api.js`: explicit empty string (`VITE_API_URL=""`) in `dev:lan` correctly maps to relative `/api` paths rather than falling back to `http://localhost:8000/api`.
  - Updated `vite.config.js` proxy with `changeOrigin: true` and `secure: false` ensuring same-origin LAN requests from both laptop and mobile phones reach Laravel cleanly.
  - Forced `VITE_DATA_SOURCE=api` in `frontend/package.json` `dev:lan` script.
- **Session Lifecycle & StrictMode Protection (F1)**:
  - Added ref locks (`hasCreatedForOpenRef`, `isCreatingRef`) to `PairPhoneDialog.jsx` preventing React StrictMode double-mounting from triggering duplicate `POST /api/scanner-sessions` calls that terminated active sessions.
  - Added unmount/close cleanup that explicitly ends un-paired sessions via `endScannerSession()`.
  - Replaced static countdown fallback with server-derived countdown based on `pairing_expires_at`, with automatic fresh code request upon reaching 0 seconds.
  - Added skeleton loading state and error alert card with Taglish error description and "Subukan ulit" retry button; prevents rendering QR code or code display without a valid pairing code.
  - Added localhost mismatch detection alerting users when POS is accessed via localhost while attempting to pair LAN mobile devices.
- **Pairing Code Sanitization & Machine-Readable Error Reasons (F1)**:
  - Updated backend `ScannerDeviceController@pair` and mock service to sanitize incoming codes (case-insensitive, dash-stripped, auto-hyphenated 8-char normalization).
  - Added machine-readable `reason` fields (`not_found`, `expired`, `used`) on HTTP 422 responses.
  - Updated `/scan` page to map all failure reasons to distinct Taglish messages, including network unreachable and missing code in URL.
- **End-to-End Verification & Automated Test Suites (F2–F3)**:
  - Added `backend/tests/Feature/ScannerEndToEndTest.php` (Pest) testing full HTTP route lifecycle: owner session creation, lowercase/dashless code pairing, product scan, event polling, session superseding, and machine-readable failure reasons.
  - Added standalone Node smoke verification script `scripts/smoke-pairing.mjs` (`npm run smoke:pairing`) validating both Direct API (`http://127.0.0.1:8000`) and Vite HTTPS reverse proxy (`https://127.0.0.1:5173`).
  - Expanded `frontend/src/test/scan-flows.test.jsx` (23 tests green) covering Laravel wrapped response fixtures, StrictMode single session invocation, fake-timer countdown auto-request, `/scan` failure reasons, and API client relative base resolution.
- **Documentation (F4)**:
  - Added "Troubleshooting Pairing" guide to `docs/BARCODE.md` covering prerequisites, local IP configuration, mobile self-signed SSL acceptance, smoke script usage, and failure message explanations.

## [v1.1.0] - Barcode Scanning, Open Food Facts Auto-Fill, and Phone-to-POS Live Sync
- **Backend Schema & Architecture (B1–B4)**:
  - Migrated `products` table adding `image_url`, `brand`, `size`, `source`, `source_ref`, and unique indexed `barcode`.
  - Added `barcode_catalog` cache table storing Open Food Facts lookup results with 30-day hit and 1-day miss TTLs.
  - Added `scanner_sessions` and `scanner_events` tables for phone-to-POS pairing and live scan feeds.
  - Added `App\Support\Barcode` helpers (`normalize`, `isValidGtin`, `isInternal`, `isAcceptable`, `makeInternal`).
  - Added `App\Services\ProductLookupService` integrating Open Food Facts API (with Open Products and Open Beauty fallback) and intelligent category guessing (`App\Support\CategoryGuesser`).
  - Added `scanner.device` middleware with scoped `X-Scanner-Token` authentication (sha256 hash at rest, zero-login).
  - Added `App\Events\ScannerItemScanned` implementing `ShouldBroadcastNow` for low-latency Laravel broadcasting over Pusher or polling.
  - Added automated unknown barcode tracking (`GET /api/scanner/unknown-barcodes`) resolving unknown events on product registration.
  - 70/70 backend Pest tests green with 100% mocked HTTP and authorization guards.
- **Frontend Barcode Core & Hardware Scanner (B5–B6)**:
  - Integrated `barcode-detector` ZXing-C++ WebAssembly ponyfill with local `locateFile` module loading.
  - Created `useCameraScanner` hook supporting environment camera switching, torch toggling, HTTPS security checks, and 1500ms duplicate throttling.
  - Created `useBarcodeWedge` hook capturing high-speed (<50ms) keystrokes from USB/Bluetooth handheld barcode scanners while preserving text inputs.
  - Added `feedback.js` providing WebAudio synthetic oscillator `beep()` and vibration haptics.
  - Created `src/services/barcode.js` and `src/services/scanner.js` with full API and mock implementations (`BroadcastChannel` cross-tab sync).
  - Created `src/lib/realtime.js` supporting configurable event drivers (`polling` default with deduplication, and `pusher` with automatic polling fallback).
- **POS & Owner Product Workflows (B7–B9)**:
  - Integrated live barcode scanning into POS terminal: camera scanner dialog, phone pairing dialog (`PairPhoneDialog`), persistent status badge ("📱 Phone scanner: Online"), and shared scan handler with cart quantity increments.
  - Created standalone `/scan` phone scanner page: public zero-login route, auto-pairing from QR code query parameters, screen wake lock (`navigator.wakeLock`), quantity multipliers, and 10s heartbeat.
  - Enhanced `ProductFormDialog`: "I-scan" and "Hanapin online" buttons, automatic GTIN detection, prefilling name/brand/size/image/category from Open Food Facts with ODbL attribution, duplicate barcode detection, and image preview.
  - Added homemade product barcode generator (`makeInternal`) generating internal `20xxxx...` EAN-13 barcodes, and printable sticker label grid (`PrintLabelsDialog` with `JsBarcode` SVG).
  - Added unknown barcodes alert card to Products page and barcode camera/wedge selection to `AdjustStockDialog`.
  - Added inventory restock mode to phone scanner pairing on `/inventory`.
- **Automated Frontend Test Suite (B10)**:
  - Added `src/test/scan-flows.test.jsx` (14 tests) validating POS cart effects, pairing dialog, `/scan` page interactions, camera insecure context messaging, and product form auto-fill behaviors.
  - Extended `src/test/containment.test.jsx` guarding `/scan` against sidebar and header duplication.
  - Total Vitest tests: 151 green across 12 test files.
- **Dev LAN Mode, Environment, and Documentation (B11)**:
  - Added opt-in `npm run dev:lan` mode with `@vitejs/plugin-basic-ssl`, `0.0.0.0` host listening, and API proxying to `http://127.0.0.1:8000` for physical phone testing on local Wi-Fi.
  - Authored comprehensive `docs/BARCODE.md` covering architecture, security, Open Food Facts caching, LAN testing, and 5-minute presentation demo script.
  - Updated `docs/DEPLOY.md` with Railway and Vercel environment variables.

## [v1.0.4] - Layout Containment & Dialog Entry Points (D1–D4)
- **Resolved Shell Layout Overflow (Bug 1)**:
  - Fixed flex/grid container blowout where wide tables expanded beyond the viewport, overlapping the sidebar, clipping PageHeader titles, and pushing action buttons off-screen.
  - Root cause resolved in `AppLayout.jsx` by adding `min-w-0 w-full overflow-x-hidden` to `SidebarInset` and `<main>`, `min-w-0 w-full` to `Topbar.jsx`, and `min-w-0` to `PageContainer.jsx`.
  - Added `min-w-0` and responsive `line-clamp-2 sm:truncate` to PageHeader title container, with `shrink-0` on action buttons to prevent headers from ever being pushed off-screen.
  - Added horizontal scroll containment wrapper (`data-slot="table-container"`, `overflow-x-auto min-w-0`) and `min-w-max` on `<table>` in `src/components/ui/table.jsx` and `DataTable.jsx`.
  - Applied structural containment across all pages rendering wide tables: Products, Sales, Customers, Utang, Inventory (all 4 tabs), Reports, Staff, Product Detail, and Customer Detail.
- **Adjust Stock Searchable Product Picker (Bug 2)**:
  - Fixed `/inventory` toolbar "I-adjust ang Stock" opening locked to a preselected product; toolbar button now opens dialog with `product={null}`.
  - Enhanced `AdjustStockDialog.jsx`: When opened with no product, renders a searchable Command + Popover picker (searching by name, SKU, and barcode) showing current stock, disabling all form inputs and submit actions until a product is selected.
  - Preserved read-only header card display when `product` is explicitly passed from table rows or detail pages.
- **Dialog Entry Points Audit**:
  - Audited all dialog entry points across `BulkRestockDialog`, `RecordPaymentDialog` (from `/utang` rows, `/customers` rows, customer profile, and toolbar), `ProductFormDialog`, `CustomerFormDialog`, `CategoryFormDialog`, POS `PaymentDialog`, `HeldCartsDialog`, and `ConfirmDialog` (void sale with reason enforcement).
- **Automated Test Suite Expansion (Vitest expanded from 103 to 123 tests)**:
  - Added `src/test/containment.test.jsx` (7 tests) enforcing PageHeader title visibility, table scroll wrappers, and no unprefixed fixed widths > 320px.
  - Added `src/test/entrypoints.test.jsx` (12 tests) validating AdjustStockDialog picker flow, row preselection, stock adjustment execution, and all dialog entry point configurations.

## [v1.0.3] - Deep Audit & Interaction Resilience (C1–C7)
- **Resolved Live Products Page Crash**: Fixed undefined dereferencing of `category_id` in `ProductsPage.jsx` mobile card renderer and table cell; provided full `DEFAULT_PRODUCT` entity in `ProductFormDialog.jsx` for create mode.
- **Deep Automated Test Harness (Vitest expanded from 45 to 103 tests)**:
  - Added `src/test/flows.test.jsx` (13 tests) driving full real-user workflows (cash sale, utang sale, inline new suki creation, oversell blocked, credit limit with cashier block & owner override, void with reason & stock/utang reversal, payment recording & overpayment rejection, product CRUD & stock adjustments, category delete constraints, customer phone validation & balance delete guards, cashier staff management & owner deactivation block, settings persistence & receipt update, table filters/search/pagination).
  - Added `src/test/dialogs.test.jsx` (19 tests) asserting every modal/dialog in both create and edit mode renders cleanly with zero console errors.
  - Added `src/test/edge-states.test.jsx` (12 tests) verifying empty DB EmptyState rendering, 404 friendly error states, and query Retry triggers.
  - Added `src/test/roles.test.jsx` (14 tests) enforcing owner-only action visibility and 403 Forbidden boundaries for cashiers.
- **Page-by-Page Defensiveness**:
  - Guarded mobile card renderers across `SalesPage.jsx`, `CustomersPage.jsx`, and `UtangPage.jsx` with fallback object references.
  - Guarded `EmptyState` and `ErrorState` components to ensure passed `actionText`, `description`, and `onAction` buttons render properly.
  - Coerced monetary strings and balances to numeric values (`Number(...)`) in `PaymentDialog.jsx`, `RecordPaymentDialog.jsx`, `CustomersPage.jsx`, `CustomerDetailPage.jsx`, `UtangPage.jsx`, and `utangService.js`.
- **Cache Invalidation & Auth State**:
  - Purged cached queries (`queryClient.clear()`) on user sign-out in `AuthContext.jsx` to prevent cross-tenant data leaks.
  - Synchronized query invalidation across reports, categories, and products on mutating transactions.
- **Backend & Contract Alignment**:
  - Added `contact_number` alias in `SettingResource.php` and mapped it in `SettingsController.php` for seamless parity with frontend receipt and settings forms.

## [v1.0.2] - Final Polish (A1–A4)
- **UI Chrome & Navigation**: Removed duplicated `<header>` and `<footer>` from `LandingPage.jsx`; layout chrome is now strictly owned by `PublicLayout.jsx`.
- **Copy Consistency**: Unified public CTA button labels across header and hero to `Magsimula` and `Sign In`, eliminating duplicate side-by-side English/Tagalog parentheticals.
- **Demo Credentials Security**: Gated demo account switcher behind `SHOW_DEMO_ACCOUNTS` (`import.meta.env.DEV`), ensuring deployed production builds never expose demo credentials. Generic placeholders applied across all auth and staff inputs.
- **Layout & Duplication Guard Tests**: Extended Vitest route smoke tests to enforce single `<header>` (`role="banner"`), single primary `<nav>`, exactly 1 `<h1>` (or 0 on `/pos`), and no duplicated CTA buttons in top chrome.
- **Static Defensiveness Sweep**: Guarded all monetary/numeric calculations and aria-labels in `PaymentDialog.jsx` and `MobileCartBar.jsx` with `Number(... || 0)`.

## [v1.0.1] - Runtime Stability & Headless Test Suite
- **Runtime Fixes**: Restored missing imports in `InventoryPage` and guarded `FormInput`/`FormTextarea` against null React Hook Form contexts.
- **Automated Smoke Suite**: Added headless Vitest test suite (`src/test/routes.test.jsx`, `src/test/interactions.test.jsx`, `src/test/auth.test.jsx`) rendering all 33 routes and interaction modals in JSDOM.

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
