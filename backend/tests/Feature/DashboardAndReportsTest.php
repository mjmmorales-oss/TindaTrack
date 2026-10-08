<?php

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;

beforeEach(function () {
    $this->owner = User::factory()->owner()->create();
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;

    $this->cashier = User::factory()->create(['role' => UserRole::Cashier]);
    $this->cashierToken = $this->cashier->createToken('test')->plainTextToken;

    $this->category = Category::factory()->create(['name' => 'Snacks Test', 'color' => '#F97316']);
    $this->product = Product::factory()->create([
        'category_id' => $this->category->id,
        'name' => 'Test Chips',
        'price' => 50.0,
        'cost_price' => 30.0,
        'stock_quantity' => 100,
    ]);
});

test('dashboard totals equal sales sum for the specified range', function () {
    Sale::factory()->create([
        'user_id' => $this->owner->id,
        'total_amount' => 100.0,
        'amount_paid' => 100.0,
        'payment_type' => PaymentType::Cash,
        'status' => SaleStatus::Completed,
        'created_at' => now(),
    ]);

    Sale::factory()->create([
        'user_id' => $this->cashier->id,
        'total_amount' => 250.0,
        'amount_paid' => 250.0,
        'payment_type' => PaymentType::Cash,
        'status' => SaleStatus::Completed,
        'created_at' => now(),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/dashboard?range=today');

    $response->assertStatus(200);
    $data = $response->json('data');

    // Expected sales: 100 + 250 = 350
    expect((float) $data['kpis']['sales'])->toEqual(350.0)
        ->and((int) $data['kpis']['transactions'])->toBe(2);
});

test('voided sales are excluded from dashboard totals and reports', function () {
    Sale::factory()->create([
        'user_id' => $this->owner->id,
        'total_amount' => 500.0,
        'amount_paid' => 500.0,
        'status' => SaleStatus::Completed,
        'created_at' => now(),
    ]);

    Sale::factory()->create([
        'user_id' => $this->owner->id,
        'total_amount' => 1000.0,
        'amount_paid' => 1000.0,
        'status' => SaleStatus::Voided,
        'created_at' => now(),
    ]);

    // Check dashboard
    $dashResponse = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/dashboard?range=today');

    $dashResponse->assertStatus(200);
    expect((float) $dashResponse->json('data.kpis.sales'))->toEqual(500.0)
        ->and((int) $dashResponse->json('data.kpis.transactions'))->toBe(1);

    // Check reports/sales
    $reportResponse = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/reports/sales');

    $reportResponse->assertStatus(200);
    expect((float) $reportResponse->json('data.summary.total_sales'))->toEqual(500.0)
        ->and((int) $reportResponse->json('data.summary.total_transactions'))->toBe(1);
});

test('report totals match sales summary aggregates', function () {
    $sale = Sale::factory()->create([
        'user_id' => $this->owner->id,
        'total_amount' => 150.0,
        'amount_paid' => 150.0,
        'payment_type' => PaymentType::Cash,
        'status' => SaleStatus::Completed,
        'created_at' => now(),
    ]);

    SaleItem::factory()->create([
        'sale_id' => $sale->id,
        'product_id' => $this->product->id,
        'quantity' => 3,
        'unit_price' => 50.0,
        'unit_cost' => 30.0,
        'subtotal' => 150.0,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/reports/sales');

    $response->assertStatus(200);
    $summary = $response->json('data.summary');

    expect((float) $summary['total_sales'])->toEqual(150.0)
        ->and((float) $summary['total_gross_profit'])->toEqual(60.0) // 150 - (3 * 30) = 60
        ->and((float) $summary['total_cash'])->toEqual(150.0)
        ->and((float) $summary['total_utang'])->toEqual(0.0)
        ->and((int) $summary['total_transactions'])->toBe(1);
});

test('cashier receives 403 on owner-only reports endpoints', function () {
    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/reports/sales')
        ->assertStatus(403);

    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/reports/best-sellers')
        ->assertStatus(403);

    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/reports/category-breakdown')
        ->assertStatus(403);

    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/reports/hourly')
        ->assertStatus(403);
});
