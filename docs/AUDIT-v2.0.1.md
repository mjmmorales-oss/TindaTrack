# TindaTrack v2.0.1 Write Path & Contract Audit

This audit document details every write path across TindaTrack (frontend forms, API endpoints, mock implementations, validation rules, payload fixtures, and resolution status), systematically preventing hidden required field errors and contract drifts.

## 1. Complete Write Path Inventory Table

| ID | Module / Feature | Frontend Form / Trigger | Endpoint | HTTP Method | Required Role | Backend Validation Rules | Frontend Fields Sent | Status |
|---|---|---|---|---|---|---|---|---|
| W01 | Products (Full Form) | `ProductFormDialog` | `/api/products` | `POST` | Owner | `name` (req, max:255), `category_id` (req, exists), `sku` (nullable, unique), `barcode` (nullable, unique), `unit` (nullable, max:20), `price` (req, numeric, min:0), `cost_price` (req, numeric, min:0), `stock_quantity` (nullable, int, min:0), `reorder_level` (nullable, int, min:0), `is_active` (nullable, bool), `description` (nullable), `image_url` (nullable), `brand` (nullable), `size` (nullable), `source` (nullable), `source_ref` (nullable) | `name`, `category_id`, `sku`, `barcode`, `unit`, `price`, `cost_price`, `stock_quantity`, `reorder_level`, `is_active`, `description`, `brand`, `size`, `image_url`, `source`, `source_ref` | **Verified & Fixed** (F1 auto-generates SKU) |
| W02 | Products (Quick Add) | `AddByBarcodeDialog` | `/api/products` | `POST` | Owner | Same as W01 | `name`, `category_id`, `unit`, `price`, `cost_price`, `stock_quantity`, `barcode`, `brand`, `size`, `image_url`, `source`, `source_ref`, `reorder_level`, `is_active` | **Verified & Fixed** (No silent category fallback; auto SKU generated) |
| W03 | Products (Homemade) | `AddByBarcodeDialog` | `/api/products` | `POST` | Owner | Same as W01 | `name`, `category_id`, `unit`, `price`, `cost_price`, `stock_quantity`, `barcode`, `source`, `reorder_level`, `is_active` | **Verified & Fixed** (Internal EAN barcode generation + print labels) |
| W04 | Products (Update) | `ProductFormDialog` | `/api/products/{id}` | `PUT` | Owner | `name` (sometimes, req), `category_id` (sometimes, req), `sku` (sometimes, nullable, unique), `barcode` (nullable, unique), `unit` (nullable), `price` (sometimes, req, min:0), `cost_price` (sometimes, req, min:0), `reorder_level` (nullable), `is_active` (nullable), `description` (nullable), `image_url` (nullable), `brand` (nullable), `size` (nullable), `source` (nullable), `source_ref` (nullable) | `name`, `category_id`, `sku`, `barcode`, `unit`, `price`, `cost_price`, `reorder_level`, `is_active`, `description`, `brand`, `size`, `image_url`, `source`, `source_ref` | **Verified & Fixed** |
| W05 | Products (Bulk AI Review) | `AiProductReviewTable` | `/api/products/bulk` | `POST` | Owner | `products` (req, array, min:1, max:10), `products.*.name` (req), `products.*.category_id` (req, exists), `products.*.price` (req, min:0), `products.*.stock_quantity` (req, min:0), `products.*.sku` (nullable), `products.*.barcode` (nullable), `products.*.cost_price` (nullable), `products.*.brand` (nullable), `products.*.size` (nullable), `products.*.image_url` (nullable) | `products` array with `name`, `category_id`, `price`, `cost_price`, `stock_quantity`, `barcode`, `brand`, `size` | **Verified & Fixed** (Normalized `initial_stock` -> `stock_quantity`, `cost` -> `cost_price`) |
| W06 | Products (Stock Adjust) | `AdjustStockDialog` | `/api/products/{id}/adjust` | `POST` | Owner | `type` (req, in:restock,damage,correction,correction_plus,correction_minus), `quantity` (req, int), `notes` (nullable, max:500) | `type`, `quantity`, `notes` | **Verified** |
| W07 | Products (Image Upload) | `ProductFormDialog` | `/api/products/{id}/image` | `POST` | Owner | `image` (req, file, max:1024), `source` (nullable, in:upload,camera) | `image` (binary multipart), `source` | **Verified** |
| W08 | Products (Image Import) | `ProductFormDialog` | `/api/products/{id}/image/import` | `POST` | Owner | `url` (req, string, url, max:2048) | `url` | **Verified** |
| W09 | Products (Image Delete) | `ProductFormDialog` | `/api/products/{id}/image` | `DELETE` | Owner | No payload | None | **Verified** |
| W10 | Products (Delete) | `ProductsPage` | `/api/products/{id}` | `DELETE` | Owner | No payload | None | **Verified** |
| W11 | Categories (Create) | `CategoryFormDialog` | `/api/categories` | `POST` | Owner | `name` (req, unique, max:255), `code` (nullable, max:20), `description` (nullable, max:1000), `color` (nullable, max:30), `icon` (nullable, max:50) | `name`, `description`, `color`, `icon` | **Verified** |
| W12 | Categories (Update) | `CategoryFormDialog` | `/api/categories/{id}` | `PUT` | Owner | `name` (sometimes, req, unique), `code` (nullable), `description` (nullable), `color` (nullable), `icon` (nullable) | `name`, `description`, `color`, `icon` | **Verified** |
| W13 | Categories (Delete) | `CategoriesPage` | `/api/categories/{id}` | `DELETE` | Owner | Guard: rejects if assigned products > 0 | None | **Verified** |
| W14 | Customers (Create) | `CustomerFormDialog` | `/api/customers` | `POST` | Owner, Cashier | `name` (req, max:255), `nickname` (nullable, max:100), `contact_number` (nullable, max:30), `address` (nullable, max:500), `credit_limit` (nullable, numeric, min:0), `notes` (nullable, max:1000) | `name`, `nickname`, `contact_number`, `address`, `credit_limit`, `notes` | **Verified** |
| W15 | Customers (POS Mini Form) | `NewCustomerMiniForm` | `/api/customers` | `POST` | Owner, Cashier | Same as W14 | `name`, `nickname`, `contact_number`, `credit_limit` | **Verified** |
| W16 | Customers (Update) | `CustomerFormDialog` | `/api/customers/{id}` | `PUT` | Owner, Cashier | `name` (sometimes, req), `nickname` (nullable), `contact_number` (nullable), `address` (nullable), `credit_limit` (sometimes, req, numeric, min:0), `notes` (nullable) | `name`, `nickname`, `contact_number`, `address`, `credit_limit`, `notes` | **Verified** |
| W17 | Customers (Delete) | `CustomersPage` | `/api/customers/{id}` | `DELETE` | Owner | Guard: rejects if customer has balance > 0 | None | **Verified** |
| W18 | Sales (Cash Checkout) | `PaymentDialog` | `/api/sales` | `POST` | Owner, Cashier | `items` (req, array, min:1), `items.*.product_id` (req, int), `items.*.quantity` (req, int, min:1), `items.*.add_method` (nullable), `payment_type` (nullable, in:cash,utang), `amount_paid` (nullable, numeric), `notes` (nullable), `cart_started_at` (nullable), `cart_duration_ms` (nullable) | `items`, `payment_type`, `amount_paid`, `notes`, `cart_started_at`, `cart_duration_ms` | **Verified** |
| W19 | Sales (Utang Checkout) | `PaymentDialog` | `/api/sales` | `POST` | Owner, Cashier | Same as W18 plus `customer_id` (req for utang), `override_limit` (nullable, bool) | `items`, `payment_type`, `customer_id`, `amount_paid`, `notes`, `cart_started_at`, `cart_duration_ms` | **Verified** |
| W20 | Sales (Void) | `SaleDetailPage` | `/api/sales/{id}/void` | `POST` | Owner | `reason` (req, string, min:5, max:500) | `reason` | **Verified** |
| W21 | Utang Payments | `RecordPaymentDialog` | `/api/utang-payments` | `POST` | Owner, Cashier | `customer_id` (req, exists), `amount` (req, min:0.01), `payment_date` (nullable, date), `notes` (nullable, max:500) | `customer_id`, `amount`, `payment_date`, `notes` | **Verified** |
| W22 | Staff (Create) | `StaffPage` | `/api/users` | `POST` | Owner | `name` (req, max:255), `email` (req, email, unique), `phone` (nullable, max:50), `role` (nullable, in:cashier), `password` (nullable when generatePassword=true, or min:8 with letters and numbers) | `name`, `email`, `phone`, `role`, `password` (optional) | **Verified** |
| W23 | Staff (Update) | `StaffPage` | `/api/users/{id}` | `PATCH` | Owner | `name` (req, max:255), `email` (req, email, unique), `phone` (nullable, max:50) | `name`, `email`, `phone` | **Verified** |
| W24 | Staff (Toggle Active) | `StaffPage` | `/api/users/{id}/toggle-active` | `PATCH` | Owner | No payload | None | **Verified** |
| W25 | Staff (Reset Password) | `StaffPage` | `/api/users/{id}/reset-password` | `POST` | Owner | `password` (optional if generate=true, else min:8 letters & numbers) | `password` (optional) | **Verified** |
| W26 | Staff (Revoke Sessions) | `StaffPage` | `/api/users/{id}/revoke-sessions` | `POST` | Owner | No payload | None | **Verified** |
| W27 | Staff (Archive) | `StaffPage` | `/api/users/{id}` | `DELETE` | Owner | No payload (prevents self-archive) | None | **Verified** |
| W28 | Staff (Restore) | `StaffPage` | `/api/users/{id}/restore` | `POST` | Owner | No payload | None | **Verified** |
| W29 | Settings (Update) | `SettingsPage` / `AiSettingsCard` | `/api/settings` | `PUT` | Owner | `store_name` (sometimes, req), `store_tagline` (nullable), `owner_name` (nullable), `phone` (nullable), `contact_number` (nullable), `address` (nullable), `receipt_header` (nullable), `receipt_footer` (nullable), `show_cashier_name` (nullable, bool), `default_reorder_level` (nullable, int, min:1), `low_stock_threshold` (nullable, int, min:1), `low_stock_threshold_percent` (nullable, numeric), `currency` (nullable), `timezone` (nullable), `ai_enabled` (nullable, bool), `ai_save_scan_images` (nullable, bool), `ai_research_mode` (nullable, bool), `visual_search_enabled` (nullable, bool) | Full store profile, receipt text, low stock alerts, or partial AI toggle payload `{ [key]: val }` | **Verified & Fixed** (Added AI toggles and aliases to backend validator) |
| W30 | Settings (Restore Images) | `SettingsPage` | `/api/settings/restore-demo-images` | `POST` | Owner | No payload | None | **Verified** |
| W31 | Account (Password) | `AccountPage` | `/api/user/password` | `PUT` | Owner, Cashier | `current_password` (req, string), `password` (req, string, min:8, confirmed) | `current_password`, `password`, `password_confirmation` | **Verified & Fixed** (Mapped frontend `new_password` to `password`) |
| W32 | Scanner (Session Create) | POS / Inventory | `/api/scanner-sessions` | `POST` | Owner, Cashier | `mode` (nullable, in:pos,inventory) | `mode` | **Verified** |
| W33 | Scanner (Session End) | Phone / POS | `/api/scanner-sessions/{id}` | `DELETE` | Owner, Cashier | No payload | None | **Verified** |
| W34 | Scanner (Pair) | Phone Scanner | `/api/scanner/pair` | `POST` | Guest | `pairing_code` (req, string), `device_label` (nullable, max:100) | `pairing_code`, `device_label` | **Verified** |
| W35 | Scanner (Scan Event) | Phone Scanner | `/api/scanner/scans` | `POST` | Scanner Device | `barcode` (req, string), `quantity` (nullable, int, min:1) | `barcode`, `quantity` | **Verified** |
| W36 | Scanner (AI Basket Photo) | Phone Scanner | `/api/scanner/ai-basket` | `POST` | Scanner Device | `image` (req, file) | `image` (multipart) | **Verified** |
| W37 | Scanner (Heartbeat) | Phone Scanner | `/api/scanner/heartbeat` | `POST` | Scanner Device | No payload | None | **Verified** |
| W38 | AI (Basket Scan) | POS Terminal | `/api/ai/basket-scan` | `POST` | Owner, Cashier | `image` (req, file) | `image` (multipart) | **Verified** |
| W39 | AI (Product Intake Scan) | Products Page | `/api/ai/product-scan` | `POST` | Owner | `image` (req, file) | `image` (multipart) | **Verified** |
| W40 | AI (Scan Feedback) | Checkout / Intake | `/api/ai/scans/{id}/feedback` | `POST` | Owner, Cashier | `lines` (req, array), `lines.*.line_type` (req, in:item,unmatched,missed), `lines.*.action` (req, in:accepted,qty_changed,product_changed,removed,added_manually), `lines.*.suggested_product_id` (nullable), `lines.*.suggested_quantity` (nullable), `lines.*.confidence` (nullable), `lines.*.final_product_id` (nullable), `lines.*.final_quantity` (nullable) | `lines` | **Verified** |
| W41 | Products (Embeddings Save) | Visual Index | `/api/products/{id}/embeddings` | `POST` | Owner | `model` (req, string, max:100), `source` (req, string, in:product_image,reference_photo,correction), `vector` (req, array of numeric), `image_sha256` (nullable, max:64) | `model`, `source`, `vector`, `image_sha256` | **Verified** |
| W42 | Products (Embeddings Delete) | Visual Index | `/api/products/{id}/embeddings/{id}` | `DELETE` | Owner | No payload | None | **Verified** |
| W43 | AI Experiments (Create) | `NewExperimentDialog` | `/api/ai/experiments` | `POST` | Owner | `name` (req, string, max:150), `type` (nullable, max:50), `notes` (nullable) | `name`, `type`, `notes` | **Verified** |
| W44 | AI Experiments (Run Case) | `NewTestCaseDialog` | `/api/ai/experiments/{id}/cases` | `POST` | Owner | `image` (req, file), `ground_truth` (req, json/array) | `image`, `ground_truth` | **Verified** |
| W45 | AI Experiments (Reset) | `AiLabPage` | `/api/ai/experiments/{id}/reset` | `POST` | Owner | No payload | None | **Verified** |
| W46 | Auth (Register) | `RegisterPage` | `/api/register` | `POST` | Guest | `name` (req, max:255), `email` (req, lowercase, email, max:255, unique:users), `password` (req, confirmed, min:8) | `name`, `email`, `password`, `password_confirmation` | **Verified** |
| W47 | Auth (Login) | `LoginPage` | `/api/login` | `POST` | Guest | `email` (req, email), `password` (req, string), `device_name` (optional) | `email`, `password`, `device_name` | **Verified** |
| W48 | Auth (Forgot Password) | `ForgotPasswordPage` | `/api/forgot-password` | `POST` | Guest | `email` (req, email) | `email` | **Verified** |
| W49 | Auth (Reset Password) | `ResetPasswordPage` | `/api/reset-password` | `POST` | Guest | `token` (req), `email` (req, email), `password` (req, confirmed, min:8) | `token`, `email`, `password`, `password_confirmation` | **Verified** |
| W50 | Auth (Logout) | Topbar / Account | `/api/logout` | `POST` | Authenticated | No payload | None | **Verified** |

---

## 2. Audit Findings & Resolutions

### Finding F3-A: `SettingsController@update` stripped AI settings and form aliases
- **Severity**: High
- **Problem**: When `AiSettingsCard` updated `ai_enabled`, `ai_save_scan_images`, `ai_research_mode`, or `visual_search_enabled`, the controller stripped them because they were omitted from `$request->validate([...])`. Furthermore, `contact_number`, `owner_name`, and `low_stock_threshold_percent` sent from `SettingsPage` were unvalidated.
- **Resolution**: Updated `SettingsController@update` validation rules to include all AI toggles and form aliases.
- **Status**: Fixed & verified by fixture test.

### Finding F3-B: Bulk Product Intake Key Mismatch (`initial_stock` vs `stock_quantity`, `cost` vs `cost_price`)
- **Severity**: High
- **Problem**: `AiProductReviewTable` sent `cost` and `initial_stock`, while `ProductBulkController` strictly validated `products.*.stock_quantity` as required and expected `cost_price`. This caused bulk adds from AI intake to fail with 422 errors. In addition, `category_id` was nullable in the validator but non-nullable in MySQL.
- **Resolution**:
  1. Updated `ProductBulkController.php` to normalize `initial_stock` -> `stock_quantity` and `cost` -> `cost_price` before validation, and made `products.*.category_id` required.
  2. Updated `AiProductReviewTable.jsx` to map `stock_quantity` and `cost_price` explicitly.
- **Status**: Fixed & verified by fixture test.

### Finding F3-C: Account Password Change Field Mapping
- **Severity**: Medium
- **Problem**: RHF form fields were `new_password` and `confirm_password`, while Laravel validator returns errors for `password` and `password_confirmation`. Unmapped errors on password confirmation were not linked to the visible field.
- **Resolution**: Adopted `applyServerErrors(err, setError, { fieldMap: { password: 'new_password', password_confirmation: 'confirm_password' } })`.
- **Status**: Fixed & verified.

### Finding F3-D: Friendly Validation Error UX
- **Severity**: Medium
- **Problem**: When an unmapped or hidden field validation error occurred (e.g. legacy SKU required error), the user saw raw Laravel error strings like "The sku field is required."
- **Resolution**: Created `applyServerErrors` in `@/lib/formErrors.js`. It links backend field errors to visible form fields, translates messages, and only surfaces toasts for truly unmapped fields formatted in plain English.
- **Status**: Fixed & verified.

---

## 3. F5 Functional & Role Sweep Findings

### Finding F5-A: Barcode & Visual Scanner in AddByBarcodeDialog
- **Severity**: Medium
- **File**: `frontend/src/components/scanner/BarcodeCapture.jsx`, `frontend/src/features/products/components/AddByBarcodeDialog.jsx`
- **Problem**: On the Products page, `AddByBarcodeDialog` rendered the cart-oriented "AI Basket" tab, which is intended for POS checkout scanning rather than catalog product addition. Furthermore, selecting a visual match in this dialog did not open the product in Edit/Restock state.
- **Resolution**: Added `hideAiBasket` prop to `BarcodeCapture.jsx` with dynamic grid sizing (`grid-cols-2` vs `grid-cols-3`). In `AddByBarcodeDialog.jsx`, passed `hideAiBasket={true}` and provided `onProductSelect={(product) => { setLookupResult({ local_product: product }); setActiveBarcode(product.barcode || ''); setDialogState('already_in_store'); }}` so visual search matches open the product in Edit/Restock state instead of adding to a cart.
- **Status**: Fixed & verified.

### Finding F5-B: Gemini Vision Error Classification & Actionable Guidance
- **Severity**: Medium
- **File**: `backend/app/Ai/Exceptions/AiProviderException.php`, `backend/app/Ai/GeminiVisionProvider.php`, `backend/app/Console/Commands/AiPingCommand.php`
- **Problem**: When `GEMINI_API_KEY` was invalid (400/403), the model was decommissioned or not found (404), or free-tier quota was exceeded (429), `ai:ping` printed generic raw error strings without actionable next steps.
- **Resolution**: Upgraded `AiProviderException` to retain HTTP status codes. Categorized errors in `GeminiVisionProvider` into `quota_exceeded`, `model_not_found`, `invalid_key`, and `network_failure` with actionable recommendation messages. Added 5 Pest tests in `tests/Feature/AiPingCommandTest.php` faking each response.
- **Status**: Fixed & verified.

### Finding F5-C: Logout Cache and Storage Purge
- **Severity**: Medium
- **File**: `frontend/src/context/AuthContext.jsx`, `frontend/src/test/auth.test.jsx`
- **Problem**: Logging out cleared authentication tokens and cart store, but left in-memory visual search embeddings cache (`cachedIndex`) and mock/phone scanner session storage keys intact.
- **Resolution**: Updated `AuthContext.jsx` `clearSession` to invoke `invalidateVisualIndex()` and `terminateVisualWorker()`, and purged `tt-scanner-event`, `tindatrack_mock_scanner_sessions`, `tt_scanner_info`, and `tt_ai_review_queue`. Added automated assertions in `auth.test.jsx`.
- **Status**: Fixed & verified.

### Finding F5-D: Cashier Route & Navigation Guards
- **Severity**: Low
- **File**: `frontend/src/config/nav.js`, `frontend/src/components/layout/NavMain.jsx`, `frontend/src/components/layout/MoreSheet.jsx`, `frontend/src/routes/RoleRoute.jsx`
- **Problem**: Need verification that cashiers cannot access owner-only routes or see owner navigation elements.
- **Resolution**: Verified `nav.js` and `MoreSheet` filter all owner-only navigation (`/categories`, `/inventory`, `/reports`, `/staff`, `/settings`, `/ai-lab`) by ability. Verified `RoleRoute.jsx` automatically redirects unauthorized attempts to `/403`. Verified backend middleware `role:owner` enforces 403 on API routes.
- **Status**: Verified.

