<?php

use App\Ai\AiService;
use App\Ai\Exceptions\AiDailyLimitException;
use App\Ai\Exceptions\AiException;
use App\Ai\Exceptions\AiRateLimitedException;
use App\Ai\MockVisionProvider;
use App\Ai\VisionProvider;
use App\Ai\VisionResult;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\ProductLookupService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\RateLimiter;

beforeEach(function () {
    Cache::flush();
    RateLimiter::clear('ai:user:1');
    Config::set('ai.max_image_kb', 1500);
    Config::set('ai.per_user_per_minute', 6);
    Config::set('ai.daily_limit', 500);
});

test('mock provider is deterministic based on image sha256', function () {
    $provider = new MockVisionProvider;
    $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    $catalog = [
        ['id' => 1, 'name' => 'Bear Brand', 'size' => '33g', 'category' => 'Dairy'],
        ['id' => 2, 'name' => 'Milo', 'size' => '24g', 'category' => 'Beverages'],
        ['id' => 3, 'name' => 'Nescafe Classic', 'size' => '2g', 'category' => 'Coffee'],
    ];

    $res1 = $provider->analyzeBasket($imageBytes, 'image/png', $catalog);
    $res2 = $provider->analyzeBasket($imageBytes, 'image/png', $catalog);

    expect($res1->items)->toEqual($res2->items)
        ->and($res1->unmatched)->toEqual($res2->unmatched)
        ->and($res1->unmatched[0]['label'])->toBe('donut');
});

test('invalid mime type is rejected', function () {
    $service = app(AiService::class);
    $textData = 'This is plain text, not an image.';

    expect(fn () => $service->validateImage($textData))
        ->toThrow(AiException::class, 'File is not a valid image.');
});

test('oversize image is rejected', function () {
    Config::set('ai.max_image_kb', 10);
    $service = app(AiService::class);

    // Create a 15 KB fake string with a valid PNG signature
    $pngHeader = "\x89PNG\r\n\x1a\n";
    $fakePng = $pngHeader.str_repeat('A', 15 * 1024);

    expect(fn () => $service->validateImage($fakePng))
        ->toThrow(AiException::class, 'exceeds the maximum limit');
});

test('rate limit throws AiRateLimitedException when limit exceeded', function () {
    Config::set('ai.per_user_per_minute', 2);
    $user = User::factory()->create(['id' => 1]);
    $service = app(AiService::class);

    $service->recordUsage($user);
    $service->recordUsage($user);

    expect(fn () => $service->checkLimits($user))
        ->toThrow(AiRateLimitedException::class);
});

test('daily limit throws AiDailyLimitException when daily quota exhausted', function () {
    Config::set('ai.daily_limit', 5);
    $dailyKey = 'ai:daily_count:'.date('Y-m-d');
    Cache::put($dailyKey, 5, 86400);

    $user = User::factory()->create(['id' => 2]);
    $service = app(AiService::class);

    expect(fn () => $service->checkLimits($user))
        ->toThrow(AiDailyLimitException::class);
});

test('basket post-processing: unknown product_id moved to unmatched, duplicates merged, quantities clamped', function () {
    $category = Category::factory()->create(['name' => 'Snacks']);
    $prod1 = Product::factory()->create([
        'name' => 'Chippy BBQ 110g',
        'price' => 35.00,
        'stock_quantity' => 10,
        'category_id' => $category->id,
        'is_active' => true,
    ]);

    // Mock vision provider that returns duplicate of prod1, an unknown product (id: 99999), and an extreme quantity
    $mockVision = Mockery::mock(VisionProvider::class);
    $mockVision->shouldReceive('analyzeBasket')->once()->andReturn(
        new VisionResult(
            items: [
                ['product_id' => $prod1->id, 'quantity' => 2, 'confidence' => 0.85, 'box_2d' => [10, 10, 50, 50]],
                ['product_id' => $prod1->id, 'quantity' => 150, 'confidence' => 0.95, 'box_2d' => [60, 60, 90, 90]],
                ['product_id' => 99999, 'quantity' => 1, 'confidence' => 0.70, 'box_2d' => [100, 100, 150, 150]],
            ],
            unmatched: [
                ['label' => 'random item', 'quantity' => 1, 'box_2d' => [200, 200, 300, 300]],
            ],
            raw: [],
            model: 'test-model',
            latencyMs: 100,
            promptVersion: 'basket-v1'
        )
    );

    $service = new AiService($mockVision, app(ProductLookupService::class));
    $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    $result = $service->processBasket($tinyPng);

    // prod1 was merged: quantity was clamped to 99, confidence is max (0.95)
    expect($result['items'])->toHaveCount(1)
        ->and($result['items'][0]['product_id'])->toBe($prod1->id)
        ->and($result['items'][0]['quantity'])->toBe(99)
        ->and($result['items'][0]['confidence'])->toBe(0.95)
        ->and($result['items'][0]['confidence_bucket'])->toBe('high')
        ->and($result['items'][0]['exceeds_stock'])->toBeTrue()
        ->and($result['items'][0]['product']['name'])->toBe('Chippy BBQ 110g')
        ->and($result['items'][0]['boxes'])->toHaveCount(2);

    // Unknown product #99999 was moved to unmatched
    expect($result['unmatched'])->toHaveCount(2)
        ->and($result['unmatched'][1]['label'])->toBe('Product #99999');
});

test('new products post-processing: GTIN enrichment and fuzzy duplicate detection', function () {
    $category = Category::factory()->create(['name' => 'Condiments']);
    $existing = Product::factory()->create([
        'name' => 'Silver Swan Soy Sauce 350ml',
        'barcode' => '4800016644813',
        'category_id' => $category->id,
        'is_active' => true,
    ]);

    $mockVision = Mockery::mock(VisionProvider::class);
    $mockVision->shouldReceive('analyzeNewProducts')->once()->andReturn(
        new VisionResult(
            items: [],
            unmatched: [],
            raw: [],
            model: 'test-model',
            latencyMs: 120,
            promptVersion: 'products-v1',
            products: [
                [
                    'name' => 'Silver Swan Soy Sauce', // similar to existing name
                    'brand' => 'Silver Swan',
                    'size' => '350ml',
                    'category_id' => $category->id,
                    'estimated_count' => 2,
                    'barcode_text' => '4800016644813', // exact barcode
                    'confidence' => 0.92,
                    'box_2d' => [100, 100, 200, 200],
                ],
                [
                    'name' => 'Datu Puti Vinegar 350ml',
                    'brand' => 'Datu Puti',
                    'size' => '350ml',
                    'category_id' => 99999, // invalid category
                    'estimated_count' => 1,
                    'barcode_text' => null,
                    'confidence' => 0.85,
                    'box_2d' => [300, 300, 400, 400],
                ],
            ]
        )
    );

    $service = new AiService($mockVision, app(ProductLookupService::class));
    $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    $result = $service->processNewProducts($tinyPng);

    expect($result['products'])->toHaveCount(2);

    $p1 = $result['products'][0];
    expect($p1['name'])->toBe('Silver Swan Soy Sauce')
        ->and($p1['duplicate_of'])->not()->toBeNull()
        ->and($p1['duplicate_of']['id'])->toBe($existing->id);

    $p2 = $result['products'][1];
    expect($p2['category_id'])->toBeNull() // invalid category id dropped
        ->and($p2['duplicate_of'])->toBeNull();
});
