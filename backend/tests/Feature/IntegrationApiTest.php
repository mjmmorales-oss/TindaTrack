<?php

/*
 * CIT 305 - Integration tests for the Inventory Integration API
 * (System 1 TindaOrder  ->  System 2 TindaTrack).
 * Test IDs match the Final Project Document (TC-01 ... TC-10).
 */

use App\Enums\StockMovementType;
use App\Models\Category;
use App\Models\IntegrationOrder;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;

const TEST_API_KEY = 'test_integration_key_123';

beforeEach(function () {
    config(['services.integration.api_key' => TEST_API_KEY]);

    $this->owner = User::factory()->owner()->create();
    $this->category = Category::factory()->create(['name' => 'Beverages']);

    $this->coke = Product::factory()->create([
        'category_id' => $this->category->id,
        'name' => 'Coca-Cola Mismo 295ml',
        'price' => 25.0,
        'stock_quantity' => 20,
        'reorder_level' => 12,
        'is_active' => true,
    ]);

    $this->c2 = Product::factory()->create([
        'category_id' => $this->category->id,
        'name' => 'C2 Green Tea Apple 230ml',
        'price' => 20.0,
        'stock_quantity' => 3,
        'reorder_level' => 10,
        'is_active' => true,
    ]);

    $this->headers = ['X-API-Key' => TEST_API_KEY, 'Accept' => 'application/json'];
});

function orderPayload(array $overrides = []): array
{
    return array_merge([
        'order_id' => 'ORD-20261019-0001',
        'customer_id' => 'CUST-001',
        'items' => [],
    ], $overrides);
}

test('TC-01 valid order is accepted, stock is deducted and the response returns available quantity and status', function () {
    $response = $this->postJson('/api/integration/v1/orders', orderPayload([
        'items' => [['product_id' => $this->coke->id, 'quantity' => 2]],
    ]), $this->headers);

    $response->assertCreated()
        ->assertJsonPath('order_id', 'ORD-20261019-0001')
        ->assertJsonPath('customer_id', 'CUST-001')
        ->assertJsonPath('status', 'accepted')
        ->assertJsonPath('items.0.product_id', $this->coke->id)
        ->assertJsonPath('items.0.available_quantity', 18)
        ->assertJsonPath('items.0.stock_status', 'in_stock')
        ->assertJsonPath('total_amount', 50);

    expect($this->coke->fresh()->stock_quantity)->toBe(18);

    $movement = StockMovement::where('reference', 'ORD-20261019-0001')->first();
    expect($movement)->not->toBeNull()
        ->and($movement->type)->toBe(StockMovementType::Sale)
        ->and($movement->quantity)->toBe(-2)
        ->and($movement->stock_after)->toBe(18);

    expect(IntegrationOrder::where('order_id', 'ORD-20261019-0001')->exists())->toBeTrue();
});

test('TC-02 order with insufficient stock is rejected with 409 and nothing is deducted', function () {
    $response = $this->postJson('/api/integration/v1/orders', orderPayload([
        'items' => [
            ['product_id' => $this->coke->id, 'quantity' => 1],
            ['product_id' => $this->c2->id, 'quantity' => 5],
        ],
    ]), $this->headers);

    $response->assertStatus(409)
        ->assertJsonPath('status', 'rejected')
        ->assertJsonPath('items.1.product_id', $this->c2->id)
        ->assertJsonPath('items.1.available_quantity', 3)
        ->assertJsonPath('items.1.stock_status', 'insufficient_stock');

    // All-or-nothing: the valid line was NOT deducted either.
    expect($this->coke->fresh()->stock_quantity)->toBe(20)
        ->and($this->c2->fresh()->stock_quantity)->toBe(3)
        ->and(StockMovement::count())->toBe(0)
        ->and(IntegrationOrder::count())->toBe(0);
});

test('TC-03 missing required fields return 422 with field errors', function () {
    $this->postJson('/api/integration/v1/orders', [
        'items' => [['product_id' => $this->coke->id]],
    ], $this->headers)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['order_id', 'customer_id', 'items.0.quantity']);
});

test('TC-04 invalid data (negative quantity, unknown product) returns 422', function () {
    $this->postJson('/api/integration/v1/orders', orderPayload([
        'items' => [
            ['product_id' => 99999, 'quantity' => 1],
            ['product_id' => $this->coke->id, 'quantity' => -3],
        ],
    ]), $this->headers)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['items.0.product_id', 'items.1.quantity']);

    expect($this->coke->fresh()->stock_quantity)->toBe(20);
});

test('TC-05 missing or wrong API key returns 401', function () {
    $this->getJson('/api/integration/v1/products')
        ->assertUnauthorized()
        ->assertJsonPath('error', 'invalid_api_key');

    $this->getJson('/api/integration/v1/products', ['X-API-Key' => 'wrong-key'])
        ->assertUnauthorized();
});

test('TC-06 stock check returns product id, available quantity and stock status', function () {
    $this->getJson("/api/integration/v1/products/{$this->c2->id}/stock", $this->headers)
        ->assertOk()
        ->assertJsonPath('product_id', $this->c2->id)
        ->assertJsonPath('available_quantity', 3)
        ->assertJsonPath('stock_status', 'low_stock');
});

test('TC-07 stock check for a non-existent product returns 404', function () {
    $this->getJson('/api/integration/v1/products/99999/stock', $this->headers)
        ->assertNotFound()
        ->assertJsonPath('error', 'product_not_found');
});

test('TC-08 duplicate order_id is not processed twice (idempotency)', function () {
    $payload = orderPayload(['items' => [['product_id' => $this->coke->id, 'quantity' => 4]]]);

    $this->postJson('/api/integration/v1/orders', $payload, $this->headers)->assertCreated();
    $this->postJson('/api/integration/v1/orders', $payload, $this->headers)
        ->assertOk()
        ->assertJsonPath('duplicate', true)
        ->assertJsonPath('status', 'accepted');

    expect($this->coke->fresh()->stock_quantity)->toBe(16)
        ->and(StockMovement::where('reference', 'ORD-20261019-0001')->count())->toBe(1);
});

test('TC-09 catalog lists active products with live stock for the ordering system', function () {
    Product::factory()->create([
        'category_id' => $this->category->id,
        'name' => 'Hidden Inactive Item',
        'is_active' => false,
    ]);

    $this->getJson('/api/integration/v1/products', $this->headers)
        ->assertOk()
        ->assertJsonPath('meta.count', 2)
        ->assertJsonStructure(['data' => [['product_id', 'sku', 'name', 'price', 'available_quantity', 'stock_status']]]);
});

test('TC-10 stock check can be returned as XML', function () {
    $response = $this->get("/api/integration/v1/products/{$this->coke->id}/stock?format=xml", $this->headers);

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('application/xml');

    $xml = simplexml_load_string($response->getContent());
    expect((int) $xml->ProductID)->toBe($this->coke->id)
        ->and((int) $xml->AvailableQuantity)->toBe(20)
        ->and((string) $xml->StockStatus)->toBe('in_stock');
});

test('order lookup returns the stored result or 404', function () {
    $this->postJson('/api/integration/v1/orders', orderPayload([
        'items' => [['product_id' => $this->coke->id, 'quantity' => 1]],
    ]), $this->headers)->assertCreated();

    $this->getJson('/api/integration/v1/orders/ORD-20261019-0001', $this->headers)
        ->assertOk()
        ->assertJsonPath('status', 'accepted');

    $this->getJson('/api/integration/v1/orders/ORD-NOPE', $this->headers)
        ->assertNotFound();
});

test('integration API calls do not use up the staff login rate limit', function () {
    // TindaOrder and the staff browser share one IP on the demo laptop.
    foreach (range(1, 12) as $i) {
        $this->getJson('/api/integration/v1/products', $this->headers)->assertOk();
    }

    $this->postJson('/api/login', ['email' => 'nobody@example.test', 'password' => 'wrong-password'])
        ->assertStatus(422);
});
