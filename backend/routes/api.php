<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\AiExperimentController;
use App\Http\Controllers\BarcodeLookupController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ProductBulkController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductEmbeddingController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\ScannerDeviceController;
use App\Http\Controllers\ScannerSessionController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UtangController;
use App\Http\Controllers\UtangPaymentController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => response()->json([
    'status' => 'ok',
    'app' => config('app.name'),
    'time' => now()->toIso8601String(),
]));

// Public binary product image stream
Route::get('/product-images/{ulid}', [ProductImageController::class, 'show']);

// Device-scoped scanner endpoints (phone client)
Route::prefix('scanner')->group(function () {
    Route::post('/pair', [ScannerDeviceController::class, 'pair'])
        ->middleware('throttle:10,1,scanner_pair');
    Route::post('/scans', [ScannerDeviceController::class, 'scan'])
        ->middleware(['scanner.device', 'throttle:120,1']);
    Route::post('/ai-basket', [ScannerDeviceController::class, 'aiBasket'])
        ->middleware(['scanner.device', 'throttle:30,1,scanner_ai_basket']);
    Route::post('/heartbeat', [ScannerDeviceController::class, 'heartbeat'])
        ->middleware('scanner.device');
});

require __DIR__.'/auth.php';

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    // Current user profile & account
    Route::get('/user', fn (Request $request) => new UserResource($request->user()));
    Route::put('/user/password', [AccountController::class, 'updatePassword']);

    // Ping / capability test routes
    Route::get('/owner/ping', fn () => ['message' => 'Hello, owner! Role middleware works.'])
        ->middleware('role:owner');
    Route::get('/staff/ping', fn () => ['message' => 'Hello, staff! Any active role can see this.'])
        ->middleware('role:owner,cashier');

    // Dashboard (accessible by both owner and cashier with role-specific views)
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Categories (viewing is accessible to all active staff)
    Route::get('/categories', [CategoryController::class, 'index']);

    // Products (viewing catalog & low-stock list accessible to all staff)
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/low-stock', [ProductController::class, 'lowStock']);
    Route::get('/products/embeddings', [ProductEmbeddingController::class, 'index'])
        ->middleware('role:owner,cashier');
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::get('/barcode-lookup/{barcode}', BarcodeLookupController::class)
        ->middleware(['role:owner,cashier', 'throttle:30,1']);

    // Customers (cashiers can view, create suki, and edit details during transactions)
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{customer}', [CustomerController::class, 'show']);
    Route::put('/customers/{customer}', [CustomerController::class, 'update']);
    Route::get('/customers/{customer}/ledger', [CustomerController::class, 'ledger']);

    // Sales (creating sales and viewing allowed sales)
    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{sale}', [SaleController::class, 'show']);

    // Utang & Payments (cashier can view debtors and record payments)
    Route::get('/utang/summary', [UtangController::class, 'summary']);
    Route::get('/utang/debtors', [UtangController::class, 'debtors']);
    Route::post('/utang-payments', [UtangPaymentController::class, 'store']);

    // Scanner sessions (phone pairing for POS and Inventory)
    Route::post('/scanner-sessions', [ScannerSessionController::class, 'store'])
        ->middleware('role:owner,cashier');
    Route::get('/scanner-sessions/{id}', [ScannerSessionController::class, 'show'])
        ->middleware('role:owner,cashier');
    Route::get('/scanner-sessions/{id}/events', [ScannerSessionController::class, 'events'])
        ->middleware('role:owner,cashier');
    Route::delete('/scanner-sessions/{id}', [ScannerSessionController::class, 'destroy'])
        ->middleware('role:owner,cashier');

    // AI vision & feedback (accessible by owner and cashier)
    Route::get('/ai/status', [AiController::class, 'status']);
    Route::post('/ai/basket-scan', [AiController::class, 'basketScan'])
        ->middleware(['role:owner,cashier', 'throttle:10,1']);
    Route::post('/ai/scans/{scan}/feedback', [AiController::class, 'feedback'])
        ->middleware(['role:owner,cashier', 'throttle:60,1']);

    // ==========================================
    // OWNER-ONLY PROTECTED ROUTES
    // ==========================================
    Route::middleware('role:owner')->group(function () {
        // AI vision management, intake scans, and metrics
        Route::post('/ai/product-scan', [AiController::class, 'productScan'])
            ->middleware('throttle:10,1');
        Route::get('/ai/scans', [AiController::class, 'indexScans']);
        Route::get('/ai/scans/{scan}/image', [AiController::class, 'showImage']);
        Route::get('/ai/metrics', [AiController::class, 'metrics']);
        Route::get('/ai/metrics/export.csv', [AiController::class, 'exportCsv']);

        // AI research experiments & evaluation runner
        Route::get('/ai/experiments', [AiExperimentController::class, 'index']);
        Route::post('/ai/experiments', [AiExperimentController::class, 'store']);
        Route::get('/ai/experiments/{experiment}', [AiExperimentController::class, 'show']);
        Route::post('/ai/experiments/{experiment}/cases', [AiExperimentController::class, 'storeCase'])
            ->middleware('throttle:30,1');
        Route::post('/ai/experiments/{experiment}/reset', [AiExperimentController::class, 'reset']);
        Route::get('/ai/experiments/{experiment}/export.csv', [AiExperimentController::class, 'exportCsv']);

        // Visual search embeddings & bulk intake
        Route::post('/products/{product}/embeddings', [ProductEmbeddingController::class, 'store']);
        Route::delete('/products/{product}/embeddings/{id}', [ProductEmbeddingController::class, 'destroy']);
        Route::post('/products/bulk', [ProductBulkController::class, 'bulk']);
        // Unknown barcodes
        Route::get('/scanner/unknown-barcodes', [ScannerSessionController::class, 'unknownBarcodes']);

        // Reports
        Route::get('/reports/sales', [ReportController::class, 'sales']);
        Route::get('/reports/best-sellers', [ReportController::class, 'bestSellers']);
        Route::get('/reports/category-breakdown', [ReportController::class, 'categoryBreakdown']);
        Route::get('/reports/hourly', [ReportController::class, 'hourly']);

        // Category management
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        // Product management & stock adjustment
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::post('/products/{product}/adjust', [ProductController::class, 'adjustStock']);
        Route::post('/products/{product}/image', [ProductImageController::class, 'upload']);
        Route::post('/products/{product}/image/import', [ProductImageController::class, 'import']);
        Route::delete('/products/{product}/image', [ProductImageController::class, 'destroy']);

        // Customer deletion
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);

        // Void sales
        Route::post('/sales/{sale}/void', [SaleController::class, 'void']);

        // Inventory overview, movement log, restock checklist
        Route::get('/inventory/overview', [InventoryController::class, 'overview']);
        Route::get('/inventory/movements', [InventoryController::class, 'movements']);
        Route::get('/inventory/restock-list', [InventoryController::class, 'restockList']);

        // Staff management
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{user}', [UserController::class, 'show'])->withTrashed();
        Route::patch('/users/{user}', [UserController::class, 'update'])->withTrashed();
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggleActive'])->withTrashed();
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->withTrashed();
        Route::post('/users/{user}/revoke-sessions', [UserController::class, 'revokeSessions'])->withTrashed();
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::post('/users/{user}/restore', [UserController::class, 'restore'])->withTrashed();

        // Store settings
        Route::get('/settings', [SettingsController::class, 'get']);
        Route::put('/settings', [SettingsController::class, 'update']);
        Route::post('/settings/restore-demo-images', [SettingsController::class, 'restoreDemoImages']);
    });
});
