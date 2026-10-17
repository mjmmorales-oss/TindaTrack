<?php

use App\Ai\GeminiVisionProvider;
use App\Ai\VisionProvider;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Config::set('ai.gemini_api_key', 'test-fake-gemini-key');
    Config::set('ai.gemini_model', 'gemini-2.5-flash');
    Config::set('ai.gemini_fallback_model', 'gemini-1.5-flash');
    Config::set('ai.gemini_base_url', 'https://generativelanguage.googleapis.com/v1beta');

    app()->bind(VisionProvider::class, GeminiVisionProvider::class);
});

test('ai:ping reports invalid api key on 400 or 403 response', function () {
    Http::fake([
        '*' => Http::response(['error' => ['message' => 'API_KEY_INVALID']], 400),
    ]);

    $exitCode = Artisan::call('ai:ping', ['--provider' => 'gemini']);
    $output = Artisan::output();

    expect($exitCode)->toBe(1)
        ->and($output)->toContain('Status:   FAILED')
        ->and($output)->toContain('Invalid API key or unauthorized (HTTP 400/403)')
        ->and($output)->toContain('GEMINI_API_KEY in backend/.env is valid');
});

test('ai:ping reports model not found on 404 response with suggestion to change GEMINI_MODEL', function () {
    Http::fake([
        '*' => Http::response(['error' => ['message' => 'models/gemini-2.5-flash is not found']], 404),
    ]);

    $exitCode = Artisan::call('ai:ping', ['--provider' => 'gemini']);
    $output = Artisan::output();

    expect($exitCode)->toBe(1)
        ->and($output)->toContain('Status:   FAILED')
        ->and($output)->toContain('Model not found (HTTP 404)')
        ->and($output)->toContain('Suggest changing GEMINI_MODEL in backend/.env to a supported model');
});

test('ai:ping reports quota exceeded on 429 response', function () {
    Http::fake([
        '*' => Http::response(['error' => ['message' => 'Quota exceeded']], 429),
    ]);

    $exitCode = Artisan::call('ai:ping', ['--provider' => 'gemini']);
    $output = Artisan::output();

    expect($exitCode)->toBe(1)
        ->and($output)->toContain('Status:   FAILED')
        ->and($output)->toContain('Quota exceeded or rate limited (HTTP 429)');
});

test('ai:ping reports network failure on connection timeout', function () {
    Http::fake([
        '*' => function () {
            throw new ConnectionException('cURL error 28: Operation timed out');
        },
    ]);

    $exitCode = Artisan::call('ai:ping', ['--provider' => 'gemini']);
    $output = Artisan::output();

    expect($exitCode)->toBe(1)
        ->and($output)->toContain('Status:   FAILED')
        ->and($output)->toContain('Network failure or connection timeout');
});

test('ai:ping reports success on 200 response with valid json candidate', function () {
    Http::fake([
        '*' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => '{"ok": true}'],
                        ],
                    ],
                ],
            ],
        ], 200),
    ]);

    $exitCode = Artisan::call('ai:ping', ['--provider' => 'gemini']);
    $output = Artisan::output();

    expect($exitCode)->toBe(0)
        ->and($output)->toContain('Status:   SUCCESS')
        ->and($output)->toContain('Connected to Google Gemini Vision API successfully');
});
