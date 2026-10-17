<?php

use App\Ai\Exceptions\AiTimeoutException;
use App\Ai\GeminiVisionProvider;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    Config::set('ai.gemini_api_key', 'test-fake-gemini-key-12345');
    Config::set('ai.gemini_model', 'gemini-3.8-flash');
    Config::set('ai.gemini_fallback_model', 'gemini-3.5-flash-lite');
    Config::set('ai.gemini_base_url', 'https://generativelanguage.googleapis.com/v1beta');
});

test('correct request shape: headers, model in URL, inline_data, schema present', function () {
    Http::fake([
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            [
                                'text' => json_encode([
                                    'items' => [
                                        ['product_id' => 1, 'quantity' => 2, 'confidence' => 0.95, 'box_2d' => [100, 100, 300, 300]],
                                    ],
                                    'unmatched' => [],
                                ]),
                            ],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    $provider = new GeminiVisionProvider;
    $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    $catalog = [
        ['id' => 1, 'name' => 'Coke 290ml', 'size' => '290ml', 'category' => 'Beverages'],
    ];

    $result = $provider->analyzeBasket($imageBytes, 'image/png', $catalog);

    Http::assertSent(function (Request $request) use ($imageBytes) {
        $hasKey = $request->hasHeader('x-goog-api-key', 'test-fake-gemini-key-12345');
        $hasUrl = str_contains($request->url(), '/models/gemini-3.8-flash:generateContent');
        $data = $request->data();

        $inlineData = $data['contents'][0]['parts'][1]['inline_data'] ?? null;
        $hasInline = $inlineData && $inlineData['mime_type'] === 'image/png' && $inlineData['data'] === base64_encode($imageBytes);

        $hasSchema = isset($data['generation_config']['response_schema']);

        return $hasKey && $hasUrl && $hasInline && $hasSchema;
    });

    expect($result->items)->toHaveCount(1)
        ->and($result->items[0]['product_id'])->toBe(1)
        ->and($result->items[0]['quantity'])->toBe(2)
        ->and($result->model)->toBe('gemini-3.8-flash');
});

test('successful parse of basket response', function () {
    Http::fake([
        '*' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            [
                                'text' => json_encode([
                                    'items' => [
                                        ['product_id' => 10, 'quantity' => 1, 'confidence' => 0.88, 'box_2d' => [50, 50, 200, 200]],
                                    ],
                                    'unmatched' => [
                                        ['label' => 'Unknown Biscuit', 'quantity' => 1, 'box_2d' => [400, 400, 600, 600]],
                                    ],
                                ]),
                            ],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    $provider = new GeminiVisionProvider;
    $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    $result = $provider->analyzeBasket($imageBytes, 'image/png', [['id' => 10, 'name' => 'Fita']]);

    expect($result->items)->toHaveCount(1)
        ->and($result->unmatched)->toHaveCount(1)
        ->and($result->unmatched[0]['label'])->toBe('Unknown Biscuit');
});

test('malformed JSON recovered by extraction from markdown code fences', function () {
    $rawText = "```json\n".json_encode([
        'items' => [
            ['product_id' => 5, 'quantity' => 3, 'confidence' => 0.9, 'box_2d' => [100, 100, 200, 200]],
        ],
        'unmatched' => [],
    ])."\n```";

    Http::fake([
        '*' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => $rawText],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    $provider = new GeminiVisionProvider;
    $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    $result = $provider->analyzeBasket($imageBytes, 'image/png', [['id' => 5, 'name' => 'SkyFlakes']]);

    expect($result->items)->toHaveCount(1)
        ->and($result->items[0]['product_id'])->toBe(5);
});

test('fallback model used on 404', function () {
    Http::fake([
        '*/models/gemini-3.8-flash:generateContent' => Http::response(['error' => 'Model not found'], 404),
        '*/models/gemini-3.5-flash-lite:generateContent' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => json_encode(['items' => [], 'unmatched' => []])],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    $provider = new GeminiVisionProvider;
    $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    $result = $provider->analyzeBasket($imageBytes, 'image/png', []);

    expect($result->model)->toBe('gemini-3.5-flash-lite');

    Http::assertSent(fn (Request $r) => str_contains($r->url(), 'gemini-3.8-flash'));
    Http::assertSent(fn (Request $r) => str_contains($r->url(), 'gemini-3.5-flash-lite'));
});

test('fallback model used on 429', function () {
    Http::fake([
        '*/models/gemini-3.8-flash:generateContent' => Http::response(['error' => 'Resource exhausted'], 429),
        '*/models/gemini-3.5-flash-lite:generateContent' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => json_encode(['items' => [], 'unmatched' => []])],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    $provider = new GeminiVisionProvider;
    $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    $result = $provider->analyzeBasket($imageBytes, 'image/png', []);

    expect($result->model)->toBe('gemini-3.5-flash-lite');
});

test('timeout throws AiTimeoutException', function () {
    Http::fake([
        '*' => function () {
            throw new ConnectionException('cURL error 28: Operation timed out');
        },
    ]);

    $provider = new GeminiVisionProvider;
    $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    expect(fn () => $provider->analyzeBasket($imageBytes, 'image/png', []))
        ->toThrow(AiTimeoutException::class);
});

test('the api key never appears in logs', function () {
    Log::spy();

    Http::fake([
        '*/models/gemini-3.8-flash:generateContent' => Http::response(['error' => 'Bad request'], 400),
        '*/models/gemini-3.5-flash-lite:generateContent' => Http::response(['error' => 'Bad request'], 400),
    ]);

    $provider = new GeminiVisionProvider;
    $imageBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

    try {
        $provider->analyzeBasket($imageBytes, 'image/png', []);
    } catch (Throwable) {
        // Expected provider exception
    }

    // Verify Log never recorded the key
    Log::shouldHaveReceived('warning')
        ->withArgs(function ($message) {
            return ! str_contains($message, 'test-fake-gemini-key-12345');
        });
});
