# TindaTrack API Specification

Specification for all Laravel API endpoints backing TindaTrack.
Every endpoint requires Bearer authentication (`auth:sanctum`) and an active account status (`active`), with role enforcement (`role:owner` or `role:owner,cashier`) matching `frontend/src/config/permissions.js`.

Timezone: `Asia/Manila`. All dates formatted as ISO 8601 strings with timezone offset.
Money values: numeric with two decimal places (e.g. `25.5` or `25.00`).
Quantities: non-negative integers.
Paginator responses: `{ data: [...], links: {...}, meta: { current_page, last_page, per_page, total, from, to } }`.
Single resource responses: `{ data: {...} }`.
Action responses: `{ data: {...}, message?: string }` or `{ message: string }`.
Validation errors: 422 `{ message: 'The given data was invalid.', errors: { field: ['message'] } }`.
Forbidden errors: 403 `{ message: 'Unauthorized action.' }`.
Not found errors: 404 `{ message: 'Resource not found.' }`.

---

## Service to Endpoint Mapping Matrix

| Service Function | Method | Path | Role | Request Params / Body | Response Shape | Business Rules & Notes |
|---|---|---|---|---|---|---|
| `categoryService.list()` | GET | `/api/categories` | `owner,cashier` | None | `{ data: Category[] }` | Includes `product_count` (active & inactive products) per category. Sorted by name asc. |
| `categoryService.create(data)` | POST | `/api/categories` | `owner` | `{ name: string, code?: string, description?: string, color?: string, icon?: string }` | `{ data: Category }` | `name` required, unique. Auto-derives `code` if not provided. Default color/icon if omitted. |
| `categoryService.update(id, data)` | PUT | `/api/categories/{id}` | `owner` | `{ name?: string, code?: string, description?: string, color?: string, icon?: string }` | `{ data: Category }` | `name` unique excluding current category. |
| `categoryService.remove(id)` | DELETE | `/api/categories/{id}` | `owner` | None | `{ message: string }` | Blocked (422) if category has assigned products. |
| `productService.list(params)` | GET | `/api/products` | `owner,cashier` | `q?: string, category_id?: int, stock_status?: 'in_stock'\|'low_stock'\|'out_of_stock', sort?: string, page?: int, per_page?: int` | Paginator of `Product` (with `category`) | Cashier view strips `cost_price` and profit margin fields. Paginated (default 15/page). |
| `productService.get(id)` | GET | `/api/products/{id}` | `owner,cashier` | None | `{ data: Product }` | Includes `category`. Strips `cost_price` for cashiers. |
| `productService.create(data)` | POST | `/api/products` | `owner` | `{ name: string, sku: string, barcode?: string, category_id: int, unit: string, price: number, cost_price: number, stock_quantity: int, reorder_level: int, is_active?: bool, description?: string }` | `{ data: Product }` | `sku` unique, `barcode` unique nullable, `price >= 0`, `cost_price >= 0`, `stock_quantity >= 0`. If `stock_quantity > 0`, records initial `restock` movement. |
| `productService.update(id, data)` | PUT | `/api/products/{id}` | `owner` | `{ name?: string, sku?: string, barcode?: string, category_id?: int, unit?: string, price?: number, cost_price?: number, reorder_level?: int, is_active?: bool, description?: string }` | `{ data: Product }` | Does not directly alter `stock_quantity` (stock updates go through adjustStock or sales). SKU/barcode unique excluding current product. |
| `productService.remove(id)` | DELETE | `/api/products/{id}` | `owner` | None | `{ message: string }` | Soft-deletes product. Past sales & stock movement history remain preserved. |
| `productService.uploadImage(id, file, source)` | POST | `/api/products/{id}/image` | `owner` | `FormData: image (file, max 1MB), source?: 'upload'\|'camera'` | `{ data: Product }` | Validates MIME (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), stores as ULID `MEDIUMBLOB`, sets `image_url = /api/product-images/{ulid}`. |
| `productService.importImage(id, data)` | POST | `/api/products/{id}/image/import` | `owner` | `{ url: string }` | `{ data: Product }` | Imports external Open Food Facts image URL with SSRF protection (hostname allowlist, IP blocking), stores in DB. |
| `productService.deleteImage(id)` | DELETE | `/api/products/{id}/image` | `owner` | None | `{ data: Product }` | Deletes associated `ProductImage` record and sets `products.image_url = null`. |
| `productImage.show(ulid)` | GET | `/api/product-images/{ulid}` | Public | None | Binary stream | Streams raw image bytes with ETag sha256, 304 Not Modified, and 1-year immutable cache header. |
| `productService.adjustStock(id, data)` | POST | `/api/products/{id}/adjust` | `owner` | `{ type: 'restock'\|'damage'\|'correction', quantity: int, notes?: string }` | `{ data: Product }` | Inside transaction with row lock. For damage/negative correction, new stock cannot be < 0 (422). Logs `StockMovement`. |
| `productService.lowStock()` | GET | `/api/products/low-stock` | `owner,cashier` | None | `{ data: Product[] }` | Returns active products where `stock_quantity <= reorder_level`. Strips cost fields for cashiers. |
| `barcodeService.lookup(barcode)` | GET | `/api/barcode-lookup/{barcode}` | `owner,cashier` | None | `{ data: { barcode: string, local_product: Product\|null, catalog: CatalogInfo\|null } }` | Throttled 30/min. Cashier gets only `local_product` (catalog is null). Owner gets full OFF catalog lookup cached in `barcode_catalog`. 422 on invalid format. |
| `customerService.list(params)` | GET | `/api/customers` | `owner,cashier` | `q?: string, has_balance?: bool, sort?: string, page?: int, per_page?: int` | Paginator of `Customer` | Search by name, nickname, or contact_number. Filter `has_balance=true` for debtors. |
| `customerService.get(id)` | GET | `/api/customers/{id}` | `owner,cashier` | None | `{ data: Customer }` | Customer detail. |
| `customerService.create(data)` | POST | `/api/customers` | `owner,cashier` | `{ name: string, nickname?: string, contact_number?: string, address?: string, credit_limit?: number, notes?: string }` | `{ data: Customer }` | Initial `credit_balance = 0`. Default `credit_limit = 500`. |
| `customerService.update(id, data)` | PUT | `/api/customers/{id}` | `owner,cashier` | `{ name?: string, nickname?: string, contact_number?: string, address?: string, credit_limit?: number, notes?: string }` | `{ data: Customer }` | Updates profile. Cannot set `credit_limit < credit_balance` without warning. |
| `customerService.remove(id)` | DELETE | `/api/customers/{id}` | `owner` | None | `{ message: string }` | Guard: Blocked (422) if `credit_balance > 0`. Soft deletes customer. |
| `customerService.ledger(id)` | GET | `/api/customers/{id}/ledger` | `owner,cashier` | None | `{ data: { customer: Customer, timeline: LedgerItem[], current_balance: number } }` | Merges completed utang sales and utang payments chronologically to compute running balance, descending display. |
| `saleService.list(params)` | GET | `/api/sales` | `owner,cashier` | `q?: string, payment_type?: 'cash'\|'utang', status?: 'completed'\|'voided', user_id?: int, customer_id?: int, from?: string, to?: string, sort?: string, page?: int, per_page?: int` | Paginator of `Sale` | Cashier sees only own sales (`user_id = auth->id`). Filterable by date range, customer, payment type, status. |
| `saleService.get(id)` | GET | `/api/sales/{id}` | `owner,cashier` | None | `{ data: Sale }` | Returns sale with items, customer, and cashier. Cashiers can only view their own sales (403 otherwise). |
| `saleService.create(cartItems, payment)` | POST | `/api/sales` | `owner,cashier` | `{ items: [{ product_id: int, quantity: int }], payment_type: 'cash'\|'utang', amount_paid: number, customer_id?: int, notes?: string, override_limit?: bool }` | `{ data: Sale }` | In transaction with `lockForUpdate()`. Verify stock for all items; deduct stock; log `sale` movements; generate sequential `TT-YYYYMMDD-####` from locked `sale_counters`; cash: `amount_paid >= total`; utang: requires customer, increments `credit_balance`, blocks cashier if over limit unless owner overrides. |
| `saleService.void(id, reason)` | POST | `/api/sales/{id}/void` | `owner` | `{ reason: string }` | `{ data: Sale, message: string }` | Reason min 5 chars. Cannot void if already voided. Restores stock with `void` movements; reverses customer utang balance; sets `status='voided'`, `voided_by`, `voided_at`, `void_reason`. |
| `utangService.summary()` | GET | `/api/utang/summary` | `owner,cashier` | None | `{ data: { total_outstanding: number, debtors_count: int, overdue_count: int, collected_today: number, collected_this_month: number, aging: { current: number, days_8_14: number, days_15_30: number, days_over_30: number } } }` | Aggregates all outstanding balances, overdue customers (> 30 days without payment), collections for today and month. |
| `utangService.debtors(params)` | GET | `/api/utang/debtors` | `owner,cashier` | `q?: string, status?: 'all'\|'overdue'\|'near_limit', sort?: string, page?: int, per_page?: int` | Paginator of `Debtor` | Customers with `credit_balance > 0`, computed with `latest_utang_date`, `is_overdue`, `limit_usage_pct`. |
| `utangService.recordPayment(customerId, data)` | POST | `/api/utang-payments` | `owner,cashier` | `{ customer_id: int, amount: number, payment_date?: string, notes?: string }` | `{ data: UtangPayment }` | In transaction with `lockForUpdate()`. `amount > 0` and `<= customer.credit_balance`. Decrements `credit_balance`. |
| `inventoryService.overview()` | GET | `/api/inventory/overview` | `owner` | None | `{ data: { total_products: int, in_stock_count: int, low_stock_count: int, out_of_stock_count: int, total_stock_value_cost: number, total_stock_value_retail: number, estimated_potential_profit: number } }` | Active products valuation and inventory health breakdown. |
| `inventoryService.movements(params)` | GET | `/api/inventory/movements` | `owner` | `product_id?: int, type?: string, from?: string, to?: string, sort?: string, page?: int, per_page?: int` | Paginator of `StockMovement` | Audit log with `product` and `user` relations. Types: `sale`, `void`, `restock`, `damage`, `correction`. |
| `inventoryService.restockList()` | GET | `/api/inventory/restock-list` | `owner` | None | `{ data: { total_items: int, items: RestockItem[], grouped: Record<string, RestockItem[]> } }` | Active products with `stock_quantity <= reorder_level`. Formula: `suggested = max(1, reorder_level * 2 - stock_quantity)`. Grouped by category name. |
| `dashboardService.get(params)` | GET | `/api/dashboard` | `owner,cashier` | `range?: 'today'\|'7d'\|'30d'` | `{ data: DashboardData }` | SQL aggregates. Excludes voided sales. Owner: store metrics, profit, top products, trend. Cashier: shift sales, order count, cash collected, utang created, recent sales. |
| `reportService.sales(params)` | GET | `/api/reports/sales` | `owner` | `from?: string, to?: string, granularity?: 'daily'\|'weekly'\|'monthly'` | `{ data: { summary: { total_sales: number, gross_profit: number, total_orders: int, cash_sales: number, utang_sales: number }, series: SalesPoint[] } }` | SQL aggregates excluding voided sales. Totals equal `/sales` summary for matching range. |
| `reportService.bestSellers(params)` | GET | `/api/reports/best-sellers` | `owner` | `from?: string, to?: string, limit?: int` | `{ data: BestSellerItem[] }` | Top selling products by quantity and revenue over date window. |
| `reportService.categoryBreakdown(params)` | GET | `/api/reports/category-breakdown` | `owner` | `from?: string, to?: string` | `{ data: CategoryBreakdownItem[] }` | Aggregated sales revenue and quantity per category with percentage share. |
| `reportService.hourly(params)` | GET | `/api/reports/hourly` | `owner` | `from?: string, to?: string` | `{ data: HourlyDistributionItem[] }` | Distribution across hours 0..23 (sales amount and transaction count). |
| `staffService.list(params)` | GET | `/api/users` | `owner` | `status?: 'active'\|'inactive'\|'archived'\|'all', search?: string` | `{ data: User[] }` | List of all staff users with roles, active status, last_login_at, sales_count, sales_total_today. No N+1 queries. |
| `staffService.get(id)` | GET | `/api/users/{id}` | `owner` | None | `{ data: User }` | Retrieves single user details including soft-deleted users. |
| `staffService.create(data)` | POST | `/api/users` | `owner` | `{ name: string, email: string, phone?: string, password?: string, role?: 'cashier' }` | `{ data: User, temp_password?: string }` | Password min 8 chars (auto-generated 10-char mixed if omitted, returned in 201). Sets `must_change_password = true`, `is_active = true`. |
| `staffService.update(id, data)` | PUT | `/api/users/{id}` | `owner` | `{ name: string, email: string, phone?: string }` | `{ data: User }` | Updates staff profile (name, email, phone). Unique email validation. |
| `staffService.toggleActive(id)` | PATCH | `/api/users/{id}/toggle-active` | `owner` | None | `{ data: User }` | Toggles active status. Rejects self-deactivation (`self_action`) and last active owner (`last_owner`). Revokes tokens on deactivation. |
| `staffService.resetPassword(id, data)` | POST | `/api/users/{id}/reset-password` | `owner` | `{ password?: string }` | `{ data: User, temp_password?: string, message: string }` | Sets `must_change_password = true`, revokes all active tokens. Rejects self-reset (`self_action`) and owner targets (`owner_protected`). |
| `staffService.revokeSessions(id)` | POST | `/api/users/{id}/revoke-sessions` | `owner` | None | `{ message: string }` | Deletes all Sanctum tokens and terminates active scanner sessions for target user. |
| `staffService.archive(id)` | DELETE | `/api/users/{id}` | `owner` | None | `{ data: User, message: string }` | Soft-deletes user (`deleted_at = now()`), revokes tokens and scanner pairings. Rejects self (`self_action`) and owners (`owner_protected`). |
| `staffService.restore(id)` | POST | `/api/users/{id}/restore` | `owner` | None | `{ data: User, message: string }` | Restores soft-deleted user. Rejects with 422 `email_taken` if active user already uses the email. |
| `settingsService.get()` | GET | `/api/settings` | `owner` | None | `{ data: Settings }` | Returns singleton store settings row (name, tagline, contact, address, receipt headers/footers, thresholds). |
| `settingsService.update(data)` | PUT | `/api/settings` | `owner` | `{ store_name?: string, store_tagline?: string, phone?: string, address?: string, receipt_header?: string, receipt_footer?: string, default_reorder_level?: int, low_stock_threshold?: int }` | `{ data: Settings }` | Validates and updates singleton store configuration. |
| `account.updatePassword(data)` | PUT | `/api/user/password` | `owner,cashier` | `{ current_password: string, password: string, password_confirmation: string }` | `{ message: string }` | Verifies current password; updates password hash. |
| `scannerService.createSession(data)` | POST | `/api/scanner-sessions` | `owner,cashier` | `{ mode?: 'pos'\|'inventory' }` | `{ data: { id: string, pairing_code: string, pairing_expires_at: string, expires_at: string, mode: string } }` | Creates session, ends previous sessions of same mode, returns 9-char code (expires in 10m). Cashiers restricted to `pos` mode (403 for `inventory`). |
| `scannerService.getSession(id)` | GET | `/api/scanner-sessions/{id}` | `owner,cashier` | None | `{ data: { id: string, paired: bool, device_label: string, last_seen_at: string\|null, online: bool, ended_at: string\|null, mode: string } }` | Session status and connection health. Accessible only by session owner. |
| `scannerService.listEvents(id, after)` | GET | `/api/scanner-sessions/{id}/events` | `owner,cashier` | `after?: int` | `{ data: ScannerEvent[] }` | Polling feed for laptop terminal. Returns up to 50 events where `id > after`. |
| `scannerService.endSession(id)` | DELETE | `/api/scanner-sessions/{id}` | `owner,cashier` | None | `{ message: string }` | Ends session (`ended_at = now()`). |
| `scannerService.unknownBarcodes()` | GET | `/api/scanner/unknown-barcodes` | `owner` | None | `{ data: [{ barcode: string, scan_count: int, last_seen_at: string }] }` | Unresolved unknown barcodes from owner's store over last 14 days. |
| `scannerService.pair(data)` | POST | `/api/scanner/pair` | Public | `{ pairing_code: string, device_label?: string }` | `{ data: { token: string, session: { id, mode, expires_at }, store_name: string, user_name: string } }` | Redeems unexpired pairing code for 40-char session device token. Throttled 10/min. Single-use. |
| `scannerService.sendScan(data)` | POST | `/api/scanner/scans` | Device (`X-Scanner-Token`) | `{ barcode: string, quantity?: int }` | `{ data: { event_id: int, status: 'found'\|'out_of_stock'\|'unknown', product: ProductSnapshot\|null, catalog?: CatalogInfo } }` | Normalizes and logs scan event; broadcasts `scanner.scanned` live sync event. Throttled 120/min. |
| `scannerService.heartbeat()` | POST | `/api/scanner/heartbeat` | Device (`X-Scanner-Token`) | None | `{ data: { ended: bool } }` | Touches device `last_seen_at`. 401 if session has ended or expired. |

---

## Barcode & Scanner Endpoints Detail

### 1. `GET /api/barcode-lookup/{barcode}`
**Auth**: Bearer token (`auth:sanctum`), `active`
**Throttle**: 30 requests/min
**Example Request**:
```http
GET /api/barcode-lookup/4800016644800 HTTP/1.1
Authorization: Bearer <sanctum-token>
```
**Example Response (Owner)**:
```json
{
  "data": {
    "barcode": "4800016644800",
    "local_product": null,
    "catalog": {
      "found": true,
      "source": "openfoodfacts",
      "name": "Lucky Me! Instant Pancit Canton Kalamansi",
      "brand": "Lucky Me!",
      "size": "60g",
      "image_url": "https://images.openfoodfacts.org/images/products/480/001/664/4800/front_en.3.400.jpg",
      "suggested_category_id": 4,
      "attribution": "Data from Open Food Facts (ODbL)"
    }
  }
}
```

### 2. `POST /api/scanner-sessions`
**Auth**: Bearer token (`auth:sanctum`), `active`
**Role**: `owner,cashier` (Note: `mode="inventory"` requires `role:owner`)
**Request Body**:
```json
{
  "mode": "pos"
}
```
**Example Response**:
```json
{
  "data": {
    "id": "01JM7T4K8W2NZR5C3T99V0EF1G",
    "mode": "pos",
    "pairing_code": "K7RM-92NP",
    "pairing_expires_at": "2026-10-14T00:15:00+08:00",
    "expires_at": "2026-10-14T12:05:00+08:00"
  }
}
```

### 3. `POST /api/scanner/pair`
**Auth**: Public, Throttle: 10/min
**Request Body**:
```json
{
  "pairing_code": "K7RM-92NP",
  "device_label": "iPhone 15 Pro"
}
```
**Example Response**:
```json
{
  "data": {
    "token": "40_character_random_hex_device_token",
    "session": {
      "id": "01JM7T4K8W2NZR5C3T99V0EF1G",
      "mode": "pos",
      "expires_at": "2026-10-14T12:05:00+08:00"
    },
    "store_name": "Tindahan ni Aling Nena",
    "user_name": "Aling Nena"
  }
}
```

### 4. `POST /api/scanner/scans`
**Auth**: Header `X-Scanner-Token: <device-token>`, Throttle: 120/min
**Request Body**:
```json
{
  "barcode": "4800016644800",
  "quantity": 1
}
```
**Example Response**:
```json
{
  "data": {
    "event_id": 142,
    "status": "found",
    "product": {
      "id": 12,
      "name": "Lucky Me Pancit Canton Kalamansi",
      "price": 18.00,
      "stock_quantity": 45,
      "image_url": "https://images.openfoodfacts.org/images/products/.../front.jpg"
    }
  }
}
```

### 5. `GET /api/scanner-sessions/{id}/events?after={lastId}`
**Auth**: Bearer token (`auth:sanctum`), `active`
**Example Response**:
```json
{
  "data": [
    {
      "id": 142,
      "scanner_session_id": "01JM7T4K8W2NZR5C3T99V0EF1G",
      "barcode": "4800016644800",
      "status": "found",
      "quantity": 1,
      "payload": {
        "id": 12,
        "name": "Lucky Me Pancit Canton Kalamansi",
        "price": 18.00,
        "stock_quantity": 45,
        "image_url": "https://..."
      },
      "created_at": "2026-10-14T00:06:12+08:00"
    }
  ]
}
```

### 6. `GET /api/scanner/unknown-barcodes`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Example Response**:
```json
{
  "data": [
    {
      "barcode": "4800016644899",
      "scan_count": 4,
      "last_seen_at": "2026-10-13T23:54:10+08:00"
    }
  ]
}
```

---

## Product Image Endpoints Detail

### 1. `GET /api/product-images/{ulid}`
**Auth**: Public
**Headers**: `Cache-Control: public, max-age=31536000, immutable`, `ETag: "{sha256}"`
**Response**: Binary image stream (`image/jpeg`, `image/png`, `image/webp`, or `image/gif`), or `304 Not Modified` when client sends matching `If-None-Match`.

### 2. `POST /api/products/{id}/image`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Content-Type**: `multipart/form-data`
**Request Body**:
- `image`: File (required, max 1024KB / 1MB, MIME: jpeg/png/webp/gif)
- `source`: string (optional, `'upload'` | `'camera'`, defaults to `'upload'`)
**Response**: `{ "data": Product }` (with updated `image_url: "/api/product-images/{ulid}"`)

### 3. `POST /api/products/{id}/image/import`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Content-Type**: `application/json`
**Request Body**:
```json
{
  "url": "https://images.openfoodfacts.org/images/products/480/001/664/4800/front_en.3.400.jpg"
}
```
**SSRF Guards**:
- Schemes allowed: `http`, `https`
- Host allowlist: `*.openfoodfacts.org`, `*.openfoodfacts.net`
- Target IP resolution check: Blocks `127.0.0.1`, loopback, cloud metadata (`169.254.169.254`), and private RFC 1918 subnets
- Max download size: 2MB; Timeout: 8 seconds
**Response**: `{ "data": Product }` (with updated `image_url: "/api/product-images/{ulid}"`)

### 4. `DELETE /api/products/{id}/image`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Response**: `{ "data": Product }` (with `image_url: null`)

---

## Staff Management & User Account Endpoints Detail

All staff management operations are restricted to store owners (`role:owner`). Standard validation failures return 422 with `{ message, errors }`. Business rule violations return 422 with a structured machine-readable `code` alongside user-facing explanation in `errors`:

| Rule Code | HTTP Status | Description |
|---|---|---|
| `self_action` | 422 | Attempted to deactivate, archive, or reset password on currently authenticated account. |
| `last_owner` | 422 | Action would deactivate or archive the final active owner account, locking the store. |
| `owner_protected` | 422 | Disallowed modification, deactivation, archiving, or creation of owner roles via staff management. |
| `email_taken` | 422 | Restoration of archived staff blocked because email address is already claimed by an active user. |
| `user_archived` | 422 | Action cannot be performed on a soft-deleted staff member until restored. |

### 1. `GET /api/users`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Query Parameters**:
- `status`: `'active'` (default), `'inactive'`, `'archived'`, `'all'`
- `search`: string (filters by partial match on `name`, `email`, or `phone`)
**Response**:
```json
{
  "data": [
    {
      "id": 2,
      "name": "Maria Santos",
      "email": "cashier@tindatrack.test",
      "phone": "09171234567",
      "role": "cashier",
      "role_label": "Cashier",
      "is_active": true,
      "must_change_password": false,
      "last_login_at": "2026-10-15T18:22:10+08:00",
      "created_at": "2026-10-01T08:00:00+08:00",
      "deleted_at": null,
      "sales_count": 48,
      "sales_total_today": 3250.00
    }
  ]
}
```

### 2. `POST /api/users`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Request Body**:
```json
{
  "name": "Juan Dela Cruz",
  "email": "juan@example.com",
  "phone": "09181234567",
  "role": "cashier",
  "generate_password": true
}
```
**Notes**:
- If `generate_password: true` or `password` is omitted, generates a 12-character high-entropy temporary password, marks `must_change_password: true`, and returns `temporary_password` in the response body.
- Rejects `role: 'owner'` with 422 `code: "owner_protected"`.
**Response (201 Created)**:
```json
{
  "data": {
    "id": 3,
    "name": "Juan Dela Cruz",
    "email": "juan@example.com",
    "phone": "09181234567",
    "role": "cashier",
    "role_label": "Cashier",
    "is_active": true,
    "must_change_password": true,
    "created_at": "2026-10-16T08:00:00+08:00"
  },
  "message": "Staff member created successfully.",
  "temporary_password": "xK9#mQ2$pL8v"
}
```

### 3. `PATCH /api/users/{id}/toggle-active`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Behavior**: Toggles `is_active`. When deactivating, immediately deletes all active Sanctum tokens (`$user->tokens()->delete()`).
**Guards**:
- Self-deactivation: 422 `{ code: "self_action" }`
- Last active owner: 422 `{ code: "last_owner" }`
- Target is owner: 422 `{ code: "owner_protected" }`
- Target is archived: 422 `{ code: "user_archived" }`
**Response**:
```json
{
  "data": { "id": 2, "is_active": false, ... },
  "message": "Account for Maria Santos has been deactivated and all sessions revoked."
}
```

### 4. `POST /api/users/{id}/reset-password`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Request Body**:
```json
{
  "generate": true
}
```
**Behavior**: Resets password hash, sets `must_change_password: true`, and revokes all active Sanctum tokens.
**Guards**:
- Self-reset: 422 `{ code: "self_action" }`
- Target is owner: 422 `{ code: "owner_protected" }`
- Target is archived: 422 `{ code: "user_archived" }`
**Response**:
```json
{
  "data": { "id": 2, "must_change_password": true, ... },
  "message": "Password for Maria Santos has been reset and all sessions revoked.",
  "temporary_password": "tP4#vN8$wY2k"
}
```

### 5. `POST /api/users/{id}/revoke-sessions`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Behavior**: Revokes all Sanctum personal access tokens and terminates any active scanner sessions (`ended_at = now()`) for the target user.
**Response**:
```json
{
  "data": { "id": 2, ... },
  "message": "All active sessions for Maria Santos have been revoked."
}
```

### 6. `DELETE /api/users/{id}` (Archive / Soft-Delete)
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Behavior**: Soft-deletes user (`deleted_at = now()`), revokes all active Sanctum tokens, and ends active scanner sessions. All historical sales, utang payments, and stock movements remain intact with `withTrashed()` model associations.
**Guards**:
- Self-archive: 422 `{ code: "self_action" }`
- Last active owner: 422 `{ code: "last_owner" }`
- Target is owner: 422 `{ code: "owner_protected" }`
**Response**:
```json
{
  "data": { "id": 2, "deleted_at": "2026-10-16T08:30:00+08:00", ... },
  "message": "Account for Maria Santos has been archived."
}
```

### 7. `POST /api/users/{id}/restore`
**Auth**: Bearer token (`auth:sanctum`), `active`, `role:owner`
**Behavior**: Restores soft-deleted user account.
**Guards**:
- Email already taken by an active account: 422 `{ code: "email_taken", errors: { email: [...] } }`
**Response**:
```json
{
  "data": { "id": 2, "deleted_at": null, ... },
  "message": "Account for Maria Santos has been restored."
}
```

### 8. `PUT /api/user/password` (Self Password Update)
**Auth**: Bearer token (`auth:sanctum`), `active`
**Role**: `owner,cashier`
**Request Body**:
```json
{
  "current_password": "xK9#mQ2$pL8v",
  "password": "NewSecurePassword123",
  "password_confirmation": "NewSecurePassword123"
}
```
**Behavior**: Verifies current password hash, updates to new hashed password, and clears `must_change_password = false`.
**Frontend Integration**: When `user.must_change_password === true`, the application renders `MustChangePasswordBanner` across all authenticated views until this endpoint succeeds.
**Response**:
```json
{
  "message": "Password updated successfully."
}
```



