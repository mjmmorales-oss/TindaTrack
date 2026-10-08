<?php

use App\Actions\CreateSaleAction;
use App\Enums\StockMovementType;
use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->owner = User::factory()->owner()->create();
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;

    $this->cashier = User::factory()->create(['role' => UserRole::Cashier]);
    $this->cashierToken = $this->cashier->createToken('test')->plainTextToken;

    $this->category = Category::factory()->create(['name' => 'Beverages']);
    $this->product = Product::factory()->create([
        'category_id' => $this->category->id,
        'name' => 'Royal Tru-Orange',
        'price' => 25.0,
        'cost_price' => 20.0,
        'stock_quantity' => 15,
        'is_active' => true,
    ]);

    $this->customer = Customer::factory()->create([
        'name' => 'Maria Santos',
        'credit_limit' => 500.0,
        'credit_balance' => 0.0,
    ]);
});

test('cash sale happy path decrements stock, records movement, generates sale number, and returns change', function () {
    $payload = [
        'items' => [
            ['product_id' => $this->product->id, 'quantity' => 3],
        ],
        'payment_type' => 'cash',
        'amount_paid' => 100.0, // 3 * 25 = 75 total, change = 25
    ];

    $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/sales', $payload);

    $response->assertStatus(201);
    $data = $response->json('data');

    expect((float) $data['total_amount'])->toEqual(75.0)
        ->and((float) $data['change_amount'])->toEqual(25.0)
        ->and($data['status'])->toBe('completed')
        ->and($data['sale_no'])->toMatch('/^TT-\d{8}-\d{4}$/');

    // Check product stock decremented
    expect($this->product->fresh()->stock_quantity)->toBe(12);

    // Check stock movement logged
    $movement = StockMovement::where('product_id', $this->product->id)->latest('id')->first();
    expect($movement)->not->toBeNull()
        ->and($movement->type)->toBe(StockMovementType::Sale)
        ->and($movement->quantity)->toBe(-3)
        ->and($movement->stock_after)->toBe(12)
        ->and($movement->user_id)->toBe($this->cashier->id);
});

test('oversell is rejected with 422 and stock remains completely unchanged', function () {
    $initialStock = $this->product->stock_quantity; // 15

    $payload = [
        'items' => [
            ['product_id' => $this->product->id, 'quantity' => 20], // exceeds 15
        ],
        'payment_type' => 'cash',
        'amount_paid' => 500.0,
    ];

    $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/sales', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['items.0.quantity']);

    // Stock unchanged
    expect($this->product->fresh()->stock_quantity)->toBe($initialStock);
});

test('utang sale increases customer credit balance', function () {
    $payload = [
        'items' => [
            ['product_id' => $this->product->id, 'quantity' => 4], // 4 * 25 = 100
        ],
        'payment_type' => 'utang',
        'amount_paid' => 0.0,
        'customer_id' => $this->customer->id,
    ];

    $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/sales', $payload);

    $response->assertStatus(201);
    expect((float) $this->customer->fresh()->credit_balance)->toEqual(100.0);
});

test('credit limit blocks cashier from overselling debt but owner can override', function () {
    $this->customer->update(['credit_limit' => 100.0, 'credit_balance' => 80.0]);

    // Cashier attempt that pushes balance to 80 + 50 = 130 > 100
    $payload = [
        'items' => [
            ['product_id' => $this->product->id, 'quantity' => 2], // 50 total
        ],
        'payment_type' => 'utang',
        'amount_paid' => 0.0,
        'customer_id' => $this->customer->id,
    ];

    // Cashier blocked -> 422
    $cashierResp = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/sales', $payload);

    $cashierResp->assertStatus(422)
        ->assertJsonValidationErrors(['credit_limit']);

    // Owner with override_limit succeeds
    auth()->forgetGuards();
    $ownerResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/sales', $payload + ['override_limit' => true]);

    $ownerResp->assertStatus(201);
    expect((float) $this->customer->fresh()->credit_balance)->toEqual(130.0);
});

test('void sale restores stock and reverses utang balance and cannot run twice', function () {
    // 1. Create utang sale
    $sale = (new CreateSaleAction)->execute(
        cashier: $this->cashier,
        cartItems: [['product_id' => $this->product->id, 'quantity' => 2]], // stock 15 -> 13
        payment: ['payment_type' => 'utang', 'customer_id' => $this->customer->id, 'amount_paid' => 0]
    );

    expect($this->product->fresh()->stock_quantity)->toBe(13)
        ->and((float) $this->customer->fresh()->credit_balance)->toEqual(50.0);

    // 2. Void sale as owner
    $voidResponse = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/sales/{$sale->id}/void", ['reason' => 'Customer changed mind and returned goods']);

    $voidResponse->assertStatus(200);

    // Stock restored
    expect($this->product->fresh()->stock_quantity)->toBe(15);
    // Utang balance reversed
    expect((float) $this->customer->fresh()->credit_balance)->toEqual(0.0);

    // 3. Voiding a second time fails with 422
    $secondVoid = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/sales/{$sale->id}/void", ['reason' => 'Duplicate void attempt']);

    $secondVoid->assertStatus(422)
        ->assertJsonValidationErrors(['sale']);
});

test('utang payment reduces customer balance and rejects amounts exceeding balance', function () {
    $this->customer->update(['credit_balance' => 200.0]);

    // Exceeding amount -> 422
    $excessResp = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/utang-payments', [
            'customer_id' => $this->customer->id,
            'amount' => 250.0,
        ]);

    $excessResp->assertStatus(422)
        ->assertJsonValidationErrors(['amount']);

    // Valid payment -> 201
    $validResp = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/utang-payments', [
            'customer_id' => $this->customer->id,
            'amount' => 120.0,
            'notes' => 'Partial cash payment',
        ]);

    $validResp->assertStatus(201);
    expect((float) $this->customer->fresh()->credit_balance)->toEqual(80.0);
});

test('delete guards block category with products and customer with debt', function () {
    // 1. Category with products -> 422
    $catResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->deleteJson("/api/categories/{$this->category->id}");

    $catResp->assertStatus(422)
        ->assertJsonValidationErrors(['category']);

    // 2. Customer with balance > 0 -> 422
    $this->customer->update(['credit_balance' => 150.0]);

    $custResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->deleteJson("/api/customers/{$this->customer->id}");

    $custResp->assertStatus(422)
        ->assertJsonValidationErrors(['credit_balance']);

    // 3. Product delete is soft delete
    $prodResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->deleteJson("/api/products/{$this->product->id}");

    $prodResp->assertStatus(200);
    expect(Product::find($this->product->id))->toBeNull()
        ->and(Product::withTrashed()->find($this->product->id))->not->toBeNull();
});

test('stock adjustment cannot result in negative stock', function () {
    $this->product->update(['stock_quantity' => 5]);

    // Damage 10 units when only 5 exist -> 422
    $resp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$this->product->id}/adjust", [
            'type' => 'damage',
            'quantity' => 10,
            'notes' => 'Expired stock',
        ]);

    $resp->assertStatus(422)
        ->assertJsonValidationErrors(['quantity']);

    // Valid restock of 20 units -> 200
    $restockResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$this->product->id}/adjust", [
            'type' => 'restock',
            'quantity' => 20,
            'notes' => 'New delivery delivery received',
        ]);

    $restockResp->assertStatus(200);
    expect($this->product->fresh()->stock_quantity)->toBe(25);
});

test('sale numbers restart daily and stay sequential', function () {
    // Sale today
    $sale1 = (new CreateSaleAction)->execute(
        cashier: $this->cashier,
        cartItems: [['product_id' => $this->product->id, 'quantity' => 1]],
        payment: ['payment_type' => 'cash', 'amount_paid' => 50]
    );

    $sale2 = (new CreateSaleAction)->execute(
        cashier: $this->cashier,
        cartItems: [['product_id' => $this->product->id, 'quantity' => 1]],
        payment: ['payment_type' => 'cash', 'amount_paid' => 50]
    );

    $todayPrefix = Carbon::now('Asia/Manila')->format('Ymd');
    expect($sale1->sale_no)->toBe("TT-{$todayPrefix}-0001")
        ->and($sale2->sale_no)->toBe("TT-{$todayPrefix}-0002");
});

test('account password update verifies current password and saves confirmed password', function () {
    // Incorrect current password -> 422
    $failResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->putJson('/api/user/password', [
            'current_password' => 'wrong-pass',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ]);

    $failResp->assertStatus(422)
        ->assertJsonValidationErrors(['current_password']);

    // Correct current password -> 200
    $successResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->putJson('/api/user/password', [
            'current_password' => 'password', // default factory password
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ]);

    $successResp->assertStatus(200);
    expect(Hash::check('new-secret-123', $this->owner->fresh()->password))->toBeTrue();
});
