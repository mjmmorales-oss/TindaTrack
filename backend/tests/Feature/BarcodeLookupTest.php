<?php

use App\Enums\UserRole;
use App\Models\BarcodeCatalog;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->owner = User::factory()->create([
        'role' => UserRole::Owner,
        'is_active' => true,
    ]);
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;

    $this->cashier = User::factory()->create([
        'role' => UserRole::Cashier,
        'is_active' => true,
    ]);
    $this->cashierToken = $this->cashier->createToken('test')->plainTextToken;
});

test('a local hit short-circuits and makes no HTTP call', function () {
    Http::fake();

    $category = Category::factory()->create(['name' => 'Drinks']);
    $product = Product::factory()->create([
        'name' => 'Royal Tru Orange',
        'barcode' => '3017620422003',
        'category_id' => $category->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/barcode-lookup/3017620422003');

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'barcode' => '3017620422003',
                'local_product' => [
                    'id' => $product->id,
                    'name' => 'Royal Tru Orange',
                ],
                'catalog' => null,
            ],
        ]);

    Http::assertNothingSent();
});

test('a fresh cache hit makes no HTTP call', function () {
    Http::fake();

    BarcodeCatalog::create([
        'barcode' => '3017620422003',
        'found' => true,
        'source' => 'openfoodfacts',
        'name' => 'Nutella Hazelnut Spread',
        'brand' => 'Ferrero',
        'size' => '350g',
        'image_url' => 'https://images.openfoodfacts.org/nutella.jpg',
        'categories' => ['en:spreads', 'en:sweet-spreads'],
        'fetched_at' => now(),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/barcode-lookup/3017620422003');

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'barcode' => '3017620422003',
                'local_product' => null,
                'catalog' => [
                    'found' => true,
                    'source' => 'openfoodfacts',
                    'name' => 'Nutella Hazelnut Spread',
                    'brand' => 'Ferrero',
                    'size' => '350g',
                    'image_url' => 'https://images.openfoodfacts.org/nutella.jpg',
                    'attribution' => 'Data from Open Food Facts (ODbL)',
                ],
            ],
        ]);

    Http::assertNothingSent();
});

test('an Open Food Facts hit is mapped correctly, cached, and sends configured User-Agent', function () {
    $barcode = '3017620422003';
    $expectedUa = config('services.openfoodfacts.user_agent');

    Http::fake([
        'https://world.openfoodfacts.org/*' => Http::response([
            'status' => 1,
            'product' => [
                'product_name' => 'Nutella',
                'brands' => 'Ferrero, Nutella',
                'quantity' => '400 g',
                'image_front_url' => 'https://images.openfoodfacts.org/front.jpg',
                'categories_tags' => ['en:snacks', 'en:sweet-spreads'],
            ],
        ], 200),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/barcode-lookup/{$barcode}");

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'barcode' => $barcode,
                'local_product' => null,
                'catalog' => [
                    'found' => true,
                    'source' => 'openfoodfacts',
                    'name' => 'Nutella',
                    'brand' => 'Ferrero',
                    'size' => '400 g',
                    'image_url' => 'https://images.openfoodfacts.org/front.jpg',
                    'attribution' => 'Data from Open Food Facts (ODbL)',
                ],
            ],
        ]);

    // Verified cached in database
    $this->assertDatabaseHas('barcode_catalog', [
        'barcode' => $barcode,
        'found' => true,
        'source' => 'openfoodfacts',
        'name' => 'Nutella',
        'brand' => 'Ferrero',
    ]);

    // Assert User-Agent was sent
    Http::assertSent(function ($request) use ($expectedUa) {
        return $request->header('User-Agent')[0] === $expectedUa;
    });
});

test('falls back to Open Products Facts when OFF misses', function () {
    $barcode = '3017620422003';

    Http::fake([
        'https://world.openfoodfacts.org/*' => Http::response(['status' => 0], 200),
        'https://world.openproductsfacts.org/*' => Http::response([
            'status' => 1,
            'product' => [
                'product_name' => 'Notebook Pro',
                'brands' => 'BrandCorp',
                'quantity' => '1 pc',
                'image_front_url' => 'https://images.openproductsfacts.org/front.jpg',
                'categories_tags' => ['en:stationery'],
            ],
        ], 200),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/barcode-lookup/{$barcode}");

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'barcode' => $barcode,
                'catalog' => [
                    'found' => true,
                    'source' => 'openproductsfacts',
                    'name' => 'Notebook Pro',
                    'attribution' => 'Data from Open Products Facts (ODbL)',
                ],
            ],
        ]);
});

test('caches as not found when all sources miss', function () {
    $barcode = '3017620422003';

    Http::fake([
        'https://world.openfoodfacts.org/*' => Http::response(['status' => 0], 200),
        'https://world.openproductsfacts.org/*' => Http::response(['status' => 0], 200),
        'https://world.openbeautyfacts.org/*' => Http::response(['status' => 0], 200),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/barcode-lookup/{$barcode}");

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'barcode' => $barcode,
                'catalog' => [
                    'found' => false,
                    'source' => null,
                ],
            ],
        ]);

    $this->assertDatabaseHas('barcode_catalog', [
        'barcode' => $barcode,
        'found' => false,
    ]);
});

test('server timeout or 500 is not cached to avoid cache poisoning', function () {
    $barcode = '3017620422003';

    Http::fake([
        'https://world.openfoodfacts.org/*' => Http::response('Server Error', 500),
        'https://world.openproductsfacts.org/*' => Http::response('Gateway Timeout', 504),
        'https://world.openbeautyfacts.org/*' => Http::response('Too Many Requests', 429),
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/barcode-lookup/{$barcode}");

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'barcode' => $barcode,
                'catalog' => [
                    'found' => false,
                ],
            ],
        ]);

    $this->assertDatabaseMissing('barcode_catalog', [
        'barcode' => $barcode,
    ]);
});

test('internal barcode makes no HTTP call and returns not found catalog', function () {
    Http::fake();

    $internalBarcode = '2000000000015';

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/barcode-lookup/{$internalBarcode}");

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'barcode' => $internalBarcode,
                'local_product' => null,
                'catalog' => [
                    'found' => false,
                ],
            ],
        ]);

    Http::assertNothingSent();
});

test('a cashier gets only local_product and their catalog is always null without calling OFF', function () {
    Http::fake();

    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'name' => 'Local Snack',
        'barcode' => '3017620422003',
        'category_id' => $category->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/barcode-lookup/3017620422003');

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'barcode' => '3017620422003',
                'local_product' => [
                    'id' => $product->id,
                    'name' => 'Local Snack',
                ],
                'catalog' => null,
            ],
        ]);

    Http::assertNothingSent();
});

test('invalid barcode returns 422', function () {
    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/barcode-lookup/3017620422004'); // Invalid check digit

    $response->assertStatus(422)
        ->assertJsonStructure(['message', 'errors' => ['barcode']]);
});

test('endpoint throttle restricts requests beyond 30 per minute', function () {
    Http::fake();

    for ($i = 0; $i < 30; $i++) {
        $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
            ->getJson('/api/barcode-lookup/SKU-'.$i);
    }

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/barcode-lookup/SKU-OVERFLOW');

    $response->assertStatus(429);
});

test('a scanned pairing QR URL returns a clean 422, not a route 404', function () {
    Http::fake();

    foreach ([
        '/api/barcode-lookup/'.rawurlencode('https://tindatrack.app/scan?code=ABCD-EFGH'),
        '/api/barcode-lookup/https://tindatrack.app/scan?code=ABCD-EFGH',
        '/api/barcode-lookup/'.rawurlencode('hello world, not a barcode'),
    ] as $url) {
        $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
            ->getJson($url)
            ->assertStatus(422)
            ->assertJsonPath('code', 'not_a_barcode')
            ->assertJsonStructure(['message', 'errors' => ['barcode']]);
    }

    Http::assertNothingSent();
});

test('a stored barcode resolves even when its check digit is invalid', function () {
    Http::fake();
    $product = Product::factory()->create(['barcode' => '4800016601011']);

    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/barcode-lookup/4800016601011')
        ->assertOk()
        ->assertJsonPath('data.local_product.id', $product->id);
});
