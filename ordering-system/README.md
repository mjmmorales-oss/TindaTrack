# TindaOrder — System 1 (Online Ordering System)

TindaOrder is a small online ordering website for *Tindahan ni Aling Nena*. It has **its own database** (`tindaorder`) and **no stock data of its own**. Every product, price and stock number comes from **System 2 — TindaTrack Inventory** through its REST API.

```
TindaOrder (System 1)  ── HTTP + JSON + X-API-Key ──▶  TindaTrack Inventory API (System 2)
   tindaorder DB                                          tindatrack DB
```

## What it does

| Page | Integration call to System 2 |
|---|---|
| **Shop** (`index.php`) | `GET /products` — live catalog and stock |
| **Check stock** (`check_stock.php`) | `GET /products/{id}/stock` (JSON) and `?format=xml` (XML) |
| **Place Order** (`place_order.php`) | `POST /orders` — sends `order_id, customer_id, product_id, quantity` |
| **Order details** (`order.php`) | Shows the exact JSON request and response |
| **Retry** (`retry_order.php`) | Re-sends a pending order with the same `order_id` (safe: System 2 is idempotent) |
| **Integration Log** (`api_logs.php`) | Every API call with method, endpoint, HTTP status, time, JSON |

## How to run (Windows + XAMPP)

1. **Start MySQL** in the XAMPP Control Panel.
2. **Create the database:** open `http://localhost/phpmyadmin` → **Import** → choose `ordering-system/database/tindaorder.sql` → **Go**.
3. **Start TindaTrack first** (System 2) — in the repo root: `npm run dev` (or `cd backend && php artisan serve`).
4. **Start TindaOrder** (System 1) — open a *second* terminal in the repo root:
   ```bash
   npm run dev:order
   ```
   (same as `php -S 127.0.0.1:8080 -t ordering-system`)
5. Open **http://127.0.0.1:8080**

## Configuration

`config.php`:

- `db` — MySQL connection for the `tindaorder` database (XAMPP default: user `root`, no password).
- `inventory_api.base_url` — `http://127.0.0.1:8000/api/integration/v1`
- `inventory_api.api_key` — **must equal** `INTEGRATION_API_KEY` in `backend/.env`.

## Order status meaning

| Status | Cause (HTTP from System 2) |
|---|---|
| Confirmed | 201 Created (or 200 duplicate replay) — stock deducted |
| Rejected | 409 insufficient stock, or 422 invalid data |
| Pending | System 2 could not be reached — use **Retry sending** |
| Failed | 401 wrong API key, or another unexpected error |
