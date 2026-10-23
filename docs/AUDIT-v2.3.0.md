# TindaTrack v2.3.0 — AI Basket Speed, Auto-Capture, Review That Never Vanishes

Branch `release/v2.3.0` from `main` @ v2.2.0. Code-only verification (Pest, Vitest, lint, build, `check-*`, `smoke:*`); no browser automation.

## S1 — AI Basket took 20–30 s

| Root cause | Fix |
|---|---|
| Gemini "thinking" on by default (`generation_config` had only mime type, schema, temperature) | `thinking_config`: 3.x models → `thinking_level` (`GEMINI_THINKING_LEVEL`, default `minimal`), 2.x → `thinking_budget` (minimal = 0), chosen by model-name prefix (`GeminiVisionProvider::thinkingConfigFor`). A 400 that names the field → one retry without it, remembered for the process. Same for the fallback model |
| More image tokens than needed | `generation_config.media_resolution` (`GEMINI_MEDIA_RESOLUTION`, default `MEDIA_RESOLUTION_MEDIUM`, dropped the same way if rejected); SPA photos now **1024 px, JPEG 0.8, ≤ 600 KB** via one constant `AI_IMAGE_OPTIONS` (`src/config/ai.js`) used by AiCapture (basket, stock-in, phone), Visual Match "Ask AI" and AI Lab cases |
| Unbounded output | `max_output_tokens` (`AI_MAX_OUTPUT_TOKENS`, 2048); temperature stays 0.1 |
| Slow failover: 30 s timeout, fallback only after it | `AI_PRIMARY_TIMEOUT` 12 s → fallback `AI_FALLBACK_TIMEOUT` 15 s; fall back on timeout, 5xx, 429, 400/403/404 → worst case ≈ 27 s (was 60 s). `AI_TIMEOUT` now only for `ai:ping`. Browser timeout 45 s |
| Heavy prompt | `basket-v2`: `id\|name\|unit` per product, category only when two products share a name; above `AI_CATALOG_FOCUS_THRESHOLD` (150) active products only those with a photo or a sale in 30 days (cap 400). `catalog_size` recorded as before |
| `php artisan serve` single-threaded locally — the phone's polling and every request queued behind a scan | `npm run dev` / `dev:lan` start the API with `PHP_CLI_SERVER_WORKERS=4` (`cross-env`, added at the root); `.env.example` + `docs/MOBILE.md` |
| No visibility | `ai_scans.upload_ms / gemini_ms / postprocess_ms / model_used` (migration). The browser measures upload (axios `onUploadProgress`) and reports it with the feedback call (it can't know it before its own request finishes); scan endpoints also accept `upload_ms`. Review shows **"Analyzed in X.X s"**; AI Lab **"Where the time goes"** (overall, basket-v1 vs v2, primary vs fallback) |
| Waiting felt broken | Analyzing overlay: live **Uploading → AI reading the basket → Matching your products** (real signals: upload complete, response received) + elapsed seconds, over the photo that was sent |

**Target (not verified here):** a typical basket scan **under ~6 s** on Wi-Fi with the default model. Only a human on real hardware and a real Gemini key can confirm it — note the "Analyzed in" values in the check below.

## S2 — Auto-capture never fired

| Root cause | Fix |
|---|---|
| "Moving" = > 4.5 % of 64×48 pixels changing by > 20/255 — hand shake, autofocus and auto-exposure exceed that constantly | `lib/motion.js`: 3×3 box blur, subtract each frame's mean (exposure), mean absolute difference scored 0–100. Moving > **6**, steady **800 ms**, **1 s** filling ring (no numbers); low / medium / high profiles |
| Same-scene guard compared with the last photo forever (< 8 %) | Only for **3 s** after a capture and only for a near-identical scene (< 3); review closed / Scan again / phone basket done clear the reference |
| 3 aborted countdowns → manual only | Hint "Hold the phone still or rest it on the counter", keeps trying |
| Loop stopped after a capture and only restarted on dependency changes | Pure state machine re-arms when processing ends (success or error), on `rearmKey` (empty result after 2 s, review closed, phone basket done), paused while the phone waits |
| `setState` on every sampled frame (10 renders/s on phones) | state published only when the shown state changes |

Overlay: Looking → Hold still → (ring) → Capturing → Analyzing; the Auto-Capture chip toggles it. Also fixed: AI Stock-In passed `featureKey` (ignored) instead of `aiMode`, so it shared the basket's auto-capture preference.

## S3 — The review vanished before Add to Cart

| Root cause | Fix |
|---|---|
| The phone kept auto-capturing after sending; each `ai_basket` event **replaced** the open review (`openBasketReview` in `PosPage`) | Phone pauses after a send ("Sent to POS ✓. Waiting for cashier"); `scanner_sessions.basket_pending_at` set by the phone's basket, cleared by `POST /api/scanner-sessions/{id}/basket-done` when the POS adds, discards or scans again; the heartbeat (every 2 s while waiting) reports `basket_pending`; **Scan next basket** re-arms manually. Empty results create no POS event ("Nothing detected") |
| POS replaced the open review | `usePendingBasket`: an incoming basket while a review is pending shows **Replace · Add to this list · Ignore** (Add merges by product, summing quantities) |
| Radix/vaul closed the sheet on outside click, focus change or swipe | `ResponsiveDialog dismissible={false}` (wrapper props, `components/ui` untouched): outside pointer/focus and swipe ignored; **Esc / X / Cancel** ask "Discard this scan?" when there are items. Same for the AI Stock-In review |
| Result + edits lived only in the sheet | Pending review (result, edits, photo) in POS state **and** `sessionStorage` (`tt.pos.pendingBasket`); **Resume scan (N items)** chip next to AI Basket; cleared on Add to Cart / Discard |

## S4 — Missing images

| Root cause | Fix |
|---|---|
| Review rows passed `src=` to `ProductThumb`, whose prop is `imageUrl` → always initials | `imageUrl`; picker rows and AI Stock-In duplicates (backend `duplicate_of.image_url` added) show images |
| Phone baskets had no photo (`imageSrc = null`) | Phone sends a preview (480 px, JPEG 0.6, ≤ 60 KB) as `preview_data_url`; backend accepts ≤ 100 KB (data URL, JPEG/PNG/WebP) and otherwise drops the preview, not the event; POS uses it for the photo + boxes |
| Empty "No image preview available" box | No photo → the pane collapses and the list uses the full width |
| Blank/live camera while analyzing | The sent photo is shown dimmed behind the analyzing overlay |

## S5 — Regression sweep (code)

- AI Basket — toolbar, Scan → AI Basket tab, paired phone — all end in `usePendingBasket.receive`; empty results stay on the camera; Add to Cart / Discard / Scan again → `finish()` → `basket-done` for phone baskets. ✓
- AI Stock-In with 1024 px photos: crops via `cropBox` still work; empty result re-arms. ✓
- Barcode, USB wedge (off while the review is open), Visual Match unchanged. ✓
- Mock mode: mock AI/scanner services return the same shapes (timings, `empty`, `basket_pending`, `basketDone`); response contracts 25/25. ✓
- 429 / daily-limit messages (`friendlyError`) and the consent dialog unchanged. ✓
- No new Critical/High issues found.

## New config keys (`config/ai.php`, `.env.example`, `docs/DEPLOY.md`)

| Key | Default | |
|---|---|---|
| `GEMINI_THINKING_LEVEL` | `minimal` | `minimal\|low\|medium\|high\|none` |
| `GEMINI_MEDIA_RESOLUTION` | `MEDIA_RESOLUTION_MEDIUM` | `…_LOW\|…_MEDIUM\|…_HIGH\|none` |
| `AI_PRIMARY_TIMEOUT` | `12` | seconds |
| `AI_FALLBACK_TIMEOUT` | `15` | seconds |
| `AI_MAX_OUTPUT_TOKENS` | `2048` | |
| `AI_CATALOG_FOCUS_THRESHOLD` | `150` | active products before the focused catalog |
| `PHP_CLI_SERVER_WORKERS` | `4` | local `php artisan serve` only |

## Tests

| | v2.2.0 | v2.3.0 |
|---|---|---|
| `php artisan test` | 211 (1021 assertions) | **223 (1068)** — `GeminiSpeedTest` (thinking config 3.x/2.x, retry without field, fallback on timeout / 5xx), `AiBasketPipelineTest` (timings saved, basket-v2 catalog, focus, basket_pending / basket-done / auth, preview limit, empty result) |
| `pint --test` | pass | pass |
| `npm run test` | 354 | **372** — `useAutoCapture.test` (synthetic frames: noise + exposure drift captures once, movement cancels, no give-up, 3 s guard, re-arm, paused, render count), `aiBasketV23.test` (stages, image constant, Analyzed in, thumbnails, pane collapse, preview size, banner + merge, outside click, Esc confirm, sessionStorage, phone pause / empty) |
| `npm run lint` | 0 errors, 105 warnings | 0 errors, 105 warnings |
| build · `check:bundle` · `check:i18n` · `check:mobile` · `check:pwa` · `check-routes` | pass | pass |
| `smoke:ai` · `smoke:prod` · `smoke:pairing` · `smoke:pwa` | pass | pass (throwaway SQLite + mock AI on :8765/:4174, then stopped) |

`aiLab.test › routes to /ai-lab` got a 10 s wait (the lazy route timed out under the full suite once; passes alone).

## 5-minute human check

1. `git pull` · `cd backend && composer install && php artisan migrate` · `cd ../frontend && npm install` · `cd .. && npm install` (root now has `cross-env`)
2. Restart `npm run dev:lan` (the API now runs with 4 server workers)
3. `cd backend && php artisan ai:ping` — note the latency
4. 3 basket scans from the laptop and 3 from the phone — note each "Analyzed in X.X s" (target ≈ ≤ 6 s; the AI Lab "Where the time goes" card shows the split)
5. After a phone scan, move the phone around: the POS review must stay; the phone shows "Waiting for cashier" until Add to Cart
6. One AI Stock-In (3 products)
