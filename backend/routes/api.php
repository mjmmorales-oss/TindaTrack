<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SaleController;
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

    // Categories (viewing is accessible to all active staff)
    Route::get('/categories', [CategoryController::class, 'index']);

    // Products (viewing catalog & low-stock list accessible to all staff)
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/low-stock', [ProductController::class, 'lowStock']);
    Route::get('/products/{product}', [ProductController::class, 'show']);

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

    // ==========================================
    // OWNER-ONLY PROTECTED ROUTES
    // ==========================================
    Route::middleware('role:owner')->group(function () {
        // Category management
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        // Product management & stock adjustment
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::post('/products/{product}/adjust', [ProductController::class, 'adjustStock']);

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
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);

        // Store settings
        Route::get('/settings', [SettingsController::class, 'get']);
        Route::put('/settings', [SettingsController::class, 'update']);
    });
});
