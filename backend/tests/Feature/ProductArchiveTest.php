<?php

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Http::fake();

    $this->owner = User::factory()->create(['role' => UserRole::Owner, 'is_active' => true]);
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;
    $this->cashier = User::factory()->create(['role' => UserRole::Cashier, 'is_active' => true]);
    $this->cashierToken = $this->cashier->createToken('test')->plainTextToken;
    $this->category = Category::factory()->create(['name' => 'Drinks']);
});

function productPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Royal Tru Orange 330ml',
        'barcode' => '4801981118502',
        'sku' => 'TT-DRK-901',
        'category_id' => test()->category->id,
        'price' => 25,
        'cost_price' => 20,
        'stock_quantity' => 5,
    ], $overrides);
}

test('a deleted product frees its barcode and SKU so they can be reused', function () {
    $auth = ['Authorization' => "Bearer {$this->ownerToken}"];

    $first = $this->withHeaders($auth)->postJson('/api/products', productPayload())->assertCreated();
    $id = $first->json('data.id');

    $this->withHeaders($auth)->deleteJson("/api/products/{$id}")->assertOk();

    $trashed = Product::withTrashed()->find($id);
    expect($trashed->trashed())->toBeTrue()
        ->and($trashed->barcode)->toBeNull()
        ->and($trashed->sku)->toBeNull()
        ->and($trashed->deleted_barcode)->toBe('4801981118502')
        ->and($trashed->deleted_sku)->toBe('TT-DRK-901');

    $this->withHeaders($auth)->postJson('/api/products', productPayload(['name' => 'Royal (new)']))
        ->assertCreated()
        ->assertJsonPath('data.barcode', '4801981118502')
        ->assertJsonPath('data.sku', 'TT-DRK-901');
});

test('bulk create also accepts the barcode of a deleted product', function () {
    $old = Product::factory()->create(['barcode' => '4801981118502', 'category_id' => $this->category->id]);
    $old->archive();

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/products/bulk', ['products' => [[
            'name' => 'Royal', 'barcode' => '4801981118502', 'category_id' => $this->category->id,
            'price' => 25, 'stock_quantity' => 1,
        ]]])
        ->assertSuccessful();
});

test('lookup on a deleted barcode reports the archived product', function () {
    $old = Product::factory()->create(['name' => 'Old Royal', 'barcode' => '4801981118502', 'category_id' => $this->category->id]);
    $old->archive();

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/barcode-lookup/4801981118502')
        ->assertOk()
        ->assertJsonPath('data.local_product', null)
        ->assertJsonPath('data.archived_product.id', $old->id)
        ->assertJsonPath('data.archived_product.archived', true)
        ->assertJsonPath('data.archived_product.deleted_barcode', '4801981118502');
});

test('owner can restore an archived product and gets its barcode back', function () {
    $old = Product::factory()->create(['barcode' => '4801981118502', 'sku' => 'TT-DRK-777', 'category_id' => $this->category->id]);
    $old->archive();

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$old->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.id', $old->id)
        ->assertJsonPath('data.archived', false)
        ->assertJsonPath('data.barcode', '4801981118502')
        ->assertJsonPath('data.sku', 'TT-DRK-777')
        ->assertJsonPath('barcode_restored', true);

    expect(Product::find($old->id))->not->toBeNull();
});

test('restore leaves the barcode empty when a new product already uses it', function () {
    $old = Product::factory()->create(['barcode' => '4801981118502', 'sku' => 'TT-DRK-777', 'category_id' => $this->category->id]);
    $old->archive();
    Product::factory()->create(['barcode' => '4801981118502', 'sku' => 'TT-DRK-777', 'category_id' => $this->category->id]);

    $res = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$old->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.barcode', null)
        ->assertJsonPath('barcode_restored', false)
        ->assertJsonPath('sku_restored', false);

    expect($res->json('data.sku'))->not->toBe('TT-DRK-777')->not->toBeNull();
});

test('cashier cannot restore or list archived products', function () {
    $old = Product::factory()->create(['category_id' => $this->category->id]);
    $old->archive();

    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson("/api/products/{$old->id}/restore")
        ->assertForbidden();

    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/products?archived=1')
        ->assertForbidden();
});

test('owner can list archived products', function () {
    $live = Product::factory()->create(['category_id' => $this->category->id]);
    $old = Product::factory()->create(['category_id' => $this->category->id]);
    $old->archive();

    $res = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/products?archived=1')
        ->assertOk();

    $ids = collect($res->json('data'))->pluck('id');
    expect($ids)->toContain($old->id)->not->toContain($live->id);
});
