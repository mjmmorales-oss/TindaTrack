# TindaTrack v2.2.0 — Demo-Day Fixes & Hardening Audit

Branch: `release/v2.2.0` (from `main` @ `8778827`, v2.1.0).

> Note: **G8.5 (whole-system sweep) from the v2.1 prompt has no commit on `main`.** Phase C of this release replaces it.

## Phase 0 — Baseline (before any change)

| Check | Result |
|---|---|
| `php artisan test` | 179 passed (853 assertions) |
| `./vendor/bin/pint --test` | passed |
| `npm run test` (Vitest) | 290 passed (26 files) |
| `npm run lint` (oxlint) | 0 errors, 111 warnings |
| `npm run build` | OK — 184 precache entries (4039.70 KiB) |
| `check:bundle` | clean (103 assets, 0 leaks) |
| `check:i18n` | passed (117 untranslated *candidate* strings reported, 0 errors) |
| `check:mobile` | passed |
| `check:pwa` | passed |

## Phase A — Confirmed demo blockers ✅ (done and pushed)

| ID | Blocker | Root cause | Fix | Regression test |
|---|---|---|---|---|
| A1 | Every AI camera capture fails ("FormData.append … must be an instance of Blob") | `captureFrame()` returns an `HTMLCanvasElement`; `AiCapture.doCapture` awaited it as if it were a Blob and passed the canvas to `onCapture` → `FormData.append('image', canvas)` throws on real browsers. **Also:** the upload path read `prep.blob` from `prepareForAi`, which returns the Blob itself, so uploads sent `undefined`. | `AiCapture` encodes the frame with `prepareForAi(canvas, {maxDim:1600, maxBytes:4MB})` and asserts `instanceof Blob`; `toImageBlob()` guard (Blob/File/canvas → Blob, else `InvalidImageError`) used by **api and mock** `basketScan`, `productScan`, `runExperimentCase`, `sendAiBasket`, `uploadImage`. Teach/reference flows send vectors (no FormData) and get their input from `AiCapture`, so they are covered upstream. | `src/test/aiCaptureBlob.test.jsx` (real `canvas.toBlob` path, fails on the old code with "expected <canvas> to be an instance of Blob") |
| A2 | Deleted product's barcode can't be reused | `SoftDeletes` + DB `unique` on `barcode`/`sku` + `unique:` rules counting trashed rows, while lookup skipped trashed rows. | Delete = `Product::archive()`: codes move to new `deleted_barcode`/`deleted_sku` (migration also frees codes of already-trashed rows; `sku` nullable). `POST /api/products/{product}/restore` (owner, `withTrashed`). Lookup returns `archived_product`; Add-by-barcode offers **Restore it** / **Add as new**; product form warns. Products list: owner-only **Archived (deleted)** status filter + Restore. Mock DB gets `archivedProducts` (mock previously *deactivated* products with sales instead of deleting — now matches Laravel). Seeder skips demo products the owner archived (would collide on PK every deploy). | `tests/Feature/ProductArchiveTest.php` (7), `src/test/productArchive.test.jsx` (4) |
| A3 | Pairing QR scanned in POS → ugly lookup error | Whole URL sent to `/api/barcode-lookup/{code}`; slashes broke route matching → route 404. | `classifyScan()` / `parsePairingCode()` in `lib/barcode.js`; `BarcodeCapture` and the POS handler classify every scan (pairing → "Pair this phone?" on phones / "scan it with the phone" on desktop; unknown → "Not a product barcode."). Backend route `->where('barcode', '.*')` + clean 422 `{code: not_a_barcode}`. | `src/test/pairingScan.test.jsx` (6), `BarcodeLookupTest` (+2) |
| A4 | Pairing QR points at localhost | QR base = `VITE_PUBLIC_APP_URL` or `window.location.origin` (`https://localhost:5173` on the laptop). **Also:** `dev:lan` never listened on the network interface, so the phone could not reach the dev server at all. | `vite.config.js` exposes the first private IPv4 as `import.meta.env.VITE_DEV_LAN_ORIGIN` (dev server only; empty in build/tests); `server.host` on for `dev:lan`; `lib/pairingUrl.js` priority public → LAN (only on localhost) → origin; warning only if the QR is still localhost. | `src/test/pairingUrl.test.js` (5) |
| A5 | Visual Match slow, never matches | (1) empty index — nothing seeded, UI never said so; (2) cold model load with no progress; (3) WebGPU chosen from `navigator.gpu` alone (broken on iOS); (4) every frame embedded every 700 ms; (5) reference photos stretched to 224×224 but live frames center-cropped → embeddings not comparable. | New `VisualMatchPanel`: "knows **N** products", N=0 empty state + Teach button (owner), camera/loop not started. Model status store with % (`progress_callback`), idle preload on desktop POS, immediate on tab open. `pickVisualDevice` (WebGPU only with a real adapter and not iOS; else wasm q8; one automatic wasm retry). Frame-diff skip + pause when hidden. **Ask AI** after ~3 s (one call per tap, real Blob). "Take 3 photos" teaching burst, index rebuilt after each save. Same center-square framing everywhere. Workbox: model files (huggingface.co / CDN) are cross-origin and not matched by any route, `*.wasm`/`*.onnx` excluded from precache — nothing blocks them; Transformers.js caches them via the Cache API. | `src/test/visualMatch.test.jsx` (6) |

### Extra Critical/High bugs found and fixed while doing Phase A

| ID | Area | Sev | File | Root cause | Fix | Test |
|---|---|---|---|---|---|---|
| F0 | All uploads (AI Basket, AI Stock-In, product photo, AI Lab case) | **Critical** | `services/api/apiClient.js` | The axios instance defaults to `Content-Type: application/json`; `apiClient.post(url, data)` dropped the services' 3rd-arg multipart headers, so axios' `transformRequest` JSON-stringified the FormData — the server received `{"image":{},"capture_mode":"auto"}` (no file). Even with A1 fixed, every real AI scan would have 422'd. jsdom tests mocked `apiClient` and never saw it. | `apiClient` forwards per-request config and always sends FormData as multipart (browser sets the boundary). | `aiCaptureBlob.test.jsx` "A1b" — stub axios adapter sees the body *after* `transformRequest`; fails on the old client with the JSON body above |
| F1 | POS | **Critical** | `features/pos/pages/PosPage.jsx` | `useBarcodeWedge({ onBarcode })` but the hook's option is `onScan` → a USB barcode gun did nothing on the POS page (only inside the scanner sheet). Same in `AdjustStockDialog`. | Use `onScan`; POS wedge disabled while a dialog with its own input is open (prevents double adds). | `pairingScan.test.jsx` "USB wedge adds a real product barcode" |
| F2 | POS / toasts | High | `lib/notify.js` | `notify.info(title, desc, { action })` dropped the 3rd argument → the owner's "Register product" action on unknown barcodes never appeared. | `notify.*` accepts `(title, description, options)`. | covered by the A3 POS tests |
| F3 | Visual Match teaching | High | `ReferencePhotosSection.jsx` | Passed `analyzing` to `AiCapture` (prop is `isAnalyzing`) → no busy state, double saves; auto-capture fired repeatedly. | `isAnalyzing`, `autoCaptureEnabled={false}`. | code fix (no dedicated test) |
| F4 | Barcode data | High | `BarcodeLookupController`, mock `barcodeService` | All 58 seeded barcodes have an invalid EAN-13 check digit → lookup answered 422 for products that exist (e.g. scanning a printed label in Add by barcode). | A barcode stored on a product resolves **before** format validation; `classifyScan` treats any digit string as a barcode. (Seed data itself left unchanged the night before the demo — see deferred.) | `BarcodeLookupTest` "stored barcode resolves even when its check digit is invalid" |

## Phase C — Code-only bug hunt ✅

Method: five read-only audit agents (Auth/Staff/Settings · Products/Categories/Inventory · POS/Sales/Utang/Reports · AI/Pairing/PWA · mock-vs-API contracts) traced every flow button → hook → service → route → controller → DB → resource → UI; every finding below was re-read in the code before fixing. Pattern confirmed again: **two parts disagree and the mock or jsdom hides it** — the services proxy always picks the mock under Vitest (`MODE === 'test'`), so API services never ran in tests until C1.3.

### C1 — Automated cross-checks (new, all green)

| Check | What it does | Result |
|---|---|---|
| `npm run check-routes` (`scripts/check-routes.mjs`) | Parses every `apiClient` / `api` / `deviceAxios` call in `frontend/src` and matches it against `php artisan route:list --json` (method + params); lists backend routes the SPA never calls | Found **C-S1** (staff edit PUT→PATCH). Now: 86 calls, 0 problems, 0 unexpected unused routes |
| Response contracts | Pest `ResponseContractExportTest` writes type skeletons (keys + JSON types) of 25 read endpoints + 2 mutations to `contracts/responses/api/*.json`; Vitest `responseContracts.test.jsx` feeds each skeleton through the **API** service (stubbed `apiClient`, so its unwrapping runs) and compares with the **mock** service output — fails on mock-only keys and type mismatches | Found C-U1, C-U5, C-S6, C-A8, C-X1/X2. Now 27/27 |
| Request contracts | `contracts/payloads/` + `FormContractAuditTest` extended to staff generate/reset, PATCH update, toggle/archive/restore, phone pairing, product restore, image import | 22 passing |
| Real-type traps | `toImageBlob` guard in api **and** mock services; A1/A1b tests take the real `canvas.toBlob` path and the real axios pipeline (stub adapter) | see Phase A |
| Hygiene | `console.log`: 0 · `TODO/FIXME` in shipped code: 0 · remaining `console.error/warn` are in catch blocks / DEV only · jsdom shortcuts remain in `imagePrep`/`imageResize` (tests that matter spoof the UA to bypass them) | ok |

### Findings fixed in Phase C (Critical/High all fixed, each with a regression test)

| ID | Area | Sev | File:line (both sides) | Root cause | Fix | Test |
|---|---|---|---|---|---|---|
| C-A1 | Phone → POS | **Critical** | `PosPage.jsx` scanner effect deps; `lib/realtime.js` `lastId = 0` | A sale refreshes products → new `handleScannedCode` → re-subscribe from event 0 → old phone scans/baskets replayed into the cart | last event id persisted per session; handler kept in a ref | `phaseCRegressions` "never replayed" |
| C-U1 | Utang | **Critical** | `useUtang.js:40` ↔ `UtangPaymentController@store` | Hook read `res.data.payment.amount` (mock shape); Laravel returns the payment resource → TypeError in `onSuccess` → saved payment shown as failed, invites double payment | API service returns `{payment, new_balance}` | `phaseCRegressions`, response contract `utang-payment-create` |
| C-U2 | Reports/Sales | **Critical** | `ReportsPage`/`SalesPage` send UTC ISO ↔ `Carbon::parse` in `ReportController`, `SaleController`, `InventoryController`, `RecordPaymentAction` | Ranges compared UTC instants against Manila wall-clock `created_at` → "Today" = yesterday 16:00–today 15:59 | `App\Support\DateInput` (to Asia/Manila; date-only = whole day) everywhere; custom range end = `endOfDay` | `SalesReportsRegressionTest` "Manila days" |
| C-S1 | Staff | **Critical** | `api/staffService.js:33` ↔ `Route::patch('/users/{user}')` | Edit sent PUT → 405 (mock ignores methods) | PATCH | `check-routes`, `phaseCRegressions`, `FormContractAuditTest` |
| C-S2 | Staff | **Critical** | `StaffPage.jsx:194` ↔ `UserController@store:76` | Generate-password create never sent `generate_password` → password required → 422 on a hidden field | send `generate_password: true` | `FormContractAuditTest` staff-create-generate |
| C-S3 | Staff | **Critical** | `StaffPage.jsx:205,252` ↔ `UserController:119,292` | Read `temp_password`; Laravel sends `temporary_password` (mock used the wrong key) → owner never sees generated/reset passwords; reset revokes tokens → cashier locked out | read `temporary_password`; mock aligned | `phaseCRegressions`, `FormContractAuditTest` |
| C-S4 | Security | **Critical** | `RegisteredUserController@store` | Public `/register` always created an **owner** of the single store | closed once an owner exists (`ALLOW_OWNER_REGISTRATION` escape hatch) | `RegistrationTest` v2.2 |
| C-P1 | Products | **Critical** | `ProductFormDialog.jsx:189` ↔ `schemas.js:34` | Uploaded photo's data URL put in `image_url` (max 2048) → zod fails on a collapsed field → Save silently does nothing (jsdom returns `dataUrl: ''`, hiding it) | photo travels only as `pendingImage`; `onInvalid` always explains | code + `onInvalid` toast |
| C-A2 | AI | High | `lib/api.js:53` (15 s), `api/scannerService.js:12` (10 s) ↔ `config/ai.php` 30 s × fallback | Slow/fallback Gemini calls aborted in the browser while the server finished | `AI_REQUEST_TIMEOUT_MS = 70000` on basket/product/experiment/phone uploads | (config) |
| C-A3 | AI Lab / Staff | High | `api/aiService.js:84,107,117,130`, `api/staffService.js:9` ↔ `apiClient.get(url, params, config)` | `{ params }` wrapped twice → `?params[from]=…`; CSV `responseType` sent as a query param; staff status tabs/search ignored | correct arguments | `phaseCRegressions` |
| C-A4 | AI Lab | High | `BasketReviewSheet.jsx:249` (`'ai'`), `PosPage` adds without method ↔ `AiMetricsService` buckets | Checkout-time chart counted everything as manual | `ai_basket` / `barcode` / `phone` / `visual` | `aiBasket.test` |
| C-A5 | Pairing (dev) | High | `vite.config.js` LAN origin in plain `npm run dev` | QR pointed at the LAN IP while the API stayed on `localhost:8000` | LAN origin only for `dev:lan`; mismatch warning whenever API is localhost | `pairingUrl.test` |
| C-U3 | POS | High | `PaymentDialog.jsx:131` ↔ `CreateSaleAction:134` | Owner override of the credit limit never sent `override_limit` | sent when owner + over limit | `SalesReportsRegressionTest` override |
| C-U4 | POS / Utang | High | `PaymentDialog.jsx:88` ↔ `SaleController:89`, `CreateSaleAction:128` | Paid-now above the total created negative debt (lowered the balance) | 422 on server + mock; inline error; `amount_paid min:0` | `SalesReportsRegressionTest` down payment |
| C-U5 | Sales | High | `SalesPage.jsx:155` ↔ `SaleController@index` | Summary strip read `summary` only the mock returned → ₱0 | filtered `summary` from the API | response contract + `SalesReportsRegressionTest` |
| C-U6 | Customers | High | `CustomersPage.jsx:117,123` ↔ `CustomerController@index` | `with_balance` / `over_limit` filters didn't exist on the API | added (+ `last_activity`) | `SalesReportsRegressionTest` filters |
| C-S5 | Staff | High | see C-A3 | Staff tabs/search never reached Laravel | flat params | `phaseCRegressions` |
| C-S6 | Settings | High | `SettingsPage.jsx:66` ↔ `SettingsController` `unset()` | `owner_name`, `show_cashier_name`, `low_stock_threshold_percent` validated then discarded | migration + fillable + resource | `SettingsTest` v2.2 |
| C-P2 | Products/Inventory | High | `ProductsPage.jsx:79`, `InventoryPage.jsx:103` ↔ `ProductController@index` | `stock=in|low|out` ignored (API only knew `stock_status`) → "Running Low" listed everything | `stock` filter alias | `ProductsRegressionTest` |
| C-P3 | AI Stock-In | High | `AiProductReviewTable.jsx:349,357` ↔ `api/aiService.bulkCreateProducts`, `ProductImageController:53` | Created list read from an already-unwrapped array → `[]`; `source=ai_crop` rejected → crops never uploaded | unwrap both shapes; accept `ai_crop` | `ProductsRegressionTest` |
| C-P4 | Inventory | High | `AdjustStockDialog.jsx:69,77` ↔ `ListQuery` per_page ≤ 100 | Scan "not found" for products past the first 100 | server barcode lookup fallback | code |
| C-P5 | Products | High | `ProductFormDialog.jsx:426`, `AddByBarcodeDialog.jsx:279` | Failed photo upload after create left the dialog in create mode → Save again = duplicate | product saved; photo failure reported separately | code |
| C-P6 | Products | High | `AiProductReviewTable.jsx:30` vs `schemas.js:41` vs Quick Add vs API (any string) | AI could save `box`; the form then refused to edit it | one `PRODUCT_UNITS` list + `Rule::in(ProductUnits::ALL)` | `ProductsRegressionTest`, `phaseCRegressions` |
| C-X1 | AI Lab | High | `AiExperimentsTab.jsx:36,50` ↔ `api/aiService.getExperiments` | Double unwrap → experiment list always empty | keep `{data}` envelope | `phaseCRegressions` |
| C-X2 | Errors | High | `apiClient.handleRequest`, `ApiError` | Raw framework text ("The route … could not be found", "Server Error") reached toasts; `ApiError` dropped `reason`/`code` (phone pairing reasons never shown in API mode) | `friendlyError()` in `lib/notify.js` applied where errors are created; payload fields kept | `phaseCRegressions` C3 |
| C-A6 | AI | Medium | `GeminiVisionProvider:212` | Gemini's own 401/403 and raw body passed to the SPA (logout / "Access Denied") | always 502 + clean message; upstream status kept for `ai:ping` | `AiPingCommandTest` |
| C-A8/9/10/11 | AI / Pairing | Medium | `AiSettingsCard:192`; `BasketReviewSheet:190`; `ScannerSessionController@show`; `AiService:259`; Workbox matchers | usage always 0; matched unknowns logged as removed; POS never told about expiry; image URL had no route; runtime-cache RegExps never matched | `daily_scans_today`; keep id; `expired`/`ended_at`; `/api/product-images/{id}`; `url.pathname` matchers | response contract / code |
| C-U7…U11 | Sales | Medium | `ReportController:63`, `VoidSaleAction:48`, `CreateSaleAction:49`, `DashboardController:195` | weekly = daily on MySQL; void skipped archived products' stock; duplicate lines could oversell; cashier received store-wide KPIs | ISO week; `withTrashed`; per-product running total; redacted | `SalesReportsRegressionTest` |
| C-S7…S13 | Auth/Staff/Settings | Medium | see commit `fix(v2.2): C staff, auth…` | Settings 422 toast-only; empty reorder → 500; archived email → 500; logout 401 toast; PWA install missed the event; owner Edit always refused; reset didn't clear `must_change_password` | inline errors; rules; ordering; boot-time capture; hidden; flag cleared | `SettingsTest`, `pwa.test` |
| C-P7…P9 | Products | Medium | `||` defaults; `CategoryController@destroy`; `allowedSorts` | reorder 0 → 10; archived products → FK 500; sort headers ignored | `??`; 422; more sorts | `ProductsRegressionTest` |
| C-M1 | Money display | Medium | POS payment, receipt, sale detail, utang, customers, AI Lab | `₱` + `toFixed(2)` without thousands separators | `formatCurrency` | code |

### C2 — Flow status after fixes

| Area | Status |
|---|---|
| Auth | owner/cashier login ✓ · logout clears cart, scanner session (ended server-side first), query + visual caches ✓ · forced password change: banner only (deferred D-6) · forgot/reset ✓ · expired token → login ✓ · inactive staff blocked ✓ |
| Products | manual add (incl. photo) ✓ · Quick Add ✓ · Add by barcode: local / OFF / not found / **archived** ✓ · homemade ✓ · edit ✓ · delete/archive/restore ✓ · image upload / import ✓ · reference photos (Take 3) ✓ · AI Stock-In incl. crops ✓ · SKU auto ✓ · category required ✓ |
| Categories | create/edit ✓ · delete with products blocked with a clear message (incl. archived) ✓ |
| Inventory | adjust (all types) ✓ · bulk restock ✓ (not atomic, D-4) · printable list ✓ · low stock = `reorder_level` ✓ · no negative stock ✓ |
| POS | tap/search ✓ · **USB wedge ✓ (was dead)** · camera barcode ✓ · Visual Match ✓ · AI Basket ×3 entry points ✓ · quantity/stock clamps ✓ · cash + change ✓ · utang (customer required, override, down payment) ✓ · receipt ✓ · void restores stock + utang ✓ · Pay double-submit protected ✓ |
| Customers / Utang | create ✓ · balance after sale/payment ✓ · overpayment blocked ✓ · ledger ✓ · filters ✓ |
| Reports / Dashboard | totals = DB sums, voided excluded ✓ · Manila date ranges ✓ · weekly ✓ · cashier sees own shift only ✓ |
| Staff | create (manual/generated) ✓ · edit ✓ · reset ✓ · archive/restore ✓ · cashier blocked UI + 403 ✓ |
| Settings | store info ✓ · AI + auto-capture ✓ · language persists ✓ · PWA install ✓ |
| Phone pairing | create ✓ · LAN QR ✓ · in-app QR pairing ✓ · scan → POS ✓ (no replays) · AI basket → POS review ✓ · expiry ✓ · end ✓ · device token on every scanner endpoint ✓ |
| AI | ping ✓ · basket ✓ · stock-in ✓ · feedback 2xx ✓ · AI Lab metrics/CSV with filters ✓ · 429/daily-limit messages ✓ · fallback model ✓ · mock mode ✓ · consent ✓ |
| PWA | manifest + icons + `/scan` shortcut ✓ · SW never caches `/api/**` (product images CacheFirst) ✓ · update prompt ✓ |

## Phase B — Phone & scanner UX ✅

| Item | Done |
|---|---|
| B1 labels | Scanner tabs show "Barcode: scan a barcode or QR" / "Visual Match: point at a taught product" / "AI Basket: photo of the whole basket"; Products shows **Add by barcode** ("One product by barcode or QR") and **AI Stock-In** ("Up to 5 new products in one photo") side by side |
| B2 desktop-only | "Use phone as scanner" (renamed, hint "Scan with your phone, items appear here") only with `(pointer: fine)` and ≥1024 px (`useIsDesktop`), on POS and Inventory |
| B3 pair in-app | `/scan`: big **Scan pairing QR** (in-app `BarcodeCapture`, QR enabled) pairs at once; manual code below. **Use this phone as a scanner** on the login page and the mobile More menu. POS camera on a phone also offers pairing (A3). PWA shortcut "Phone scanner → /scan" (asserted by `check-pwa`) |
| B4 dialog | Bigger QR (220 px), code, live "Waiting for phone…" → "Phone connected ✓", localhost/API warnings, LAN-address hint |
| B5 phone states | Not paired → Pairing… → Connected ✓ (store name) → Session ended; Barcode \| AI Basket tabs (device-token upload) + 44 px quantity stepper. **Fixed:** phone AI Basket events now carry the result and `type: 'ai_basket'` (API mode never opened the POS review sheet). Visual Match is not offered on the phone (needs the store catalog → D-2) |
| B6 mobile POS | One row: **Scan** · **AI Basket** (+ view toggle); duplicate "Clear" removed. No floating avatar bubble exists in the POS code; the grid keeps `pb-24` above the mobile cart bar |
| Tests | `phoneScannerUx.test.jsx` (desktop-only visibility, phone layout, `/scan` QR → `pair` with the classified code), `check-pwa` shortcut |

Also fixed in Phase B: cashiers could not read `/api/settings` (403 toasts on POS, no receipt header) → read access for every role, PUT stays owner-only; shared components skip authenticated queries when there is no session (phone page "Session Expired" toasts).

## Phase D — Production hardening ✅

| Item | Status |
|---|---|
| Middleware | auth + `active` on all private routes; role checks on owner routes; throttles on login/register/forgot/**reset-password** (added), AI scans, feedback, lookup, phone pair/scans/ai-basket |
| Mass assignment | every model uses `$fillable`; new `deleted_barcode/deleted_sku` are server-managed (`forceFill`) |
| Money | decimals in DB, totals recomputed on the server (`CreateSaleAction`); float casts in resources |
| Transactions + locks | sale, void, restock/adjust, utang payment all `DB::transaction` + `lockForUpdate` |
| `APP_DEBUG=false` | `shouldRenderJsonWhen(api/*)` + `ForceJsonResponse`: JSON errors only, no traces; route error boundary hides raw text outside DEV |
| CORS | `CORS_ALLOWED_ORIGINS` **plus** `FRONTEND_URL`, trailing slashes trimmed; bearer tokens, no credentials |
| Upload limits | AI photo cap in the SPA **1.4 MB** < `AI_MAX_IMAGE_KB` (default now 5120) < Railway PHP 10 MB/12 MB; also below a stock local PHP `upload_max_filesize=2M` (the demo laptop's value). Product photos ≤ 300 KB (resize) < 1 MB rule |
| Indexes | `products.deleted_at`, `products.deleted_barcode`, `stock_movements.created_at`, `sales(status, created_at)` (barcode/sku unique, sales created_at composite already existed) |
| Frontend | no secrets in `VITE_*` (`check:bundle`), `VITE_API_URL` with/without trailing slash, 401 → session cleared + login, no CSRF/419 with bearer tokens, **mock-build detection** in `check-prod-bundle`, route error boundary with Reload |
| Performance | all routes lazy; Transformers.js only inside the worker (`vendor-transformers` chunk); thumbnails `loading="lazy"` + `decoding="async"` in fixed-size boxes. Precache 4039.70 KiB → 4071.78 KiB (184 entries; +32 KiB for the new UI/i18n) |
| Deploy | `railway.toml` (migrate → seed → caches), `nixpacks.toml` PHP 8.4 + limits, `vercel.json` SPA rewrites exclude `sw.js`/manifest/assets/icons; `DEPLOY.md` lists every app env var (added `ALLOW_OWNER_REGISTRATION`, `DEMO_*`, `OFF_TIMEOUT`, `VITE_APP_NAME`, `VITE_SHOW_DEMO_ACCOUNTS`, `VITE_MOCK_LATENCY`, dev-only `VITE_DEV_*`) |
| `php artisan tindatrack:check --production` | warns: missing `APP_KEY`, `APP_DEBUG=true`, bad/trailing-slash/localhost/non-CORS `FRONTEND_URL`, Gemini without key, missing storage link, low PHP/AI upload limits (tested) |

## Phase E — Final results

| Check | Baseline (v2.1.0) | v2.2.0 |
|---|---|---|
| `php artisan test` | 179 passed (853 assertions) | **211 passed (1021 assertions)** |
| `pint --test` | passed | passed |
| `npm run test` | 290 passed (26 files) | **354 passed (34 files)** |
| `npm run lint` | 0 errors, 111 warnings | **0 errors, 105 warnings** |
| `npm run build` | 184 entries, 4039.70 KiB | 184 entries, 4071.78 KiB |
| `check:bundle` · `check:i18n` · `check:mobile` · `check:pwa` | pass | pass (bundle now also rejects mock builds; pwa now asserts the `/scan` shortcut and precache entries) |
| `check-routes` (new) | — | pass (86 calls) |
| `check-services` · `check-contract` | pass | pass |
| `smoke:ai` · `smoke:prod` · `smoke:pairing` · `smoke:pwa` | — | **all pass** (run against a throwaway SQLite DB + `AI_PROVIDER=mock` on ports 8765/4174; the user's own server on :8000 was not touched; temp servers stopped afterwards) |

## Deferred (Medium/Low, with reason)

| ID | Sev | Item | Why deferred |
|---|---|---|---|
| D-1 | Medium | All 58 seeded barcodes have a wrong EAN-13 check digit. Camera/USB scans and the lookup work (F4), but **typing** a seeded barcode is blocked by the deliberate check-digit guard | Regenerating them the night before rewrites fixtures and the deployed DB's barcodes (labels may be printed). Do it after the demo |
| D-2 | Medium | Visual Match on the paired phone | Needs a device-token endpoint for the catalog + embeddings |
| D-3 | Medium | AI Stock-In bulk-save errors for barcode/SKU/stock aren't rendered per row (toast only) | UI work > 30 lines |
| D-4 | Low | Bulk restock is one request per item (not atomic) | `AdjustStockAction::bulkRestock` exists but has no route; low risk |
| D-5 | Low | Some flows toast an error from the hook *and* show it in the dialog | cosmetic |
| D-6 | Low | `must_change_password` is a banner, not enforced by middleware | product decision |
| D-7 | Low | Dashboard `low_stock_count` excludes out-of-stock (mock includes it); mock default credit limit 1000 vs API 500 | cosmetic difference in mock mode only |
| D-8 | Low | AI Lab visual top-1/top-3 accuracy are hard-coded in `AiMetricsService` | needs real labelled data |
| D-9 | Low | Dead code: `useAdjustStock`, `adjustStockSchema`, `useImportProductImage`; `CategoryResource` reads `product_count` while `withCount` gives `products_count` (extra query per row) | cleanup |
| D-10 | Low | 105 lint warnings (React Compiler advisories, exhaustive-deps); 117 heuristic "untranslated candidate" strings in older screens | no errors; all new text is translated |
| D-11 | Low | `routes.test.jsx › renders /sales for owner` can time out under full-suite load | passes alone and on rerun |
| D-12 | Low | A user deactivated mid-session sees a 403 toast until their next 401 | unverified edge |

---

## Demo script for tomorrow

Log in on the laptop as the **owner** (local seed: `owner@tindatrack.test`; password from `DEMO_OWNER_PASSWORD`/`DEMO_PASSWORD` in `backend/.env`, `password` by default).

1. **Barcode sale** — POS → **Scan** → keep the Barcode tab, scan a product (USB gun works anywhere on the POS page, or the camera). Tip: the night before, register 3–4 *real* products via Products → **Add by barcode** (scan the real barcode → Open Food Facts prefills → set price → Save) and sell those. → **Pay** → Cash → enter tendered amount → change is shown → Confirm → receipt.
2. **AI Basket sale (3–4 items)** — POS → **AI Basket** → accept the AI consent once → put 3–4 store products in frame → Capture (or let auto-capture fire) → review sheet: check quantities, fix any item → **Add to cart** → Pay.
3. **AI Stock-In (3 new items)** — Products → **AI Stock-In** → photo of 3 new products → review table: set category + price per row (required) → **Save all** → products appear with their cropped photos.
4. **Visual Match (teach 3–5 products the night before)** — Products → open a product → *Reference photos* → **Take 3 photos** (turn it a little between shots). Repeat for 3–5 products. Demo: POS → **Scan** → **Visual Match** tab → it shows "Visual Match knows N products" → hold a taught product in the square → tap the match. If it hesitates for ~3 s, tap **Ask AI**.
5. **Pair a phone by in-app QR** — Laptop: POS → **Use phone as scanner** (QR + code, "Waiting for phone…"). Phone: open the Network URL → login page → **Use this phone as a scanner** (or the installed PWA's "Phone scanner" shortcut) → **Scan pairing QR** → point at the laptop QR → "Connected ✓". Scan products on the phone → they appear in the laptop cart. Phone **AI Basket** tab → photo → the laptop opens the review sheet.
6. **Utang sale and payment** — POS → add items → Pay → **Utang** tab → pick (or add) a customer → optional paid-now (must be ≤ total) → Confirm. Then **Utang** page → customer → **Record payment** → balance drops (overpaying is blocked).
7. **Void** — Sales → open the sale → **Void** → reason (≥ 5 characters) → confirm → stock and utang are restored.
8. **AI Lab metrics** — sidebar **AI Lab** → Metrics: scans, acceptance, latency, capture mode (auto/manual/upload), checkout time by add method → **Export CSV**.

### Backup plan (Wi-Fi or Gemini fails)

- In `backend/.env` set `AI_PROVIDER=mock`, then run `php artisan config:clear` in `backend/`. Every AI flow keeps working with the deterministic mock (a "Demo AI" badge shows in the camera). Barcode, Visual Match (on-device), POS, utang, void and reports don't need the internet.
- No Wi-Fi for the phone: skip pairing and use the laptop camera / USB gun, or use a phone hotspot (laptop and phone on the same hotspot, then `npm run dev:lan`).
- Visual Match model never downloaded: it needs the internet the first time (then it's cached). Open the Visual Match tab once the night before on each device.

## Morning checklist

1. `git pull` (on `main`, tag `v2.2.0`)
2. `cd backend && composer install && php artisan migrate` (adds `deleted_barcode/sku`, settings profile fields, indexes)
3. `cd ../frontend && npm install`
4. Start **DBngin** (MySQL)
5. From the repo root: `npm run dev:lan` (API + HTTPS dev server listening on Wi-Fi)
6. On the laptop open the **Network** URL Vite prints (`https://192.168.x.x:5173`, accept the self-signed certificate) — not localhost
7. Pair the phone by in-app QR (POS → Use phone as scanner → phone: Use this phone as a scanner → Scan pairing QR); accept the certificate on the phone too
8. Teach 3–5 Visual Match products (Products → product → Reference photos → Take 3 photos)
9. `cd backend && php artisan ai:ping` (expect "Connected"; if not, switch to `AI_PROVIDER=mock` — see Backup plan)
10. Optional: `php artisan tindatrack:check` (data integrity) — `--production` is for the Railway deploy
