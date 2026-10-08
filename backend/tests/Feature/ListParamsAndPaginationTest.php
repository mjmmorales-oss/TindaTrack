<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;

beforeEach(function () {
    $this->owner = User::factory()->owner()->create();
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;

    $this->catSnacks = Category::factory()->create(['name' => 'Snacks']);
    $this->catDrinks = Category::factory()->create(['name' => 'Drinks']);

    Product::factory()->create([
        'category_id' => $this->catSnacks->id,
        'name' => 'Chippy BBQ',
        'sku' => 'CHIP-001',
        'barcode' => '480001',
        'price' => 20.0,
        'is_active' => true,
    ]);

    Product::factory()->create([
        'category_id' => $this->catSnacks->id,
        'name' => 'Piattos Cheese',
        'sku' => 'PIAT-002',
        'barcode' => '480002',
        'price' => 35.0,
        'is_active' => true,
    ]);

    Product::factory()->create([
        'category_id' => $this->catDrinks->id,
        'name' => 'Coke 1.5L',
        'sku' => 'COKE-003',
        'barcode' => '480003',
        'price' => 70.0,
        'is_active' => false,
    ]);
});

test('list endpoint supports search by q matching name, sku, or barcode', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/products?q=Chippy');

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data)->toHaveCount(1);
    expect($data[0]['name'])->toBe('Chippy BBQ');

    // SKU search
    $skuResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/products?q=PIAT-002');
    expect($skuResp->json('data'))->toHaveCount(1);
    expect($skuResp->json('data.0.sku'))->toBe('PIAT-002');
});

test('list endpoint filters by exact matches', function () {
    // Filter by category_id
    $catResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/products?category_id={$this->catDrinks->id}");
    expect($catResp->json('data'))->toHaveCount(1);
    expect($catResp->json('data.0.name'))->toBe('Coke 1.5L');

    // Filter by is_active=false
    $activeResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/products?is_active=0');
    expect($activeResp->json('data'))->toHaveCount(1);
    expect($activeResp->json('data.0.name'))->toBe('Coke 1.5L');
});

test('list endpoint sorts ascending and descending with hyphen prefix', function () {
    // Ascending price
    $ascResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/products?sort=price');
    $prices = collect($ascResp->json('data'))->pluck('price')->all();
    expect($prices)->toEqual([20, 35, 70]);

    // Descending price (-price)
    $descResp = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/products?sort=-price');
    $descPrices = collect($descResp->json('data'))->pluck('price')->all();
    expect($descPrices)->toEqual([70, 35, 20]);
});

test('list endpoint returns standard Laravel paginator structure with links and meta', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/products?per_page=2&page=1');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data',
            'links' => ['first', 'last', 'prev', 'next'],
            'meta' => [
                'current_page',
                'from',
                'last_page',
                'per_page',
                'to',
                'total',
            ],
        ]);

    $meta = $response->json('meta');
    expect($meta['current_page'])->toBe(1);
    expect($meta['per_page'])->toBe(2);
    expect($meta['total'])->toBe(3);
    expect($meta['last_page'])->toBe(2);
    expect($meta['from'])->toBe(1);
    expect($meta['to'])->toBe(2);
});

test('422 validation errors match Laravel shape with message and field errors array', function () {
    // Missing required fields when creating product
    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/products', []);

    $response->assertStatus(422)
        ->assertJsonStructure([
            'message',
            'errors' => [
                'name',
                'category_id',
                'price',
                'cost_price',
            ],
        ]);

    expect(is_string($response->json('message')))->toBeTrue();
    expect(is_array($response->json('errors.name')))->toBeTrue();
});
