# TindaTrack Barcode System & Live Sync Architecture

## 1. System Architecture

TindaTrack provides zero-login phone pairing, real-time sync with desktop POS / inventory workstations, camera barcode scanning with WASM fallback, hardware USB/Bluetooth wedge support, and Open Food Facts catalog auto-filling with hybrid manual creation.

### High-Level Event Flow

```text
+-------------------+           +-------------------------------------+           +----------------------+
|   Mobile Phone    |           |           Laravel Backend           |           |     Laptop / POS     |
|   (/scan route)   |           |             (MySQL DB)              |           |     (/pos route)     |
+-------------------+           +-------------------------------------+           +----------------------+
          |                                        |                                          |
          |  1. POST /api/scanner/pair (Code)      |                                          |
          |--------------------------------------->|                                          |
          |  <-- Returns X-Scanner-Token           |                                          |
          |                                        |                                          |
          |  2. Continuous Barcode Scan            |                                          |
          |     POST /api/scanner/scans            |                                          |
          |--------------------------------------->|                                          |
          |                                        |-- Insert scanner_events                  |
          |                                        |-- (Optional Pusher dispatch)             |
          |  <-- Instant sound/haptic ACK          |                                          |
          |                                        |<-----------------------------------------|
          |                                        |  3. Polling (1.2s) or Pusher Event       |
          |                                        |----------------------------------------->|
          |                                        |                                          |-- Add product to cart
          |                                        |                                          |-- Increment quantity
          |                                        |                                          |-- Play audio beep
          |                                        |                                          |-- Toast notification
```

---

## 2. Open Food Facts Integration & Catalog Lookup

### Service Endpoints
- Base URLs queried in order:
  1. `https://world.openfoodfacts.org` (Food items)
  2. `https://world.openproductsfacts.org` (Non-food grocery items)
  3. `https://world.openbeautyfacts.org` (Toiletries, personal care)
- Endpoint: `GET {base}/api/v2/product/{barcode}.json?fields=code,product_name,product_name_en,generic_name,brands,quantity,image_front_url,image_url,categories_tags`

### Rate Limits, Caching, and User-Agent Policy
- **User-Agent Requirement**: Open Food Facts requires a distinct User-Agent containing the application name and contact info (`OFF_USER_AGENT`, e.g., `TindaTrack/1.1 (your-email@example.com)`).
- **Rate Limit**: Open Food Facts enforces a 15–30 req/min limit per IP.
- **Cache Strategy (`barcode_catalog` table)**:
  - Valid GTINs resolved successfully are cached for **30 days**.
  - Negative results (misses) are cached for **1 day** to prevent repeated rate-limit consumption for unlisted items.
  - Temporary network timeouts, 429s, or 5xx server errors are **never cached** to prevent transient failures from poisoning the catalog cache.
- **Attribution & Licensing**: Open Food Facts is licensed under the Open Database License (ODbL). The UI displays a clear attribution badge: *"Data mula sa Open Food Facts (ODbL)"* with a direct link to the product record.
- **Partial PH Coverage & Hybrid Flow**: Philippine sari-sari items (e.g., local sachets, instant noodles) have partial coverage in global open databases. The system never leaves the user stuck: if not found, it gracefully presents an editable manual entry form while preserving the scanned barcode.

---

## 3. Security Model

1. **Zero-Login Scoped Device Tokens**:
   - The phone does **not** log into the store owner's account and never receives a Sanctum Personal Access Token.
   - The laptop POS creates a session (`POST /api/scanner-sessions`), generating an unguessable 9-character human pairing code (`XXXX-XXXX`) valid for **10 minutes**.
   - The phone redeems the code for a 40-character random device token stored as an unrecoverable `sha256` hash in the database (`device_token_hash`).
   - The `scanner.device` middleware inspects `X-Scanner-Token` on every request. Device tokens are strictly scoped to `/api/scanner/scans` and `/api/scanner/heartbeat`. Attempting to access regular API endpoints (`/api/products`, `/api/sales`, etc.) immediately yields `401 Unauthorized`.
2. **Session Expiration**:
   - Pairing code expires after 10 minutes.
   - Entire scanner session expires after 12 hours.
   - The phone runs a 10-second heartbeat; upon session termination or owner disconnection, the phone receives 401 and clears `sessionStorage`.
3. **Throttles & Abuse Prevention**:
   - Pairing endpoint (`POST /api/scanner/pair`): **10 requests / minute per IP**.
   - Scanning endpoint (`POST /api/scanner/scans`): **120 requests / minute per device**.
   - Barcode lookup (`GET /api/barcode-lookup/{barcode}`): **30 requests / minute per user**.
4. **Role Permissions**:
   - **Cashiers**: Can view local products and scan items into the POS cart. Cashiers **cannot** query the external Open Food Facts catalog, and attempting to create an inventory session returns `403 Forbidden`. If an unknown barcode is scanned, cashiers see: *"Hindi pa naka-rehistro ang barcode na ito. Sabihan ang may-ari."*
   - **Owners**: Full catalog lookup access, inventory restock scanning, unknown barcode queue access, and inline product registration.

---

## 4. Local Testing with a Phone (LAN & HTTPS)

Mobile browsers require a secure origin (`HTTPS` or `localhost`) to access the device camera via `getUserMedia`.

### Method A: Vite LAN Mode (`dev:lan`)
1. Connect both your laptop and phone to the same Wi-Fi network.
2. Find your laptop's local IP address (e.g. `192.168.1.15` on macOS via `ipconfig getifaddr en0`).
3. Run the LAN dev server from the repository root:
   ```bash
   npm run dev:lan
   ```
   Or inside `frontend/`:
   ```bash
   npm run dev:lan
   ```
4. On your laptop browser, navigate to `https://localhost:5173/pos` (or `https://192.168.1.15:5173/pos`).
5. Click **"Ikonekta ang Phone"** in the POS header.
6. On your phone, scan the displayed QR code or open:
   ```text
   https://192.168.1.15:5173/scan?code=XXXX-XXXX
   ```
7. When your mobile browser displays a certificate warning (*"Your connection is not private"*), tap **Advanced** -> **Proceed to 192.168.x.x (unsafe)** to accept the self-signed certificate.
8. Grant camera permissions when prompted. The phone scanner will immediately connect to your laptop POS!

### Method B: Cloudflare Tunnel (Alternative)
If your Wi-Fi router isolates clients or self-signed certificates are blocked on iOS:
1. Start normal dev mode: `npm run dev`
2. In a separate terminal, run Cloudflared:
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
3. Copy the generated `https://<random-name>.trycloudflare.com` URL.
4. Set `VITE_PUBLIC_APP_URL=https://<random-name>.trycloudflare.com` in `frontend/.env.development`.
5. Open POS and scan the pairing QR code with your phone.

---

## 5. 5-Minute Live-Demo Presentation Script

Use this script during class presentations or client walkthroughs:

### 1. Zero-Friction Phone Pairing (0:00 - 1:00)
- **Action**: Open `/pos` on the laptop. Click the **"Ikonekta ang Phone"** button in the top header.
- **Narrative**: *"Sa TindaTrack, hindi kailangan bumili ng mamahaling hardware barcode scanner. Puwedeng gamitin ang anumang smartphone bilang wireless scanner nang hindi kailangang mag-log in ang tindera o ilagay ang password ng tindahan."*
- **Action**: Open phone camera, point at the QR code, tap the link.
- **Result**: Phone opens `/scan?code=...`, displays green *"Konektado sa POS ni Juan"*, and POS displays *"📱 Phone scanner: Online"*.

### 2. Live Scanning into POS (1:00 - 2:00)
- **Action**: Point the phone camera at 3 items (e.g., Bear Brand sachet, Lucky Me Pancit Canton, Great Taste White).
- **Result**:
  - Phone vibrates and emits an audio chime.
  - Laptop POS immediately adds items to the cart, calculates totals, and increments quantities on duplicate scans.
- **Narrative**: *"Mabilis ang live sync gamit ang aming real-time event pipeline. Bawat scan, awtomatikong nadadagdag sa listahan ng bibilhin nang walang delay."*

### 3. Scanning Unregistered Product with Open Food Facts Auto-Fill (2:00 - 3:15)
- **Action**: Scan a grocery item that is not yet in the local database.
- **Result**:
  - Laptop shows toast: *"Hindi kilalang barcode: Irehistro ang produkto"*.
  - Click **"Irehistro"**; the Product Create dialog opens.
  - Open Food Facts catalog data fills in the product name, brand, package size, category, and product image, with ODbL attribution.
- **Narrative**: *"Kapag may bagong produkto na hindi pa nakatala, kinukuha ng TindaTrack ang detalye mula sa Open Food Facts open-data catalog. Hindi na kailangang i-type nang mano-mano ang pangalan, brand, at kategorya. Ilalagay na lang ng may-ari ang presyo at stock."*

### 4. Homemade Items & Label Printing (3:15 - 4:15)
- **Action**: In Products, click **"Magdagdag ng Produkto"**, fill in name (*"Ice Candy Avocado"*), click **"Gumawa ng sariling barcode"**.
- **Result**: Generates an internal EAN-13 barcode starting with `20`. Click **"I-print ang label"**; displays printable 12-sticker grid with barcodes and prices.
- **Narrative**: *"Para sa mga lutong-bahay o sariling gawa tulad ng yelo, ice candy, o turon, may sariling internal barcode generator ang TindaTrack at mabilis na nakakapag-print ng sticker labels."*

### 5. Hardware USB / Bluetooth Scanner Compatibility (4:15 - 5:00)
- **Action**: On the POS page, use a USB barcode scanner (or type a barcode rapidly on keyboard + Enter).
- **Result**: The POS keyboard wedge catches rapid keystrokes without needing focus on any specific input, adding the item instantly.
- **Narrative**: *"Likas ding sinusuportahan ng TindaTrack ang mga tradisyunal na handheld USB at Bluetooth barcode gun gamit ang aming keyboard wedge listener."*
