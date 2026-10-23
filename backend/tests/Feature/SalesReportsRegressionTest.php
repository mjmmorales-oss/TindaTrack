<?php

use App\Enums\SaleStatus;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * v2.2 Phase C regressions: POS / sales / utang / reports flows.
 */
beforeEach(function () {
    $this->owner = User::factory()->owner()->create();
    $this->cashier = User::factory()->cashier()->create();
    $this->ownerAuth = ['Authorization' => 'Bearer '.$this->owner->createToken('t')->plainTextToken];
    $this->cashierAuth = ['Authorization' => 'Bearer '.$this->cashier->createToken('t')->plainTextToken];
    $this->product = Product::factory()->create([
        'category_id' => Category::factory()->create()->id,
        'price' => 25,
        'cost_price' => 20,
        'stock_quantity' => 3,
        'is_active' => true,
    ]);
});

afterEach(fn () => Carbon::setTestNow());

test('report and sales date filters use Manila days, not UTC', function () {
    // Manila wall-clock times (app timezone): one sale just before and one just after midnight
    Sale::factory()->create(['total_amount' => 100, 'amount_paid' => 100, 'created_at' => '2026-10-20 23:30:00']);
    Sale::factory()->create(['total_amount' => 40, 'amount_paid' => 40, 'created_at' => '2026-10-21 00:30:00']);

    // What the browser sends for "Oct 21" in Manila: 2026-10-20T16:00Z .. 2026-10-21T15:59Z
    $range = 'from='.urlencode('2026-10-20T16:00:00.000Z').'&to='.urlencode('2026-10-21T15:59:59.999Z');

    $this->withHeaders($this->ownerAuth)->getJson("/api/reports/sales?{$range}")
        ->assertOk()
        ->assertJsonPath('data.summary.total_sales', 40);

    $sales = $this->withHeaders($this->ownerAuth)->getJson("/api/sales?{$range}")->assertOk();
    expect($sales->json('data'))->toHaveCount(1)
        ->and($sales->json('summary.total_amount'))->toEqual(40);

    // Date-only values mean the whole Manila day
    $this->withHeaders($this->ownerAuth)->getJson('/api/reports/sales?from=2026-10-20&to=2026-10-20')
        ->assertJsonPath('data.summary.total_sales', 100);
});

test('sales list summary covers the filtered completed sales', function () {
    Sale::factory()->create(['total_amount' => 30, 'amount_paid' => 30]);
    Sale::factory()->create(['total_amount' => 70, 'amount_paid' => 70]);
    Sale::factory()->create(['total_amount' => 999, 'amount_paid' => 999, 'status' => SaleStatus::Voided]);

    $this->withHeaders($this->ownerAuth)->getJson('/api/sales?per_page=1')
        ->assertOk()
        ->assertJsonPath('summary.total_amount', 100)
        ->assertJsonPath('summary.total_count', 3)
        ->assertJsonPath('summary.average_sale', 50);
});

test('utang down payment above the total is rejected (it would lower the balance)', function () {
    $customer = Customer::factory()->create(['credit_balance' => 0, 'credit_limit' => 1000]);

    $this->withHeaders($this->ownerAuth)->postJson('/api/sales', [
        'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
        'payment_type' => 'utang',
        'customer_id' => $customer->id,
        'amount_paid' => 100,
    ])->assertStatus(422)->assertJsonValidationErrors('amount_paid');

    expect($customer->fresh()->credit_balance)->toEqual(0.0);
});

test('the same product on two cart lines cannot oversell', function () {
    $this->withHeaders($this->ownerAuth)->postJson('/api/sales', [
        'items' => [
            ['product_id' => $this->product->id, 'quantity' => 2],
            ['product_id' => $this->product->id, 'quantity' => 2],
        ],
        'payment_type' => 'cash',
        'amount_paid' => 1000,
    ])->assertStatus(422);

    expect($this->product->fresh()->stock_quantity)->toBe(3);
});

test('owner can override the credit limit; cashier cannot', function () {
    $customer = Customer::factory()->create(['credit_balance' => 0, 'credit_limit' => 10]);
    $payload = [
        'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
        'payment_type' => 'utang',
        'customer_id' => $customer->id,
        'amount_paid' => 0,
        'override_limit' => true,
    ];

    $this->withHeaders($this->cashierAuth)->postJson('/api/sales', $payload)->assertStatus(422);
    $this->app['auth']->forgetGuards(); // the guard caches the first user within one test
    $this->withHeaders($this->ownerAuth)->postJson('/api/sales', $payload)->assertCreated();
    expect($customer->fresh()->credit_balance)->toEqual(25.0);
});

test('voiding a sale returns stock even if the product was archived since', function () {
    $sale = $this->withHeaders($this->ownerAuth)->postJson('/api/sales', [
        'items' => [['product_id' => $this->product->id, 'quantity' => 2]],
        'payment_type' => 'cash',
        'amount_paid' => 100,
    ])->assertCreated()->json('data.id');

    $this->product->fresh()->archive();

    $this->withHeaders($this->ownerAuth)->postJson("/api/sales/{$sale}/void", ['reason' => 'Wrong item scanned'])
        ->assertOk();

    expect(Product::withTrashed()->find($this->product->id)->stock_quantity)->toBe(3);
});

test('customer list filters with_balance and over_limit reach the query', function () {
    $none = Customer::factory()->create(['credit_balance' => 0, 'credit_limit' => 500]);
    $some = Customer::factory()->create(['credit_balance' => 100, 'credit_limit' => 500]);
    $over = Customer::factory()->create(['credit_balance' => 800, 'credit_limit' => 500]);

    $withBalance = collect($this->withHeaders($this->ownerAuth)->getJson('/api/customers?with_balance=true')->json('data'))->pluck('id');
    expect($withBalance)->toContain($some->id, $over->id)->not->toContain($none->id);

    $overLimit = collect($this->withHeaders($this->ownerAuth)->getJson('/api/customers?over_limit=true')->json('data'))->pluck('id');
    expect($overLimit->all())->toBe([$over->id]);
});

test('cashier dashboard does not include store-wide sales', function () {
    Sale::factory()->create(['user_id' => $this->owner->id, 'total_amount' => 500, 'amount_paid' => 500]);

    $data = $this->withHeaders($this->cashierAuth)->getJson('/api/dashboard')->assertOk()->json('data');
    expect($data['kpis']['sales'])->toEqual(0)
        ->and($data['recent_sales'])->toBe([])
        ->and($data)->toHaveKeys(['cashier_shift', 'running_low']);
});
