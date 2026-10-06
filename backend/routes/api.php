<?php

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
    Route::get('/user', fn (Request $request) => new UserResource($request->user()));

    // Middleware demo endpoints (used by the Phase 1 dashboard)
    Route::get('/owner/ping', fn () => ['message' => 'Hello, owner! Role middleware works.'])
        ->middleware('role:owner');
    Route::get('/staff/ping', fn () => ['message' => 'Hello, staff! Any active role can see this.'])
        ->middleware('role:owner,cashier');
});
