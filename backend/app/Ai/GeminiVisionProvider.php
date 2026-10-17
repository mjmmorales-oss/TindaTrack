<?php

namespace App\Ai;

use App\Ai\Exceptions\AiBadResponseException;
use App\Ai\Exceptions\AiDisabledException;
use App\Ai\Exceptions\AiProviderException;
use App\Ai\Exceptions\AiRateLimitedException;
use App\Ai\Exceptions\AiTimeoutException;
use App\Ai\Prompts\BasketPrompt;
use App\Ai\Prompts\ProductPrompt;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiVisionProvider implements VisionProvider
{
    protected string $apiKey;

    protected string $baseUrl;

    protected string $primaryModel;

    protected string $fallbackModel;

    protected int $timeout;

    public function __construct()
    {
        $this->apiKey = (string) config('ai.gemini_api_key', '');
        $this->baseUrl = rtrim((string) config('ai.gemini_base_url', 'https://generativelanguage.googleapis.com/v1beta'), '/');
        $this->primaryModel = (string) config('ai.gemini_model', 'gemini-3.8-flash');
        $this->fallbackModel = (string) config('ai.gemini_fallback_model', 'gemini-3.5-flash-lite');
        $this->timeout = (int) config('ai.timeout', 30);
    }

    /**
     * Identifies items in a basket photo and matches against the catalog.
     *
     * @param  array<int, array<string, mixed>>  $catalog
     */
    public function analyzeBasket(string $imageBytes, string $mime, array $catalog): VisionResult
    {
        $promptText = BasketPrompt::build($catalog);
        $schema = BasketPrompt::schema();

        [$parsed, $rawResponse, $usedModel, $latencyMs] = $this->callGenerateContent(
            $promptText,
            $imageBytes,
            $mime,
            $schema
        );

        return new VisionResult(
            items: $parsed['items'] ?? [],
            unmatched: $parsed['unmatched'] ?? [],
            raw: $rawResponse,
            model: $usedModel,
            latencyMs: $latencyMs,
            promptVersion: BasketPrompt::VERSION
        );
    }

    /**
     * Identifies up to 5 new products in an intake photo.
     *
     * @param  array<int, array<string, mixed>>  $categories
     */
    public function analyzeNewProducts(string $imageBytes, string $mime, array $categories): VisionResult
    {
        $promptText = ProductPrompt::build($categories);
        $schema = ProductPrompt::schema();

        [$parsed, $rawResponse, $usedModel, $latencyMs] = $this->callGenerateContent(
            $promptText,
            $imageBytes,
            $mime,
            $schema
        );

        return new VisionResult(
            items: [],
            unmatched: [],
            raw: $rawResponse,
            model: $usedModel,
            latencyMs: $latencyMs,
            promptVersion: ProductPrompt::VERSION,
            products: $parsed['products'] ?? [],
            moreThanFive: (bool) ($parsed['more_than_five'] ?? false)
        );
    }

    /**
     * Sends a ping to verify connectivity.
     */
    public function ping(): array
    {
        if (empty($this->apiKey)) {
            return [
                'ok' => false,
                'provider' => 'gemini',
                'model' => $this->primaryModel,
                'latency_ms' => 0,
                'message' => 'GEMINI_API_KEY is not configured in .env. Please add GEMINI_API_KEY=<your-key> to backend/.env.',
            ];
        }

        $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
        $startTime = hrtime(true);

        try {
            $schema = [
                'type' => 'OBJECT',
                'properties' => [
                    'ok' => ['type' => 'BOOLEAN'],
                ],
                'required' => ['ok'],
            ];

            [$parsed, $raw, $usedModel, $latencyMs] = $this->callGenerateContent(
                'Reply with {"ok": true}',
                $tinyPng,
                'image/png',
                $schema
            );

            return [
                'ok' => (bool) ($parsed['ok'] ?? true),
                'provider' => 'gemini',
                'model' => $usedModel,
                'latency_ms' => $latencyMs,
                'message' => 'Connected to Google Gemini Vision API successfully.',
            ];
        } catch (\Throwable $e) {
            $elapsedMs = (int) round((hrtime(true) - $startTime) / 1e6);
            $msg = $e->getMessage();
            $code = $e->getCode();

            $errorType = 'unknown';
            $actionableHint = '';

            if ($e instanceof AiRateLimitedException || $code === 429 || str_contains($msg, '429') || str_contains(strtolower($msg), 'quota') || str_contains(strtolower($msg), 'rate limit')) {
                $errorType = 'quota_exceeded';
                $actionableHint = 'Quota exceeded or rate limited (HTTP 429). Please check your Google AI Studio plan quota or wait before retrying.';
            } elseif ($code === 404 || str_contains($msg, '404') || str_contains(strtolower($msg), 'not found')) {
                $errorType = 'model_not_found';
                $actionableHint = 'Model not found (HTTP 404). Suggest changing GEMINI_MODEL in backend/.env to a supported model (e.g. gemini-2.5-flash or gemini-1.5-flash).';
            } elseif ($code === 400 || $code === 403 || str_contains($msg, '400') || str_contains($msg, '403') || str_contains(strtolower($msg), 'api key') || str_contains(strtolower($msg), 'permission')) {
                $errorType = 'invalid_key';
                $actionableHint = 'Invalid API key or unauthorized (HTTP 400/403). Please verify that GEMINI_API_KEY in backend/.env is valid and active.';
            } elseif ($e instanceof ConnectionException || $e instanceof AiTimeoutException || str_contains(strtolower($msg), 'connection') || str_contains(strtolower($msg), 'timed out')) {
                $errorType = 'network_failure';
                $actionableHint = 'Network failure or connection timeout. Please check internet connectivity and DNS resolution.';
            }

            return [
                'ok' => false,
                'provider' => 'gemini',
                'model' => $this->primaryModel,
                'latency_ms' => $elapsedMs,
                'error_type' => $errorType,
                'hint' => $actionableHint,
                'message' => $actionableHint ?: 'Gemini API ping failed: '.$msg,
            ];
        }
    }

    /**
     * Calls Gemini generateContent with automatic single fallback retry.
     *
     * @return array{0: array<string, mixed>, 1: mixed, 2: string, 3: int}
     */
    protected function callGenerateContent(
        string $promptText,
        string $imageBytes,
        string $mime,
        array $schema
    ): array {
        if (empty($this->apiKey)) {
            throw new AiDisabledException('Gemini API key is not configured.');
        }

        $startTime = hrtime(true);
        $model = $this->primaryModel;

        try {
            $response = $this->executeRequest($model, $promptText, $imageBytes, $mime, $schema);

            if ($this->shouldFallback($response)) {
                Log::warning("Gemini primary model [{$model}] returned status {$response->status()}. Retrying with fallback model [{$this->fallbackModel}].");
                $model = $this->fallbackModel;
                $response = $this->executeRequest($model, $promptText, $imageBytes, $mime, $schema);
            }
        } catch (ConnectionException $e) {
            Log::warning("Gemini request timed out or connection failed on model [{$model}]. Retrying with fallback model [{$this->fallbackModel}].");
            $model = $this->fallbackModel;
            try {
                $response = $this->executeRequest($model, $promptText, $imageBytes, $mime, $schema);
            } catch (ConnectionException $e2) {
                throw new AiTimeoutException('AI vision request timed out or connection failed.', $e2);
            }
        }

        $latencyMs = (int) round((hrtime(true) - $startTime) / 1e6);

        if ($response->status() === 429) {
            throw new AiRateLimitedException('Gemini rate limit exceeded.');
        }

        if (! $response->successful()) {
            throw new AiProviderException(
                "Gemini vision call failed with status {$response->status()}: ".substr($response->body(), 0, 200),
                $response->status()
            );
        }

        $rawBody = $response->json();
        $text = $response->json('candidates.0.content.parts.0.text') ?? '';

        $parsed = $this->extractAndDecodeJson($text);

        return [$parsed, $rawBody, $model, $latencyMs];
    }

    /**
     * Executes the HTTP POST request to Gemini REST API.
     */
    protected function executeRequest(
        string $model,
        string $promptText,
        string $imageBytes,
        string $mime,
        array $schema
    ): Response {
        $url = "{$this->baseUrl}/models/{$model}:generateContent";

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $promptText],
                        [
                            'inline_data' => [
                                'mime_type' => $mime,
                                'data' => base64_encode($imageBytes),
                            ],
                        ],
                    ],
                ],
            ],
            'generation_config' => [
                'response_mime_type' => 'application/json',
                'response_schema' => $schema,
                'temperature' => 0.1,
            ],
        ];

        return Http::withHeaders([
            'x-goog-api-key' => $this->apiKey,
        ])
            ->timeout($this->timeout)
            ->post($url, $payload);
    }

    /**
     * Determines whether to trigger a fallback retry.
     */
    protected function shouldFallback(Response $response): bool
    {
        $status = $response->status();

        // Fallback on 404 (model not found), 400 (bad model), 403 (unsupported region/model), or 429
        return in_array($status, [400, 403, 404, 429], true) && $this->primaryModel !== $this->fallbackModel;
    }

    /**
     * Attempts to parse JSON string, recovering from markdown formatting if needed.
     *
     * @return array<string, mixed>
     */
    protected function extractAndDecodeJson(string $text): array
    {
        $trimmed = trim($text);
        if ($trimmed === '') {
            throw new AiBadResponseException('Empty response from AI vision provider.');
        }

        // Direct parse
        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        // Extract from markdown code fences: ```json ... ``` or ``` ... ```
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/i', $trimmed, $matches)) {
            $inside = trim($matches[1]);
            $decoded = json_decode($inside, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        // Extract between first '{' and last '}'
        $firstBrace = strpos($trimmed, '{');
        $lastBrace = strrpos($trimmed, '}');
        if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
            $candidate = substr($trimmed, $firstBrace, $lastBrace - $firstBrace + 1);
            $decoded = json_decode($candidate, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        throw new AiBadResponseException('Could not extract valid JSON from Gemini response.');
    }
}
