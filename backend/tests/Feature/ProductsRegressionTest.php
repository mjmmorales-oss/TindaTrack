<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

/**
 * v2.2 Phase C regressions: products / categories / inventory.
 */
beforeEach(function () {
    Http::fake();
    $this->owner = User::factory()->owner()->create();
    $this->auth = ['Authorization' => 'Bearer '.$this->owner->createToken('t')->plainTextToken];
    $this->category = Category::factory()->create();
});

test('the stock=in|low|out filter the UI sends reaches the query', function () {
    $out = Product::factory()->create(['category_id' => $this->category->id, 'stock_quantity' => 0, 'reorder_level' => 5]);
    $low = Product::factory()->create(['category_id' => $this->category->id, 'stock_quantity' => 3, 'reorder_level' => 5]);
    $in = Product::factory()->create(['category_id' => $this->category->id, 'stock_quantity' => 50, 'reorder_level' => 5]);

    $ids = fn (string $stock) => collect($this->withHeaders($this->auth)->getJson("/api/products?stock={$stock}")->json('data'))->pluck('id')->all();

    expect($ids('out'))->toBe([$out->id])
        ->and($ids('low'))->toBe([$low->id])
        ->and($ids('in'))->toBe([$in->id]);
});

test('units follow the shared list (AI Stock-In "box" is editable, junk is rejected)', function () {
    $base = ['name' => 'Tissue', 'category_id' => $this->category->id, 'price' => 10, 'cost_price' => 8];

    $id = $this->withHeaders($this->auth)->postJson('/api/products', $base + ['unit' => 'box'])->assertCreated()->json('data.id');
    $this->withHeaders($this->auth)->putJson("/api/products/{$id}", ['unit' => 'roll'])->assertOk();
    $this->withHeaders($this->auth)->postJson('/api/products', $base + ['unit' => 'banana'])
        ->assertStatus(422)->assertJsonValidationErrors('unit');
});

test('AI Stock-In crops can be uploaded with source=ai_crop', function () {
    $product = Product::factory()->create(['category_id' => $this->category->id]);

    $this->withHeaders($this->auth)
        ->post("/api/products/{$product->id}/image", [
            'image' => UploadedFile::fake()->image('crop.jpg', 200, 200),
            'source' => 'ai_crop',
        ], ['Accept' => 'application/json'])
        ->assertSuccessful();
});

test('deleting a category used only by archived products is a clear 422, not a 500', function () {
    Product::factory()->create(['category_id' => $this->category->id])->archive();

    $this->withHeaders($this->auth)->deleteJson("/api/categories/{$this->category->id}")
        ->assertStatus(422)
        ->assertJsonValidationErrors('category');
});

test('newer sortable columns are honoured', function () {
    Product::factory()->create(['category_id' => $this->category->id, 'cost_price' => 5]);
    Product::factory()->create(['category_id' => $this->category->id, 'cost_price' => 50]);

    $costs = collect($this->withHeaders($this->auth)->getJson('/api/products?sort=-cost_price')->json('data'))->pluck('cost_price')->all();
    expect($costs)->toEqual([50, 5]);
});
