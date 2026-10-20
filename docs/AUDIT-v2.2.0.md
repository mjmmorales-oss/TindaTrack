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
| F1 | POS | **Critical** | `features/pos/pages/PosPage.jsx` | `useBarcodeWedge({ onBarcode })` but the hook's option is `onScan` → a USB barcode gun did nothing on the POS page (only inside the scanner sheet). Same in `AdjustStockDialog`. | Use `onScan`; POS wedge disabled while a dialog with its own input is open (prevents double adds). | `pairingScan.test.jsx` "USB wedge adds a real product barcode" |
| F2 | POS / toasts | High | `lib/notify.js` | `notify.info(title, desc, { action })` dropped the 3rd argument → the owner's "Register product" action on unknown barcodes never appeared. | `notify.*` accepts `(title, description, options)`. | covered by the A3 POS tests |
| F3 | Visual Match teaching | High | `ReferencePhotosSection.jsx` | Passed `analyzing` to `AiCapture` (prop is `isAnalyzing`) → no busy state, double saves; auto-capture fired repeatedly. | `isAnalyzing`, `autoCaptureEnabled={false}`. | `visualMatch.test.jsx` |
| F4 | Barcode data | High | `BarcodeLookupController`, mock `barcodeService` | All 58 seeded barcodes have an invalid EAN-13 check digit → lookup answered 422 for products that exist (e.g. scanning a printed label in Add by barcode). | A barcode stored on a product resolves **before** format validation; `classifyScan` treats any digit string as a barcode. (Seed data itself left unchanged the night before the demo — see deferred.) | `BarcodeLookupTest` "stored barcode resolves even when its check digit is invalid" |
