<?php

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;

beforeEach(function () {
    $this->owner = User::factory()->owner()->create();
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;

    $this->cashier = User::factory()->create(['role' => UserRole::Cashier]);
    $this->cashierToken = $this->cashier->createToken('test')->plainTextToken;

    $this->category = Category::factory()->create();
});

test('owner can fetch store settings', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/settings');

    $response->assertStatus(200);
    $response->assertJsonStructure([
        'data' => [
            'id',
            'store_name',
            'store_tagline',
            'phone',
            'address',
        ],
    ]);
});

test('owner can update store settings', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->putJson('/api/settings', [
            'store_name' => 'Aling Nena Super Tindahan',
            'phone' => '0918-999-8888',
        ]);

    $response->assertStatus(200);
    expect($response->json('data.store_name'))->toBe('Aling Nena Super Tindahan');
    expect(Setting::first()->store_name)->toBe('Aling Nena Super Tindahan');
});

test('owner can update auto capture settings', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->putJson('/api/settings', [
            'auto_capture_basket' => false,
            'auto_capture_stockin' => true,
            'auto_capture_sensitivity' => 'high',
        ]);

    $response->assertStatus(200);
    expect($response->json('data.auto_capture_basket'))->toBeFalse();
    expect($response->json('data.auto_capture_stockin'))->toBeTrue();
    expect($response->json('data.auto_capture_sensitivity'))->toBe('high');

    $setting = Setting::first();
    expect($setting->auto_capture_basket)->toBeFalse();
    expect($setting->auto_capture_stockin)->toBeTrue();
    expect($setting->auto_capture_sensitivity)->toBe('high');
});

test('cashier cannot restore demo images', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/settings/restore-demo-images');

    $response->assertStatus(403);
});

test('owner can restore demo images without overwriting custom images', function () {
    // Product 1: matching SKU from products.json with null image_url
    $p1 = Product::factory()->create([
        'category_id' => $this->category->id,
        'sku' => 'TT-DRK-001',
        'image_url' => null,
    ]);

    // Product 2: matching SKU with existing custom image_url
    $p2 = Product::factory()->create([
        'category_id' => $this->category->id,
        'sku' => 'TT-DRK-002',
        'image_url' => 'https://example.com/custom.jpg',
    ]);

    // Product 3: unknown SKU with null image_url
    $p3 = Product::factory()->create([
        'category_id' => $this->category->id,
        'sku' => 'UNKNOWN-999',
        'image_url' => null,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/settings/restore-demo-images');

    $response->assertStatus(200);
    expect($response->json('updated'))->toBeGreaterThanOrEqual(1);

    $p1->refresh();
    $p2->refresh();
    $p3->refresh();

    expect($p1->image_url)->toBe('/demo-products/tt-drk-001.svg');
    expect($p2->image_url)->toBe('https://example.com/custom.jpg');
    expect($p3->image_url)->toBeNull();
});
