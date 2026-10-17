# TindaTrack AI & Computer Vision Architecture (v2.0.0)

This document provides a technical specification of TindaTrack's hybrid Computer Vision and Artificial Intelligence architecture, covering cloud vision processing, on-device vector search, catalog matching algorithms, privacy protocols, and operational management.

---

## 1. High-Level Architecture

TindaTrack uses a **hybrid AI model**:
1. **Cloud Multi-Modal Vision (Gemini / Mock)**: Used for multi-object basket recognition at the POS and multi-product batch intake during inventory onboarding.
2. **On-Device Feature Extraction & Vector Search (DINov2 via Transformers.js)**: Runs 100% locally in the browser via a Web Worker for real-time camera-based visual item matching with zero backend latency.

### Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                    FRONTEND CLIENT                                    |
|                                                                                       |
|  +--------------------+     +---------------------+     +--------------------------+  |
|  |  POS Basket Scan   |     | Wireless Phone /scan|     |       AI Stock-In        |  |
|  |  (Laptop/Desktop)  |     |  (Paired Mobile)    |     |   (Inventory Onboard)    |  |
|  +---------+----------+     +----------+----------+     +------------+-------------+  |
|            |                           |                             |                |
|            | Canvas Downsampling       | Device Token                | Client Crop    |
|            | (<= 1500KB, <= 1280px)    | (X-Scanner-Token)           | & JPEG Enc     |
|            v                           v                             v                |
|  +---------------------------------------------------------------------------------+  |
|  |             POST /api/ai/basket-scan | POST /api/scanner/ai-basket              |  |
|  |                           POST /api/ai/product-scan                             |  |
|  +-------------------------------------+-------------------------------------------+  |
+----------------------------------------|----------------------------------------------+
                                         | HTTPS (Bearer Token / Device Token)
                                         v
+---------------------------------------------------------------------------------------+
|                                  LARAVEL BACKEND                                      |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | Middleware: auth:sanctum, active, role (owner/cashier) | scanner.device         |  |
|  | Rate Limiter: 6 req/min per user, 500 daily store quota, 1500 KB size limit     |  |
|  +-------------------------------------+-------------------------------------------+  |
|                                        |                                              |
|                                        v                                              |
|  +---------------------------------------------------------------------------------+  |
|  |                                  AiService                                      |  |
|  |  - Active catalog extraction (top 400 products, id|name|size|category)          |  |
|  |  - Category list extraction for intake                                         |  |
|  +-------------------------------------+-------------------------------------------+  |
|                                        |                                              |
|                                        v                                              |
|  +---------------------------------------------------------------------------------+  |
|  |                               VisionProvider                                    |  |
|  |     +-----------------------------------+----------------------------------+     |  |
|  |     | GeminiVisionProvider              | MockVisionProvider               |     |  |
|  |     | (Google Gemini 2.5 Flash / Lite)  | (Deterministic Fixture Fallback) |     |  |
|  |     +-----------------+-----------------+-----------------+----------------+     |  |
|  +-----------------------|-----------------------------------|--------------------+  |
|                          | Raw JSON Response                 |                        |
|                          +-----------------+-----------------+                        |
|                                            |                                          |
|                                            v                                          |
|  +---------------------------------------------------------------------------------+  |
|  |                             Post-Processing Pipeline                            |  |
|  |  - Catalog-Constrained ID Matching (drops hallucinated IDs -> unmatched)        |  |
|  |  - Quantity Aggregation & Merging by product_id (max 99)                        |  |
|  |  - Confidence Bucketing (high >= 0.8, check >= 0.5, low < 0.5)                 |  |
|  |  - Inventory Stock Overflow Check (exceeds_stock = quantity > stock_quantity)   |  |
|  |  - Duplicate Product Detection (Exact GTIN & Fuzzy 85% Levenshtein)             |  |
|  |  - Open Food Facts GTIN Barcode Enrichment                                      |  |
|  +-------------------------------------+-------------------------------------------+  |
|                                        |                                              |
|                                        v                                              |
|  +---------------------------------------------------------------------------------+  |
|  |                               Persistence & Audit                               |  |
|  |  - AiScan (telemetry, latency, raw JSON, parsed result)                          |  |
|  |  - AiScanImage (ephemeral, optional: setting.ai_save_scan_images, 30-day prune)   |  |
|  +-------------------------------------+-------------------------------------------+  |
+----------------------------------------|----------------------------------------------+
                                         | JSON { items, unmatched, scan_id, ... }
                                         v
+---------------------------------------------------------------------------------------+
|                                    FRONTEND REVIEW                                    |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | BasketReviewSheet / AiProductReviewTable                                        |  |
|  |  - Interactive Bounding Box overlay over preview canvas                        |  |
|  |  - Cashier adjustments: quantity stepper, remove item, resolve unmatched items   |  |
|  |  - "Add All to Cart" -> cartStore.addAiItems(items, scanId, 'ai_basket')        |  |
|  +-------------------------------------+-------------------------------------------+  |
|                                        |                                              |
|                                        v                                              |
|  +---------------------------------------------------------------------------------+  |
|  | POST /api/ai/scans/{id}/feedback (accepted, edited, rejected item counts)       |  |
|  +-------------------------------------+-------------------------------------------+  |
|                                        |                                              |
|                                        v                                              |
|  +---------------------------------------------------------------------------------+  |
|  | AI Research Lab (/ai-lab) Metrics & CSV Export                                  |  |
|  | (Precision, Recall, F1, Latency, Checkout Speed vs Manual POS)                  |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

---

## 2. Cloud Vision Prompts & JSON Schemas

TindaTrack strictly requires structured JSON output from multi-modal vision providers using Gemini's native `response_schema` mode (`response_mime_type: "application/json"`).

### 2.1 POS Basket Scan (`basket-v1`)

- **Class**: `App\Ai\Prompts\BasketPrompt`
- **Version**: `basket-v1`
- **Strategy**: **Catalog-Constrained Recognition**. The system injects up to 400 active store products formatted as `id|name|size|category`. Gemini is instructed to match items *strictly* to an active `product_id`. Any visible item not in the catalog must be placed into the `unmatched` bucket with a descriptive text label.

#### System Prompt Template
```text
You are a cashier assistant for a Philippine sari-sari store.
Identify every sellable item visible in this basket photo.
Count identical items carefully, including partially visible ones.
Match each item ONLY to a product_id from the provided catalog.
If unsure or not in the catalog, put it in `unmatched` with a short label.
Never invent product_ids.
Return `box_2d` as [ymin, xmin, ymax, xmax] normalized 0–1000 for each item group.
confidence is 0–1.

Store Catalog (Format: id|name|size|category):
{catalogText}
```

#### JSON Response Schema
```json
{
  "type": "OBJECT",
  "properties": {
    "items": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "product_id": { "type": "INTEGER" },
          "quantity": { "type": "INTEGER" },
          "confidence": { "type": "NUMBER" },
          "box_2d": {
            "type": "ARRAY",
            "items": { "type": "INTEGER" }
          }
        },
        "required": ["product_id", "quantity", "confidence", "box_2d"]
      }
    },
    "unmatched": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "label": { "type": "STRING" },
          "quantity": { "type": "INTEGER" },
          "box_2d": {
            "type": "ARRAY",
            "items": { "type": "INTEGER" }
          }
        },
        "required": ["label", "quantity", "box_2d"]
      }
    }
  },
  "required": ["items", "unmatched"]
}
```

---

### 2.2 AI Stock-In Scan (`products-v1`)

- **Class**: `App\Ai\Prompts\ProductPrompt`
- **Version**: `products-v1`
- **Strategy**: **Intake Extraction with Barcode OCR**. Extracts up to 5 distinct new products placed on a counter, reading brand, packaging size, readable barcode text, suggested category ID, and bounding box coordinates for client-side automated cropping.
- **Limit Notice**: Gemini AI processes up to 5 products per photo. When more than 5 products are visible, `more_than_five` is set to `true`, prompting the user: "Showing 5 products. Scan again for the rest."

#### System Prompt Template
```text
You are an inventory assistant for a Philippine sari-sari store.
Identify up to 5 DISTINCT products in the image.
If more than 5 distinct products are visible in the photo, set `more_than_five` to true and return the first 5.
For each: name as printed, brand, size/net weight, a suggested category from the provided list (by id), estimated count of units visible, any barcode digits readable on the packaging, `box_2d`, and confidence.
Use Filipino product naming as printed; do not translate brand names.
Return `box_2d` as [ymin, xmin, ymax, xmax] normalized 0–1000.
confidence is 0–1.

Store Categories (Format: id: name):
{categoriesText}
```

#### JSON Response Schema
```json
{
  "type": "OBJECT",
  "properties": {
    "more_than_five": {
      "type": "BOOLEAN"
    },
    "products": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "name": { "type": "STRING" },
          "brand": { "type": "STRING" },
          "size": { "type": "STRING" },
          "category_id": { "type": "INTEGER" },
          "estimated_count": { "type": "INTEGER" },
          "barcode_text": { "type": "STRING" },
          "confidence": { "type": "NUMBER" },
          "box_2d": {
            "type": "ARRAY",
            "items": { "type": "INTEGER" }
          }
        },
        "required": ["name", "brand", "size", "confidence", "box_2d"]
      }
    }
  },
  "required": ["products"]
}
```

---

## 3. Post-Processing & Matching Rules

Raw vision outputs undergo rigorous deterministic validation in `App\Ai\AiService`:

### 3.1 Catalog-Constrained ID Matching
- If Gemini returns a `product_id` that is **not present** in the store's active product set (or has been archived), it is unconditionally dropped from `items` and moved to `unmatched` with label `"Product #{product_id}"`.
- Multiple instances of the same `product_id` are grouped and merged:
  $$\text{quantity} = \min(99, \sum \text{qty})$$
  $$\text{confidence} = \max(\text{confidences})$$
  All individual bounding boxes are retained in the `boxes` array for multi-object canvas highlighting.

### 3.2 Confidence Bucketing
Each item is classified into a visual confidence tier:
- **`high`** ($\text{confidence} \ge 0.80$): Green badge. Confident match.
- **`check`** ($0.50 \le \text{confidence} < 0.80$): Amber badge. Needs cashier glance.
- **`low`** ($\text{confidence} < 0.50$): Rose badge. High likelihood of misidentification.

### 3.3 Inventory Stock Protection
- Every detected line item is compared against `product.stock_quantity`.
- If $\text{quantity} > \text{stock\_quantity}$, `exceeds_stock` is set to `true`, rendering an amber warning chip in the review sheet. Cashiers can override or adjust quantity before adding to cart.

### 3.4 Duplicate Product Detection (Intake)
When onboarding new products from photo:
1. **Barcode Match**: Normalized barcode is compared against all existing store products. If matched, returns `duplicate_of: { id, name, reason: 'barcode' }`.
2. **Fuzzy Name Match**: Product name is stripped of punctuation and unit stopwords (`g`, `ml`, `pc`, `pack`, `sachet`, `bottle`, etc.). Normalized candidate is compared against all active products using PHP `similar_text`.
   - If similarity $\ge 85.0\%$, returns `duplicate_of: { id, name, reason: 'name', similarity: 0.88 }`.
   - The UI displays an inline banner with a one-click CTA: **"Restock existing item"** instead of creating a duplicate row.

### 3.5 Open Food Facts GTIN Enrichment
If Gemini OCR reads a valid GTIN-8, GTIN-12, GTIN-13, or GTIN-14 barcode from the packaging, the backend calls `ProductLookupService::lookup($barcode)` to retrieve canonical metadata (brand, packaging net weight, Open Food Facts title, and remote product packshot).

---

## 4. On-Device Visual Search Pipeline

For real-time scanning at the POS (when barcodes are torn, faded, or absent), TindaTrack provides a client-side visual recognition engine.

```
+-------------------------------------------------------------------------------+
|                             ON-DEVICE PIPELINE                                |
|                                                                               |
|  +--------------------+         +------------------------------------------+  |
|  | Camera Video Frame | (700ms) | Offscreen Canvas Crop (Square 224x224)   |  |
|  +---------+----------+ ------> +--------------------+---------------------+  |
|                                                      |                        |
|                                                      v ImageData              |
|                                 +--------------------+---------------------+  |
|                                 | Dedicated Worker (embedder.worker.js)    |  |
|                                 | - Transformers.js (DINOv2-small)         |  |
|                                 | - WebGPU / WASM execution (dtype: 'q8')  |  |
|                                 | - L2 Feature Vector Normalization        |  |
|                                 +--------------------+---------------------+  |
|                                                      | 384-dim Float32Array   |
|                                                      v                        |
|                                 +--------------------+---------------------+  |
|                                 | visualSearch.js Engine                   |  |
|                                 | - Dot-Product Cosine Similarity          |  |
|                                 | - Top-3 Candidates Ranking               |  |
|                                 | - Confidence Threshold (>= 0.60)         |  |
|                                 | - Margin Threshold (top1 - top2 >= 0.03) |  |
|                                 +--------------------+---------------------+  |
|                                                      | Top Match              |
|                                                      v                        |
|                                 +--------------------+---------------------+  |
|                                 | Cart Auto-Add / Cashier Tappable Chip    |  |
|                                 | (add_method = 'visual')                  |  |
|                                 +------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

### 4.1 Embedding Model
- **Model**: `onnx-community/dinov2-small` (Vision Transformer by Meta AI, 384-dimensional latent embedding vector).
- **Quantization**: 8-bit quantized ONNX weights (`q8`) for fast download (~28 MB) and minimal memory footprint.
- **Acceleration**: Automatic WebGPU execution (`device: 'webgpu'`) with graceful fallback to WebAssembly CPU execution (`device: 'wasm'`).

### 4.2 Web Worker Architecture (`frontend/src/workers/embedder.worker.js`)
All neural network inference occurs off the main thread to prevent UI stutter:
- Messages:
  - `INIT`: Preloads model weights with download percentage progress broadcast.
  - `EMBED_IMAGE`: Ingests an `ImageData` or image blob, extracts features, applies L2 normalization ($\hat{x} = x / \|x\|_2$), and returns a 384-element `Float32Array`.
  - `COMPUTE_SIMILARITY`: Computes dot-product similarity against preloaded gallery vectors.

### 4.3 Similarity & Top-K Ranking
Because vectors are unit-normalized ($L_2 = 1.0$), cosine similarity simplifies to the Euclidean dot product:
$$\text{Sim}(u, v) = \sum_{i=1}^{384} u_i \cdot v_i$$

- **Confidence Threshold**: Match must have similarity $\ge 0.60$.
- **Margin Threshold**: Difference between top match and second-best match must be $\ge 0.03$ to avoid ambiguous classifications.
- **Learning Loop**: When an owner manually identifies a misclassified item, TindaTrack uploads the captured image frame to `POST /api/products/{id}/embeddings` (`source: 'correction'`), progressively improving local store accuracy.

---

## 5. Cost Control, Rate Limits & Token Economy

Google Gemini API usage is tightly managed to prevent unexpected cloud charges:

| Parameter | Value | Location / Environment Variable |
|---|---|---|
| Per-User Rate Limit | 6 requests / minute | `AI_PER_USER_PER_MINUTE=6` |
| Store Daily Limit | 500 requests / day | `AI_DAILY_LIMIT=500` |
| Request Timeout | 30 seconds | `AI_TIMEOUT=30` |
| Max Upload Size | 1500 KB | `AI_MAX_IMAGE_KB=1500` |
| Client Downsampling | Max 1280px / 80% JPEG | `frontend/src/lib/imagePrep.js` |
| Primary Model | `gemini-2.5-flash` | `GEMINI_MODEL=gemini-2.5-flash` |
| Fallback Model | `gemini-2.5-flash-lite` | `GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite` |

### Token Economy Strategy
- **Catalog Compression**: The product catalog is rendered as concise pipe-delimited text (`id|name|size|category`) rather than verbose JSON, reducing prompt token count by ~65%.
- **Catalog Cap**: In large stores, only the top 400 active products (sorted by recent transaction velocity and recency) are passed in the prompt context.
- **Client Compression**: Before transmission over cellular/Wi-Fi, raw 12MP camera captures are downsampled on an HTML5 canvas to a max bounding dimension of 1280px at 0.82 JPEG quality, typically resulting in 180–350 KB payload sizes.

---

## 6. Privacy & Data Handling

Philippine sari-sari stores operate in open street-side community settings. Protecting customer and minor privacy is fundamental:

1. **No Faces Policy**: Both English and Filipino consent disclosures explicitly instruct staff: *"Do not include people's faces. Keep focus on the items on the counter."*
2. **First-Use Consent**:
   - `FirstUseAiConsentDialog.jsx` renders on the user's first click of any AI feature.
   - Requires explicit agreement before any image bytes are captured or sent to the backend.
   - Acceptance is tracked in device `localStorage` keyed by user ID (`tt_ai_consent_{userId}`).
3. **Ephemeral Image Buffers by Default**:
   - By default, `ai_save_scan_images` is **`false`**.
   - Image bytes exist only in PHP memory during request processing and are discarded immediately.
   - Only non-reversible SHA-256 image hashes and telemetry are saved in `ai_scans`.
4. **Automated Data Retention & Pruning**:
   - When store owners opt into image retention for research/auditing (`ai_save_scan_images = true`), images are stored in `ai_scan_images`.
   - All scan images are automatically purged after 30 days via `php artisan ai:prune --days=30` (or probabilistic lazy pruning).

---

## 7. Failure Modes & Fallbacks

TindaTrack is architected to remain 100% operational even during total AI outage:

```
[Camera Capture / Photo]
         │
         ▼
  Is AI Enabled? ──── NO ───► Informative Toast & Fallback to Manual POS
         │ YES
         ▼
  Within Rate Limit? ─ NO ──► HTTP 429 Toast: "Rate limit reached. Try again in X seconds"
         │ YES
         ▼
  Cloud Available? ─── NO ──► Automatic Fallback Model (gemini-2.5-flash-lite)
         │                    If still down: Inform user & preserve manual barcode scan
         │ YES
         ▼
  Items Recognized? ── NO ──► Prompt Cashier to scan via Barcode / Search
         │ YES
         ▼
  Review Sheet (Cashier confirms/edits before adding to Cart)
```

- **Mock Vision Fallback**: If `GEMINI_API_KEY` is empty, TindaTrack runs in deterministic mock vision mode with zero network requests. POS testing and development proceed seamlessly without cloud dependencies.
- **On-Device Fallback**: If WebGPU or WASM fails to load DINov2 weights (e.g. legacy mobile browsers or network blockage), the Visual match tab displays a helpful fallback badge directing the cashier to standard barcode scanning.

---

## 7.1 Auto-Capture Flow Diagrams & Operational Semantics

### AI Basket Flow (POS Auto-Capture & Cart Transfer)

```
[Camera Open in AI Basket]
           │
           ▼
[On-Device Motion Engine (useAutoCapture)]
   - 64x48 downsampled canvas @ 10 fps
   - Reject blank/pitch-black (< 35 luma)
   - Luma diff <= threshold for steady duration (1.2s - 1.8s)
           │
           ├─ Movement detected? ──► Reset timer to 0 (Stay in "Watching")
           ▼
   [Steady Scene Confirmed]
           │
           ▼
   [1.5s Radial Countdown Ring & Pulse]
           │
           ├─ Sudden motion? ──────► Abort countdown (abortCount++), Back to "Watching"
           ▼
   [Shutter Sound + Capture Frame Blob (capture_mode='auto')]
           │
           ▼
   [Cloud Call: POST /api/ai/basket-scan]
           │
           ├─ 429 Rate Limit? ─────► Auto-capture toggles OFF, Backoff timer active
           ▼
   [BasketReviewSheet Opens]
           │
           ├─ "Scan Again" Clicked? ──► Modal: "Replace Items" vs "Add to Items"
           │                             - Replace: overwrites current review
           │                             - Add: merges newly detected items into review list
           ▼
   [Cashier Verifies & Confirms "Add to Cart"]
           │
           ├─ Cart items populated with add_method: 'ai'
           └─ Telemetry feedback emitted: POST /api/ai/scans/{id}/feedback
```

### AI Stock-In Flow (Inventory Multi-Product Onboarding)

```
[Owner Navigates to Products ──► "AI Stock-In"]
           │
           ▼
[Camera Viewfinder with Auto-Capture (feature='stockin')]
   - Hint banner: "Place up to 5 different products, labels facing the camera, then hold still."
   - 5-product limit enforced visually and via prompt
           │
           ▼
[Settled Scene Detected ──► 1.5s Countdown ──► Auto Shutter]
           │
           ▼
[Cloud Call: POST /api/ai/product-scan (capture_mode='auto')]
           │
           ▼
[AiProductReviewTable Sheet Opens]
   - Normalized product list with confidence badges and bounding boxes
   - Selling Price starts empty (Required field; no silent 0.00 save)
   - Starting stock defaults to estimated_count || 1
   - Duplicate detection warns if GTIN or name already exists in catalog
   - Auto-generated SKU displayed read-only (e.g. "SKU: auto-generated on save")
   - Reorder level input per row (defaults to 5)
           │
           ├─ "Scan Again" Clicked? ──► Returns to camera, re-arms auto-capture, retains drafts
           ▼
[Owner Fills Prices & Clicks "Save Ready Items"]
           │
           ▼
[Atomic Backend Transaction: POST /api/products/bulk]
   - Creates products in exact review order
   - Preserves packshot images & crop coordinates
   - Stock movements logged with reference: "ai_stock_in"
```

### Rate Limiting & Daily Budget Rules

1. **User Throttle (6 req/min)**:
   - Enforced by Laravel API middleware on all AI endpoints.
   - When a 429 response is encountered, frontend `useAutoCapture` automatically flips `isAutoEnabled` to `false` and engages rate limit backoff until the cooldown header expires.
2. **Store Daily Quota (500 scans/day)**:
   - Tracked in database cache per store tenant across 24-hour rolling window.
   - When 80% (400 scans) is reached, AI dialogs display an amber quota warning banner.
   - When 100% (500 scans) is reached, AI endpoints reject new scans with a 429 quota exhausted message, prompting cashier/owner to utilize high-speed barcode scanning.
3. **Capture Cooldown**:
   - Built-in 3.0s cooldown floor between successive auto-captures prevents accidental rapid-fire API charges when the cashier is removing items from the counter.


---

## 8. Operational Commands & Switching Models

### 8.1 Verifying Provider Connectivity
Run `php artisan ai:ping` to test credentials, latency, and model availability:
```bash
# Ping configured default provider
php artisan ai:ping

# Explicitly ping Google Gemini
php artisan ai:ping --provider=gemini

# Explicitly ping Mock provider
php artisan ai:ping --provider=mock
```

Example output:
```text
Testing AI Vision connectivity...

  Provider: gemini
  Model:    gemini-2.5-flash
  Latency:  642 ms
  Status:   SUCCESS - Connected to Google Gemini Vision API
```

### 8.2 Switching Models
To change the active Gemini model or fallback model in production, update your Railway environment variables:
```ini
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
```
Then clear the Laravel configuration cache:
```bash
php artisan config:clear
```

### 8.3 Pruning Image Storage
To manually purge expired scan images from the database:
```bash
# Prune images older than 30 days (default)
php artisan ai:prune

# Prune images older than 7 days
php artisan ai:prune --days=7
```
