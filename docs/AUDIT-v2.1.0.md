# TindaTrack v2.1.0 Audit & Release Record

## Baseline Metrics (at `main` / `v2.0.1` before v2.1 changes)

- **Backend Pest Suite**: 178 passed (817 assertions) in 10.74s
- **Backend Pint**: Passed (0 style violations)
- **Frontend Vitest Suite**: 288 passed (25 test files) in 63.50s
- **Frontend Linter (`oxlint`)**: 0 errors, 115 warnings (fast refresh & state-in-effect notices)
- **Frontend Build (`npm run build`)**: 0 errors (184 precache entries, 3996.22 KiB)
- **Check Scripts**:
  - `check:bundle`: Clean (103 assets, 0 leaks)
  - `check:i18n`: Clean (19 namespaces, 1851 t-invocations verified)
  - `check-contract.mjs`: Clean (49 API endpoint contracts matched)
  - `check-services.mjs`: Clean (13 service pairs matched)
  - `check-mockdata.mjs`: Clean (₱0.0000 discrepancy)
  - `check:pwa`: Clean (manifest, icons, opaque apple-touch-icon, SW registered)
  - `check:mobile`: Clean (touch targets, no horizontal overflow, 16px inputs)

---

## Task Findings & Fixes Log

### G1: Critical Bugs Found by Code Review
- **G1.1 Undefined Setter in PosPage**:
  - *Problem*: `onBasketScanned` called `setAiBasketData(result)` which is not defined, crashing when scanning from the camera sheet AI Basket tab.
  - *Fix*: Unified all basket review entry points to `openBasketReview(result, imageSrc)` updating `aiScanResult` and `aiScanImageSrc`.
  - *Status*: Pending implementation.
- **G1.2 Lint Coverage for Undefined Identifiers**:
  - *Problem*: `npm run lint` used `oxlint` without `no-undef`, masking undefined identifiers like `setAiBasketData`.
  - *Fix*: Enable `no-undef` in lint check to catch undeclared variables.
  - *Status*: Pending implementation.
- **G1.3 Basket Scan Response Shape Normalization**:
  - *Problem*: Backend `AiService::processBasket` returns `{ items: [{ product_id, product: {...}, box_2d }], unmatched }` while frontend expected `{ items: [{ matched_product_id, matched_product: {...}, bounding_box }], unmatched_items }`.
  - *Fix*: Create `frontend/src/lib/aiContract.js` with `normalizeBasketResult`.
  - *Status*: Pending implementation.
- **G1.4 Product Scan (AI Stock-In) Response Shape Normalization**:
  - *Problem*: Backend `processNewProducts` returns `{ products: [{ name, category_id, estimated_count, barcode_text, box_2d, duplicate_of }] }` while frontend read `suggested_name`, `suggested_category` (by name), `suggested_barcode`, etc.
  - *Fix*: Add `normalizeProductScanResult(raw, categories)` in `aiContract.js`.
  - *Status*: Pending implementation.
- **G1.5 Feedback Payload Alignment**:
  - *Problem*: Backend `AiController@feedback` requires `lines.*.{line_type, action, suggested_*, final_*, confidence}`. Frontend was sending `line_id`, `status`, resulting in 422 errors and empty AI Lab accuracy metrics.
  - *Fix*: Add `buildBasketFeedbackLines` and `buildProductFeedbackLines` in `aiContract.js`.
  - *Status*: Pending implementation.

### G2–G9: Upcoming Tasks
- **G2**: Shared auto-capture engine (`useAutoCapture.js`, `config/ai.js`)
- **G3**: Wire auto-capture into `AiCapture` and AI Basket
- **G4**: AI Stock-In review sheet improvements
- **G5**: Renames (`AI Stock-In`, `Visual Match`) in en + fil
- **G6**: Auto-capture settings & sensitivity
- **G7**: Research capture mode telemetry (`auto|manual|upload`)
- **G8**: Verification test suite
- **G9**: Final docs, checklist, bump to 2.1.0, merge & tag
