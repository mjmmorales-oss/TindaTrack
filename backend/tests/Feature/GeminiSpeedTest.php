<?php

use App\Ai\GeminiVisionProvider;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

/**
 * v2.3 S1: Gemini speed options (thinking off/minimal, media resolution, output cap)
 * and fast failover.
 */
const SPEED_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function geminiOk(): array
{
    return [
        'candidates' => [[
            'content' => ['parts' => [['text' => json_encode(['items' => [], 'unmatched' => []])]]],
        ]],
    ];
}

function tinyPng(): string
{
    return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
}

beforeEach(function () {
    GeminiVisionProvider::resetRejectedFields();
    Config::set('ai.gemini_api_key', 'test-key');
    Config::set('ai.gemini_model', 'gemini-3.8-flash');
    Config::set('ai.gemini_fallback_model', 'gemini-3.5-flash-lite');
    Config::set('ai.gemini_base_url', 'https://generativelanguage.googleapis.com/v1beta');
    Config::set('ai.gemini_thinking_level', 'minimal');
    Config::set('ai.gemini_media_resolution', 'MEDIA_RESOLUTION_MEDIUM');
    Config::set('ai.max_output_tokens', 2048);
});

test('thinking_config: thinking_level for 3.x, thinking_budget for 2.x, nothing for none', function () {
    expect(GeminiVisionProvider::thinkingConfigFor('gemini-3.8-flash', 'minimal'))->toBe(['thinking_level' => 'minimal'])
        ->and(GeminiVisionProvider::thinkingConfigFor('gemini-3.5-flash-lite', 'low'))->toBe(['thinking_level' => 'low'])
        ->and(GeminiVisionProvider::thinkingConfigFor('gemini-2.5-flash', 'minimal'))->toBe(['thinking_budget' => 0])
        ->and(GeminiVisionProvider::thinkingConfigFor('gemini-2.0-flash', 'medium'))->toBe(['thinking_budget' => 2048])
        ->and(GeminiVisionProvider::thinkingConfigFor('gemini-3.8-flash', 'none'))->toBeNull()
        ->and(GeminiVisionProvider::thinkingConfigFor('gemini-1.5-flash', 'minimal'))->toBeNull();
});

test('the request carries thinking_config, media_resolution and max_output_tokens', function () {
    Http::fake([SPEED_BASE.'/gemini-3.8-flash:generateContent' => Http::response(geminiOk())]);

    (new GeminiVisionProvider)->analyzeBasket(tinyPng(), 'image/png', [['id' => 1, 'name' => 'Coke', 'unit' => 'can']]);

    Http::assertSent(function (Request $request) {
        $config = $request->data()['generation_config'];

        return $config['thinking_config'] === ['thinking_level' => 'minimal']
            && $config['media_resolution'] === 'MEDIA_RESOLUTION_MEDIUM'
            && $config['max_output_tokens'] === 2048
            && $config['temperature'] === 0.1;
    });
});

test('a 400 naming thinking retries once without the field and remembers it', function () {
    Http::fakeSequence(SPEED_BASE.'/gemini-3.8-flash:generateContent')
        ->push(['error' => ['message' => 'Unknown name "thinking_config" at generation_config']], 400)
        ->push(geminiOk(), 200);

    $result = (new GeminiVisionProvider)->analyzeBasket(tinyPng(), 'image/png', []);

    expect($result->model)->toBe('gemini-3.8-flash');
    $sent = Http::recorded()->map(fn ($pair) => $pair[0]->data()['generation_config']);
    expect($sent)->toHaveCount(2)
        ->and($sent[0])->toHaveKey('thinking_config')
        ->and($sent[1])->not->toHaveKey('thinking_config')
        ->and($sent[1])->toHaveKey('media_resolution');

    // Remembered for the process: the next call doesn't send it at all
    expect((new GeminiVisionProvider)->generationConfigFor('gemini-3.8-flash', []))->not->toHaveKey('thinking_config');
});

test('falls back to the fallback model on a primary timeout, using the short timeouts', function () {
    Config::set('ai.primary_timeout', 12);
    Config::set('ai.fallback_timeout', 15);
    Http::fake([
        SPEED_BASE.'/gemini-3.8-flash:generateContent' => fn () => throw new ConnectionException('cURL error 28: Operation timed out'),
        SPEED_BASE.'/gemini-3.5-flash-lite:generateContent' => Http::response(geminiOk()),
    ]);

    $result = (new GeminiVisionProvider)->analyzeBasket(tinyPng(), 'image/png', []);

    expect($result->model)->toBe('gemini-3.5-flash-lite');
});

test('falls back on a 5xx from the primary', function () {
    Http::fake([
        SPEED_BASE.'/gemini-3.8-flash:generateContent' => Http::response(['error' => ['message' => 'overloaded']], 503),
        SPEED_BASE.'/gemini-3.5-flash-lite:generateContent' => Http::response(geminiOk()),
    ]);

    $result = (new GeminiVisionProvider)->analyzeBasket(tinyPng(), 'image/png', []);

    expect($result->model)->toBe('gemini-3.5-flash-lite');
    Http::assertSentCount(2);
});
