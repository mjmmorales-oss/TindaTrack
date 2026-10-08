<?php

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;

beforeEach(function () {
    $this->owner = User::factory()->owner()->create();
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;

    $this->cashier = User::factory()->create(['role' => UserRole::Cashier]);
    $this->cashierToken = $this->cashier->createToken('test')->plainTextToken;

    $this->category = Category::factory()->create();
    $this->product = Product::factory()->create(['category_id' => $this->category->id]);
    $this->customer = Customer::factory()->create();
});

test('inactive user is blocked by active middleware on protected endpoints', function () {
    $inactiveUser = User::factory()->create([
        'role' => UserRole::Cashier,
        'is_active' => false,
    ]);
    $token = $inactiveUser->createToken('test')->plainTextToken;

    $this->withHeader('Authorization', "Bearer $token")
        ->getJson('/api/products')
        ->assertStatus(403);
});

test('cashier receives 403 on owner-only routes', function () {
    $routes = [
        ['postJson', '/api/categories', ['name' => 'New Cat']],
        ['postJson', '/api/products', ['name' => 'New Prod']],
        ['deleteJson', "/api/customers/{$this->customer->id}", []],
        ['getJson', '/api/inventory/overview', []],
        ['getJson', '/api/inventory/movements', []],
        ['getJson', '/api/inventory/restock-list', []],
        ['getJson', '/api/users', []],
        ['getJson', '/api/settings', []],
    ];

    foreach ($routes as [$method, $uri, $payload]) {
        $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
            ->{$method}($uri, $payload);

        $response->assertStatus(403);
    }
});

test('cashier sees only own sales in sales listing and is forbidden from viewing other sales', function () {
    $ownerSale = Sale::factory()->create([
        'user_id' => $this->owner->id,
        'total_amount' => 100,
        'amount_paid' => 100,
        'created_at' => now(),
    ]);

    $cashierSale = Sale::factory()->create([
        'user_id' => $this->cashier->id,
        'total_amount' => 200,
        'amount_paid' => 200,
        'created_at' => now(),
    ]);

    // Cashier list
    $listResponse = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/sales');

    $listResponse->assertStatus(200);
    $items = $listResponse->json('data');
    expect($items)->toHaveCount(1)
        ->and($items[0]['id'])->toBe($cashierSale->id);

    // Cashier viewing owner sale directly -> 403
    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson("/api/sales/{$ownerSale->id}")
        ->assertStatus(403);

    // Cashier viewing own sale -> 200
    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson("/api/sales/{$cashierSale->id}")
        ->assertStatus(200);
});

test('staff management prevents deactivating self and prevents deactivating last active owner', function () {
    // 1. Owner trying to deactivate self -> 422
    $responseSelf = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->patchJson("/api/users/{$this->owner->id}/toggle-active");

    $responseSelf->assertStatus(422)
        ->assertJsonValidationErrors(['user']);

    // 2. Owner trying to deactivate the ONLY active owner -> 422
    // Currently only $this->owner is an active owner. Let's verify.
    $secondCashier = User::factory()->create(['role' => UserRole::Cashier, 'is_active' => true]);

    $responseLastOwner = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->patchJson("/api/users/{$this->owner->id}/toggle-active");
    $responseLastOwner->assertStatus(422);

    // 3. Deactivating a cashier succeeds and revokes cashier tokens
    $cashierPersonalToken = $secondCashier->createToken('cashier-session')->plainTextToken;
    expect($secondCashier->tokens()->count())->toBe(1);

    $toggleResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->patchJson("/api/users/{$secondCashier->id}/toggle-active");

    $toggleResp->assertStatus(200);
    expect($secondCashier->fresh()->is_active)->toBeFalse()
        ->and($secondCashier->fresh()->tokens()->count())->toBe(0);
});
