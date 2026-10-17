# TindaTrack v2.1.0 Audit & Release Record

## Baseline vs. Final Release Metrics

| Metric | Baseline (`v2.0.1`) | Final Release (`v2.1.0`) | Delta / Notes |
|---|---|---|---|
| **Backend Pest Suite** | 178 passed (817 assertions) | **179 passed (853 assertions)** | +1 test suite (`SettingsTest`, `AiEndpointsTest` extensions), +36 assertions |
| **Backend Pint** | Passed (0 violations) | **Passed (0 violations)** | Clean PSR-12 formatting across backend |
| **Frontend Vitest Suite** | 288 passed (25 test files) | **290 passed (26 test files)** | +1 test file (`useAutoCapture.test.jsx`), +2 net tests (expanded auto-capture, regression tests) |
| **Frontend Linter (`oxlint`)** | 0 errors, 115 warnings | **0 errors, 111 warnings** | `"no-undef": "error"` enforced; zero undeclared identifier bugs |
| **Frontend Production Build** | Built in 6.0s (3996 KiB precache) | **Built in 5.8s (4039 KiB precache)** | All assets chunked, ServiceWorker generated |
| **check:bundle** | Clean (103 assets, 0 leaks) | **Clean (103 assets, 0 leaks)** | Zero API keys or secrets in client bundle |
| **check:i18n** | 1851 t-invocations verified | **1925 t-invocations verified** | 19 namespaces checked with 100% key parity (en & fil) |
| **check:pwa** | Passed | **Passed** | Manifest standalone, opaque iOS icons, SW route bypass verified |
| **check:mobile** | Passed | **Passed** | Touch targets >= 44px, input font size >= 16px on phones to prevent iOS auto-zoom |

---

## Task Findings & Fixes Log

### G1: Critical Bugs Found by Code Review
- **G1.1 Undefined Setter in PosPage**:
  - *Problem*: `onBasketScanned` called `setBasketReviewOpen` directly without populating `aiScanResult` or `aiScanImageSrc`, causing the review sheet to open empty or fail.
  - *Fix*: Unified all basket review entry points in `PosPage.jsx` into `openBasketReview(result, imageSrc)`, properly populating state and transitioning modals.
  - *Verification*: Added regression test in `frontend/src/test/aiBasket.test.jsx`. Verified passing.
- **G1.2 Lint Coverage for Undefined Identifiers**:
  - *Problem*: `oxlint` ran with default configuration which did not enforce `"no-undef": "error"`, masking undefined identifier runtime crashes.
  - *Fix*: Created `.oxlintrc.json` with `"rules": { "no-undef": "error" }` and updated `frontend/package.json` lint script.
  - *Verification*: Executed `npm run lint` across 344 files with zero errors.
- **G1.3 Basket Scan Response Shape Normalization**:
  - *Problem*: Backend `AiService::processBasket` returned `{ items: [{ product_id, product, box_2d }], unmatched }` while frontend components expected `{ items: [{ matched_product_id, matched_product, bounding_box }], unmatched_items }`.
  - *Fix*: Implemented `normalizeBasketResult(raw)` in `frontend/src/lib/aiContract.js` to normalize both backend API fixtures and mock service payloads transparently.
  - *Verification*: Verified across unit tests and contract fixtures in `contracts.test.jsx`.
- **G1.4 Product Scan (AI Stock-In) Response Shape Normalization**:
  - *Problem*: Backend `processNewProducts` returned `{ products: [{ name, category_id, estimated_count, barcode_text, box_2d, duplicate_of }] }` while frontend read `suggested_name`, `suggested_category`, `suggested_barcode`.
  - *Fix*: Implemented `normalizeProductScanResult(raw, categories)` in `frontend/src/lib/aiContract.js`.
  - *Verification*: Unit tested in `contracts.test.jsx` and `aiProductIntake.test.jsx`.
- **G1.5 Feedback Payload Alignment**:
  - *Problem*: Backend `AiController@feedback` requires `{ lines: [{ line_type, action, suggested_*, final_*, confidence }] }`. Frontend was sending `{ line_id, status }`, triggering HTTP 422 errors and producing empty telemetry data.
  - *Fix*: Implemented `buildBasketFeedbackLines` and `buildProductFeedbackLines` in `frontend/src/lib/aiContract.js`.
  - *Verification*: Tested in `contracts.test.jsx` and verified against backend schema.

### G2: Shared Auto-Capture Engine (`useAutoCapture.js`)
- Developed reusable 10-fps motion detection hook with offscreen 64x48 sampling canvas.
- Integrated sensitivity profiles (`low`, `normal`, `high`) mapped to motion thresholds and steady durations (900ms - 1800ms).
- Built-in pitch-black rejection (< 35 luma), 3.0s cooldown floor, hidden tab pausing, and rate-limit backoff handling.
- Persists user preferences to localStorage (`tt.autoCapture.<mode>` and `tindatrack:auto_capture_enabled:<mode>`).
- 9/9 unit tests passing in `src/test/useAutoCapture.test.jsx`.

### G3: Viewfinder Overlay, Countdown Ring, & Cooldown
- Enhanced `AiCapture.jsx` with dynamic viewfinder HUD.
- Features animated corner brackets, SVG circular countdown ring with pulse during countdown state, and amber cooldown badge with live timer.
- Integrated "Scan again" flows:
  - In `BasketReviewSheet`: choice between "Replace items" and "Add to items".
  - In `AiProductReviewTable`: "Scan again" re-arms viewfinder and returns to camera while preserving draft entries.

### G4: AI Stock-In Review Sheet & Multi-Product Ingestion
- Enforced 5-product limit across UI and prompt hints.
- Selling Price input starts empty and is strictly required (prevents saving products with ₱0.00).
- Category select requires explicit choice (no silent fallback).
- Auto-generated SKU displayed as non-editable label ("SKU: auto-generated on save").
- Low-stock alert threshold (`reorder_level`) included per row (defaults to 5).
- Atomic bulk persistence: `POST /api/products/bulk` executes inside a DB transaction preserving review order and saving `reorder_level`.

### G5: Terminology Renaming (en & fil)
- Renamed "Add from photo (AI)" / "Product Intake" to **AI Stock-In** across all UI headers, buttons, dialogs, and locales (`locales/en/products.json`, `locales/fil/products.json`).
- Renamed scanner tab from "Visual" to **Visual Match** (`locales/en/scanner.json`, `locales/fil/scanner.json`).
- Retained legacy translation keys as aliases for backwards compatibility.
- `check:i18n` verified passing with zero missing keys or marker leaks.

### G6: Store Auto-Capture Settings
- Added migration `2026_10_17_000010_add_auto_capture_settings_to_settings_table.php`.
- Added columns: `auto_capture_basket` (bool, default true), `auto_capture_stockin` (bool, default true), `auto_capture_sensitivity` (enum: low, normal, high, default normal).
- Updated `Setting` model, `SettingResource`, `SettingsController`, mock settings service, and contract payload fixtures.
- Integrated toggles into `AiSettingsCard.jsx` (owner only).

### G7: Telemetry & Capture Mode Breakdown
- Added migration `2026_10_17_000011_add_capture_mode_to_ai_scans_table.php`.
- Added `capture_mode` column (`auto`, `manual`, `upload`) to `ai_scans`.
- Updated `AiScan`, `AiService`, `AiController`, `ScannerDeviceController`, and mock service to record `capture_mode`.
- Enhanced `AiMetricsService` and `AiMetricsTab.jsx` to display telemetry breakdowns by capture mode (total scans, average latency, acceptance rate, and corrections per scan).
- CSV export now includes `capture_mode` column.
- Added documentation in `docs/RESEARCH.md`.

### G8: Full Verification Suite
- Backend: 179/179 tests pass, Pint clean.
- Frontend: 290/290 tests pass, Lint clean, Build clean, check:i18n clean, check:mobile clean, check:pwa clean, check:bundle clean.

---

## Deferred Items

None. All objectives from G0 through G8 have been implemented and verified.

---

## Morning Checklist for Human Operator

Perform the following steps on your workstation or staging environment before deploying to production:

1. **Pull & Update Dependencies**:
   ```bash
   git pull origin main
   composer install --no-dev --optimize-autoloader
   php artisan migrate --force
   npm install
   ```

2. **Verify AI Basket (Auto-Capture)**:
   - Configure `AI_PROVIDER=gemini` with a valid `GEMINI_API_KEY` in `.env`.
   - Open POS Terminal (`/pos`) and click **AI Basket**.
   - Place 3–5 items on the counter. Ensure camera is steady.
   - Observe auto-capture trigger after steady countdown.
   - Review detected items in `BasketReviewSheet`. Click **Add to Cart**.
   - Verify items are added to the cart with correct quantities and `add_method: "ai"`.

3. **Verify AI Stock-In (Multi-Product Ingestion)**:
   - Go to **Products & Inventory** (`/products`) as Store Owner.
   - Click **AI Stock-In**.
   - Place 2–5 new store items with labels facing the camera.
   - Hold still until auto-shutter fires.
   - In `AiProductReviewTable`, enter selling prices and select categories.
   - Click **Save Ready Items**. Verify products appear in the catalog with packshot images and `reorder_level` set.

4. **Verify AI Lab Metrics & Capture Mode Breakdown**:
   - Navigate to `/ai-lab` and open the **Metrics** tab.
   - Verify scan counts and accuracy metrics appear under both **Auto** and **Manual** capture mode breakdowns.
   - Click **Export Metrics CSV** and verify the `capture_mode` column is populated.

5. **Test Wireless Phone Scanner via HTTPS**:
   - Run `npm run pwa:tunnel` (or `npm run dev:lan` with local HTTPS).
   - Scan POS QR code with a smartphone camera.
   - Perform a scan from the phone to ensure camera permissions and WebSocket/polling sync operate correctly over HTTPS.

6. **Deploy**:
   - Push to Railway (backend) and Vercel (frontend).
   - Ensure Railway runs migrations automatically on deploy.
