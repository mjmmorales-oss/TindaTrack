<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->owner = User::factory()->owner()->create();
    $this->token = $this->owner->createToken('test')->plainTextToken;
    $this->headers = [
        'Authorization' => "Bearer {$this->token}",
        'Accept' => 'application/json',
    ];
});

test('product store auto-generates TT-CAT-NNN sku when sku is omitted', function () {
    $snackCategory = Category::where('code', 'SNA')->first();

    $response = $this->withHeaders($this->headers)->postJson('/api/products', [
        'name' => 'Koko Krunch Mini',
        'category_id' => $snackCategory->id,
        'unit' => 'pc',
        'price' => 15.00,
        'cost_price' => 12.00,
        'stock_quantity' => 10,
    ]);

    $response->assertCreated();
    $sku = $response->json('data.sku');

    expect($sku)->toMatch('/^TT-SNA-\d{3,}$/');
    expect($response->json('data.name'))->toBe('Koko Krunch Mini');
});

test('consecutive product creations auto-increment sku numeric suffix', function () {
    $drinkCategory = Category::where('code', 'DRK')->first();

    $res1 = $this->withHeaders($this->headers)->postJson('/api/products', [
        'name' => 'Test Drink Alpha',
        'category_id' => $drinkCategory->id,
        'unit' => 'pc',
        'price' => 20.00,
        'cost_price' => 15.00,
        'stock_quantity' => 5,
    ]);
    $res1->assertCreated();
    $sku1 = $res1->json('data.sku');

    $res2 = $this->withHeaders($this->headers)->postJson('/api/products', [
        'name' => 'Test Drink Beta',
        'category_id' => $drinkCategory->id,
        'unit' => 'pc',
        'price' => 25.00,
        'cost_price' => 18.00,
        'stock_quantity' => 5,
    ]);
    $res2->assertCreated();
    $sku2 = $res2->json('data.sku');

    preg_match('/^TT-DRK-(\d+)$/', $sku1, $m1);
    preg_match('/^TT-DRK-(\d+)$/', $sku2, $m2);

    expect((int) $m2[1])->toBe((int) $m1[1] + 1);
});

test('product store keeps custom sku when provided', function () {
    $cat = Category::first();

    $response = $this->withHeaders($this->headers)->postJson('/api/products', [
        'name' => 'Custom Item',
        'sku' => 'CUSTOM-SKU-999',
        'category_id' => $cat->id,
        'unit' => 'pc',
        'price' => 50.00,
        'cost_price' => 40.00,
        'stock_quantity' => 2,
    ]);

    $response->assertCreated();
    expect($response->json('data.sku'))->toBe('CUSTOM-SKU-999');
});

test('product store rejects duplicate sku with 422', function () {
    $existing = Product::first();

    $response = $this->withHeaders($this->headers)->postJson('/api/products', [
        'name' => 'Colliding Item',
        'sku' => $existing->sku,
        'category_id' => $existing->category_id,
        'unit' => 'pc',
        'price' => 10.00,
        'cost_price' => 5.00,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['sku']);
});

test('product update preserves existing sku when empty string is submitted', function () {
    $product = Product::first();
    $originalSku = $product->sku;

    $response = $this->withHeaders($this->headers)->putJson("/api/products/{$product->id}", [
        'name' => 'Renamed Product',
        'sku' => '',
    ]);

    $response->assertOk();
    $product->refresh();
    expect($product->sku)->toBe($originalSku);
    expect($product->name)->toBe('Renamed Product');
});

test('bulk product intake generates valid skus using SkuGenerator', function () {
    $snackCat = Category::where('code', 'SNA')->first();

    $response = $this->withHeaders($this->headers)->postJson('/api/products/bulk', [
        'products' => [
            [
                'name' => 'Bulk Item One',
                'category_id' => $snackCat->id,
                'price' => 10,
                'cost_price' => 8,
                'stock_quantity' => 5,
            ],
            [
                'name' => 'Bulk Item Two',
                'category_id' => $snackCat->id,
                'price' => 12,
                'cost_price' => 9,
                'stock_quantity' => 10,
            ],
        ],
    ]);

    $response->assertCreated();
    $data = $response->json('data');
    expect($data)->toHaveCount(2);
    expect($data[0]['sku'])->toMatch('/^TT-SNA-\d{3,}$/');
    expect($data[1]['sku'])->toMatch('/^TT-SNA-\d{3,}$/');
    expect($data[0]['sku'])->not->toBe($data[1]['sku']);
});
