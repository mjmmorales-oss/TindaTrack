<?php

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->owner = User::factory()->owner()->create();
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;

    $this->cashier = User::factory()->create(['role' => UserRole::Cashier]);
    $this->cashierToken = $this->cashier->createToken('test')->plainTextToken;

    $this->category = Category::factory()->create();
    $this->product = Product::factory()->create(['category_id' => $this->category->id]);
});

test('public endpoint streams binary image with caching and ETag headers', function () {
    $pngContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    $sha256 = hash('sha256', $pngContent);

    $image = ProductImage::create([
        'product_id' => $this->product->id,
        'mime' => 'image/png',
        'size_bytes' => strlen($pngContent),
        'width' => 1,
        'height' => 1,
        'sha256' => $sha256,
        'source' => 'upload',
        'data' => $pngContent,
    ]);

    $response = $this->get("/api/product-images/{$image->id}");

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'image/png');
    $response->assertHeader('Content-Length', (string) strlen($pngContent));
    expect($response->headers->get('Cache-Control'))
        ->toContain('public')
        ->toContain('max-age=31536000')
        ->toContain('immutable');
    $response->assertHeader('ETag', '"'.$sha256.'"');
    expect($response->getContent())->toBe($pngContent);
});

test('public endpoint returns 304 Not Modified when ETag matches If-None-Match', function () {
    $pngContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    $sha256 = hash('sha256', $pngContent);

    $image = ProductImage::create([
        'product_id' => $this->product->id,
        'mime' => 'image/png',
        'size_bytes' => strlen($pngContent),
        'sha256' => $sha256,
        'source' => 'upload',
        'data' => $pngContent,
    ]);

    $this->withHeader('If-None-Match', '"'.$sha256.'"')
        ->get("/api/product-images/{$image->id}")
        ->assertStatus(304);

    $this->withHeader('If-None-Match', $sha256)
        ->get("/api/product-images/{$image->id}")
        ->assertStatus(304);
});

test('public endpoint returns 404 for nonexistent ULID', function () {
    $this->get('/api/product-images/01HXYZ00000000000000000000')
        ->assertStatus(404);
});

test('owner can upload product image replacing existing image', function () {
    $file = UploadedFile::fake()->image('coke.jpg', 640, 480);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->post("/api/products/{$this->product->id}/image", [
            'image' => $file,
            'source' => 'camera',
        ]);

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['image_url'])->toStartWith('/api/product-images/');

    $image = ProductImage::where('product_id', $this->product->id)->first();
    expect($image)->not->toBeNull();
    expect($image->mime)->toBe('image/jpeg');
    expect($image->width)->toBe(640);
    expect($image->height)->toBe(480);
    expect($image->source)->toBe('camera');
    expect($image->size_bytes)->toBeGreaterThan(0);
    expect(strlen($image->data))->toBe($image->size_bytes);

    // Second upload replaces the existing image
    $file2 = UploadedFile::fake()->image('coke-updated.png', 320, 240);
    $response2 = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->post("/api/products/{$this->product->id}/image", [
            'image' => $file2,
            'source' => 'upload',
        ]);

    $response2->assertStatus(200);
    expect(ProductImage::where('product_id', $this->product->id)->count())->toBe(1);
    $updatedImage = ProductImage::where('product_id', $this->product->id)->first();
    expect($updatedImage->id)->not->toBe($image->id);
    expect($updatedImage->mime)->toBe('image/png');
});

test('cashier and guests cannot upload product image', function () {
    $file = UploadedFile::fake()->image('item.jpg');

    $this->postJson("/api/products/{$this->product->id}/image", ['image' => $file])
        ->assertStatus(401);

    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->post("/api/products/{$this->product->id}/image", ['image' => $file])
        ->assertStatus(403);
});

test('upload rejects non-image files and files larger than 1MB', function () {
    $fakeText = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$this->product->id}/image", ['image' => $fakeText])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['image']);

    $tooBig = UploadedFile::fake()->image('big.jpg')->size(1500); // 1.5MB
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$this->product->id}/image", ['image' => $tooBig])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['image']);
});

test('owner can import product image from Open Food Facts URL', function () {
    $fakeBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9QzwAEjAwACfEB/zT8q2wAAAAASUVORK5CYII=');
    $offUrl = 'https://images.openfoodfacts.org/images/products/480/001/664/4800016644808/front_en.4.400.jpg';

    Http::fake([
        $offUrl => Http::response($fakeBytes, 200, ['Content-Type' => 'image/png']),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$this->product->id}/image/import", [
            'url' => $offUrl,
        ]);

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data['image_url'])->toStartWith('/api/product-images/');

    $image = ProductImage::where('product_id', $this->product->id)->first();
    expect($image)->not->toBeNull();
    expect($image->source)->toBe('import_off');
    expect($image->source_url)->toBe($offUrl);
});

test('import rejects non-OFF domains and SSRF private IP attempts', function () {
    // Non-OFF domain
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$this->product->id}/image/import", [
            'url' => 'https://evil.attacker.com/malicious.jpg',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['url']);

    // Localhost / internal IP attempts
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/products/{$this->product->id}/image/import", [
            'url' => 'http://127.0.0.1:8000/secret.png',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['url']);
});

test('owner can delete product image', function () {
    $file = UploadedFile::fake()->image('delete_me.jpg');
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->post("/api/products/{$this->product->id}/image", ['image' => $file])
        ->assertStatus(200);

    expect(ProductImage::where('product_id', $this->product->id)->count())->toBe(1);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->deleteJson("/api/products/{$this->product->id}/image");

    $response->assertStatus(200);
    expect($response->json('data.image_url'))->toBeNull();
    expect(ProductImage::where('product_id', $this->product->id)->count())->toBe(0);
});

test('auto-import triggers when creating or updating product with Open Food Facts image URL', function () {
    $fakeBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9QzwAEjAwACfEB/zT8q2wAAAAASUVORK5CYII=');
    $offUrl = 'https://images.openfoodfacts.org/images/products/480/001/auto.jpg';

    Http::fake([
        $offUrl => Http::response($fakeBytes, 200, ['Content-Type' => 'image/png']),
    ]);

    // 1. On store
    $createRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/products', [
            'name' => 'Auto-Import Product',
            'sku' => 'AUTO-IMP-001',
            'category_id' => $this->category->id,
            'price' => 50.0,
            'cost_price' => 40.0,
            'image_url' => $offUrl,
        ]);

    $createRes->assertStatus(201);
    $newProduct = Product::where('sku', 'AUTO-IMP-001')->first();
    expect($newProduct->image_url)->toStartWith('/api/product-images/');
    expect(ProductImage::where('product_id', $newProduct->id)->count())->toBe(1);

    // 2. On update
    $offUrl2 = 'https://images.openfoodfacts.org/images/products/480/002/auto2.jpg';
    Http::fake([
        $offUrl2 => Http::response($fakeBytes, 200, ['Content-Type' => 'image/png']),
    ]);

    $updateRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->putJson("/api/products/{$newProduct->id}", [
            'image_url' => $offUrl2,
        ]);

    $updateRes->assertStatus(200);
    $newProduct->refresh();
    expect($newProduct->image_url)->toStartWith('/api/product-images/');
    $img = ProductImage::where('product_id', $newProduct->id)->first();
    expect($img->source_url)->toBe($offUrl2);
});
