<?php

use App\Enums\UserRole;
use App\Models\AiScan;
use App\Models\AiScanImage;
use App\Models\Category;
use App\Models\Product;
use App\Models\ScannerSession;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;

beforeEach(function () {
    Config::set('ai.provider', 'mock');

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

test('GET /api/ai/status is accessible by both owner and cashier', function () {
    $resOwner = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/ai/status');

    $resOwner->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['enabled', 'provider', 'model', 'demo', 'daily_remaining', 'per_minute'],
        ]);

    $resCashier = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/ai/status');

    $resCashier->assertStatus(200);
});

test('POST /api/ai/basket-scan runs basket analysis and returns items', function () {
    $category = Category::factory()->create(['name' => 'Beverages']);
    $product = Product::factory()->create([
        'name' => 'San Miguel Pale Pilsen',
        'category_id' => $category->id,
        'price' => 55.00,
        'stock_quantity' => 20,
        'is_active' => true,
    ]);

    $fakeImage = UploadedFile::fake()->image('basket.png', 640, 480);

    $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/ai/basket-scan', [
            'image' => $fakeImage,
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'scan_id',
                'provider',
                'model',
                'latency_ms',
                'items',
                'unmatched',
            ],
        ]);
});

test('POST /api/ai/product-scan is allowed for owner but forbidden for cashier', function () {
    $fakeImage = UploadedFile::fake()->image('products.jpg', 800, 600);

    // Cashier attempt
    $cashierRes = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/ai/product-scan', ['image' => UploadedFile::fake()->image('products_cashier.jpg', 800, 600)]);
    $cashierRes->assertStatus(403);

    $this->flushHeaders();
    auth()->forgetGuards();

    // Owner attempt
    $ownerRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/ai/product-scan', ['image' => UploadedFile::fake()->image('products_owner.jpg', 800, 600)]);
    $ownerRes->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['scan_id', 'products'],
        ]);
});

test('POST /api/ai/scans/{scan}/feedback records feedback and is idempotent', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);

    $scan = AiScan::factory()->create([
        'user_id' => $this->owner->id,
        'type' => 'basket',
    ]);

    $body = [
        'lines' => [
            [
                'line_type' => 'item',
                'suggested_product_id' => $product->id,
                'suggested_quantity' => 2,
                'confidence' => 0.95,
                'final_product_id' => $product->id,
                'final_quantity' => 2,
                'action' => 'accepted',
            ],
        ],
    ];

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/ai/scans/{$scan->id}/feedback", $body);

    $response->assertStatus(200)
        ->assertJson(['message' => 'Feedback recorded successfully.']);

    expect($scan->feedback()->count())->toBe(1);

    // Repeat with 2 items to verify idempotency
    $body['lines'][] = [
        'line_type' => 'unmatched',
        'action' => 'removed',
    ];

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/ai/scans/{$scan->id}/feedback", $body);

    expect($scan->feedback()->count())->toBe(2);
});

test('cashier cannot record feedback on another users scan', function () {
    $scan = AiScan::factory()->create([
        'user_id' => $this->owner->id,
    ]);

    $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson("/api/ai/scans/{$scan->id}/feedback", [
            'lines' => [
                ['line_type' => 'item', 'action' => 'accepted'],
            ],
        ]);

    $response->assertStatus(403);
});

test('GET /api/ai/scans and GET /api/ai/scans/{scan}/image work for owner', function () {
    $pngData = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    $image = AiScanImage::factory()->create([
        'image_data' => $pngData,
        'mime_type' => 'image/png',
    ]);

    $scan = AiScan::factory()->create([
        'user_id' => $this->owner->id,
        'image_id' => $image->id,
    ]);

    // List scans
    $listRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/ai/scans');

    $listRes->assertStatus(200)
        ->assertJsonStructure(['data', 'meta']);

    // Show image
    $imgRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->get("/api/ai/scans/{$scan->id}/image");

    $imgRes->assertStatus(200)
        ->assertHeader('Content-Type', 'image/png')
        ->assertHeader('Cache-Control', 'no-store, private');
});

test('GET /api/ai/metrics and CSV export work for owner', function () {
    AiScan::factory()->count(3)->create(['user_id' => $this->owner->id]);

    $metricsRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/ai/metrics');

    $metricsRes->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['total_scans', 'basket', 'products', 'checkout_timing', 'visual_search'],
        ]);

    $csvRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->get('/api/ai/metrics/export.csv');

    $csvRes->assertStatus(200)
        ->assertHeader('Content-Type', 'text/csv; charset=utf-8');
});

test('POST /api/scanner/ai-basket allows paired phone scanner to send basket photo', function () {
    $session = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'TEST-1234',
        'pairing_expires_at' => now()->addMinutes(10),
        'device_token_hash' => hash('sha256', 'plain-device-token-1234'),
        'device_label' => 'Pixel 8',
        'paired_at' => now(),
        'last_seen_at' => now(),
        'expires_at' => now()->addHours(8),
    ]);

    $fakeImage = UploadedFile::fake()->image('basket_phone.png', 640, 480);

    $response = $this->withHeader('X-Scanner-Token', 'plain-device-token-1234')
        ->postJson('/api/scanner/ai-basket', [
            'image' => $fakeImage,
        ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'data' => [
                'event_id',
                'scan' => ['scan_id', 'items', 'unmatched'],
            ],
        ]);
});

test('product visual embeddings CRUD and 10-vector cap per product', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);

    // Store up to 11 embeddings to verify oldest purge
    for ($i = 1; $i <= 11; $i++) {
        $res = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
            ->postJson("/api/products/{$product->id}/embeddings", [
                'model' => 'clip-vit-base',
                'source' => 'correction',
                'vector' => [0.1 * $i, 0.2 * $i],
            ]);
        $res->assertStatus(201);
    }

    expect($product->embeddings()->where('model', 'clip-vit-base')->count())->toBe(10);

    // List embeddings
    $listRes = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/products/embeddings?model=clip-vit-base');
    $listRes->assertStatus(200);

    // Delete embedding
    $first = $product->embeddings()->first();
    $delRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->deleteJson("/api/products/{$product->id}/embeddings/{$first->id}");
    $delRes->assertStatus(200);
    expect($product->embeddings()->count())->toBe(9);
});

test('POST /api/products/bulk creates products transactionally and returns row validation errors', function () {
    $category = Category::factory()->create();

    // 1. Validation failure (price missing)
    $badPayload = [
        'products' => [
            [
                'name' => 'Valid Item',
                'price' => 10,
                'stock_quantity' => 5,
            ],
            [
                'name' => 'Invalid Item',
                // missing price and stock_quantity
            ],
        ],
    ];

    $badRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/products/bulk', $badPayload);

    $badRes->assertStatus(422)
        ->assertJsonValidationErrors(['products.1.price', 'products.1.stock_quantity']);

    // 2. Success bulk creation
    $goodPayload = [
        'products' => [
            [
                'name' => 'Bulk Item 1',
                'brand' => 'Brand A',
                'size' => '100g',
                'unit' => 'can',
                'category_id' => $category->id,
                'price' => 25.50,
                'cost_price' => 20.00,
                'stock_quantity' => 10,
                'reorder_level' => 8,
            ],
            [
                'name' => 'Bulk Item 2',
                'brand' => 'Brand B',
                'size' => '200ml',
                'unit' => 'bottle',
                'category_id' => $category->id,
                'price' => 50.00,
                'cost_price' => 40.00,
                'stock_quantity' => 15,
                'reorder_level' => 6,
            ],
        ],
    ];

    $goodRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/products/bulk', $goodPayload);

    $goodRes->assertStatus(201)
        ->assertJsonPath('message', '2 products created successfully.')
        ->assertJsonPath('data.0.name', 'Bulk Item 1')
        ->assertJsonPath('data.0.unit', 'can')
        ->assertJsonPath('data.0.reorder_level', 8)
        ->assertJsonPath('data.1.name', 'Bulk Item 2')
        ->assertJsonPath('data.1.unit', 'bottle')
        ->assertJsonPath('data.1.reorder_level', 6);

    expect(Product::where('name', 'Bulk Item 1')->first()->reorder_level)->toBe(8)
        ->and(Product::where('name', 'Bulk Item 2')->first()->reorder_level)->toBe(6);
});

test('when ai_enabled is false, endpoints return 403 ai_disabled', function () {
    $setting = Setting::first() ?? Setting::factory()->create();
    $setting->update(['ai_enabled' => false]);

    $fakeImage = UploadedFile::fake()->image('basket.png', 640, 480);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/ai/basket-scan', [
            'image' => $fakeImage,
        ]);

    $response->assertStatus(403)
        ->assertJson([
            'code' => 'ai_disabled',
        ]);
});

test('cashier cannot access AI experiments', function () {
    $forbiddenRes = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->getJson('/api/ai/experiments');
    $forbiddenRes->assertStatus(403);
});

test('owner can manage AI experiments lifecycle and export csv', function () {
    // 1. Owner creates an experiment
    $createRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/ai/experiments', [
            'name' => 'Controlled Basket Evaluation',
            'type' => 'basket',
            'notes' => 'Evaluation of 20 baskets under normal store lighting',
        ]);
    $createRes->assertStatus(201)
        ->assertJsonPath('data.name', 'Controlled Basket Evaluation');

    $experimentId = $createRes->json('data.id');

    // 2. Owner runs a test case with ground truth
    $category = Category::factory()->create();
    $product1 = Product::factory()->create(['category_id' => $category->id, 'price' => 20]);
    $product2 = Product::factory()->create(['category_id' => $category->id, 'price' => 35]);

    $fakeImage = UploadedFile::fake()->image('test_case.png', 640, 480);
    $groundTruth = [
        ['product_id' => $product1->id, 'quantity' => 2],
        ['product_id' => $product2->id, 'quantity' => 1],
    ];

    $caseRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/ai/experiments/{$experimentId}/cases", [
            'image' => $fakeImage,
            'ground_truth' => $groundTruth,
        ]);

    $caseRes->assertStatus(201)
        ->assertJsonStructure([
            'data' => [
                'id',
                'case_number',
                'is_correct',
                'latency_ms',
                'metrics' => ['precision', 'recall', 'mae'],
            ],
        ]);

    // 3. Export CSV
    $csvRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->get("/api/ai/experiments/{$experimentId}/export.csv");
    $csvRes->assertStatus(200)
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    expect($csvRes->getContent())->toContain('case_number,is_correct,latency_ms');

    // 4. Reset experiment
    $resetRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/ai/experiments/{$experimentId}/reset");
    $resetRes->assertStatus(200);

    $showRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/ai/experiments/{$experimentId}");
    $showRes->assertStatus(200);
    expect($showRes->json('data.cases'))->toBeEmpty();
});
