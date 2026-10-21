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

    protected int $primaryTimeout;

    protected int $fallbackTimeout;

    /**
     * Optional generation_config fields the API rejected in this process
     * (e.g. ['thinking_config' => true]). Not retried until the process restarts.
     *
     * @var array<string, bool>
     */
    protected static array $rejectedFields = [];

    public function __construct()
    {
        $this->apiKey = (string) config('ai.gemini_api_key', '');
        $this->baseUrl = rtrim((string) config('ai.gemini_base_url', 'https://generativelanguage.googleapis.com/v1beta'), '/');
        $this->primaryModel = (string) config('ai.gemini_model', 'gemini-3.8-flash');
        $this->fallbackModel = (string) config('ai.gemini_fallback_model', 'gemini-3.5-flash-lite');
        $this->timeout = (int) config('ai.timeout', 30);
        $this->primaryTimeout = (int) config('ai.primary_timeout', 12);
        $this->fallbackTimeout = (int) config('ai.fallback_timeout', 15);
    }

    /**
     * The thinking_config for a model: 3.x (and newer) take thinking_level, 2.x take a
     * thinking_budget (minimal → 0). Null when nothing should be sent.
     *
     * @return array<string, int|string>|null
     */
    public static function thinkingConfigFor(string $model, ?string $level): ?array
    {
        $level = strtolower(trim((string) $level));
        if ($level === '' || $level === 'none' || $level === 'off') {
            return null;
        }
        if (! preg_match('/gemini-(\d+)(?:\.\d+)?/i', $model, $m)) {
            return null;
        }

        $major = (int) $m[1];
        if ($major >= 3) {
            return ['thinking_level' => in_array($level, ['minimal', 'low', 'medium', 'high'], true) ? $level : 'minimal'];
        }
        if ($major === 2) {
            $budget = match ($level) {
                'low' => 512,
                'medium' => 2048,
                'high' => -1, // dynamic
                default => 0,
            };

            return ['thinking_budget' => $budget];
        }

        return null;
    }

    /**
     * Forget fields rejected earlier in this process (tests).
     */
    public static function resetRejectedFields(): void
    {
        self::$rejectedFields = [];
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
                $schema,
                $this->timeout
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
            // Diagnose with Gemini's own status, not the 502 the SPA receives
            $code = $e instanceof AiProviderException && $e->upstreamStatus ? $e->upstreamStatus : $e->getCode();

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
        array $schema,
        ?int $timeout = null
    ): array {
        if (empty($this->apiKey)) {
            throw new AiDisabledException('Gemini API key is not configured.');
        }

        $startTime = hrtime(true);

        // Primary with a short timeout, then the fallback once
        $attempts = [[$this->primaryModel, $timeout ?? $this->primaryTimeout]];
        if ($this->fallbackModel !== '' && $this->fallbackModel !== $this->primaryModel) {
            $attempts[] = [$this->fallbackModel, $timeout ?? $this->fallbackTimeout];
        }

        $response = null;
        $model = $this->primaryModel;
        $lastConnectionError = null;

        foreach ($attempts as $index => [$attemptModel, $attemptTimeout]) {
            $isLast = $index === count($attempts) - 1;
            try {
                $candidate = $this->requestWithOptionalFields($attemptModel, $promptText, $imageBytes, $mime, $schema, $attemptTimeout);
            } catch (ConnectionException $e) {
                $lastConnectionError = $e;
                Log::warning("Gemini model [{$attemptModel}] timed out after {$attemptTimeout}s or the connection failed.".($isLast ? '' : " Retrying with fallback model [{$this->fallbackModel}]."));

                continue;
            }

            $response = $candidate;
            $model = $attemptModel;

            if (! $isLast && $this->shouldFallback($candidate)) {
                Log::warning("Gemini primary model [{$attemptModel}] returned status {$candidate->status()}. Retrying with fallback model [{$this->fallbackModel}].");

                continue;
            }

            break;
        }

        if ($response === null) {
            throw new AiTimeoutException('AI vision request timed out or connection failed.', $lastConnectionError);
        }

        $latencyMs = (int) round((hrtime(true) - $startTime) / 1e6);

        if ($response->status() === 429) {
            throw new AiRateLimitedException('Gemini rate limit exceeded.');
        }

        if (! $response->successful()) {
            // Keep Gemini's status/body in the log only: passing its 401/403 through made the SPA
            // log the cashier out or show "Access Denied", and the raw body reached the toast
            Log::error("Gemini vision call failed with status {$response->status()}: ".substr($response->body(), 0, 500));

            throw new AiProviderException(
                'The AI service could not read this photo right now. Try again, or scan the barcodes.',
                502,
                upstreamStatus: $response->status(),
            );
        }

        $rawBody = $response->json();
        $text = $response->json('candidates.0.content.parts.0.text') ?? '';

        $parsed = $this->extractAndDecodeJson($text);

        return [$parsed, $rawBody, $model, $latencyMs];
    }

    /**
     * Sends the request with the optional speed fields; if the API answers 400 naming one
     * of them (older/other models), retries once without it and remembers that.
     */
    protected function requestWithOptionalFields(
        string $model,
        string $promptText,
        string $imageBytes,
        string $mime,
        array $schema,
        int $timeout
    ): Response {
        for ($try = 0; $try < 3; $try++) {
            $response = $this->executeRequest($model, $promptText, $imageBytes, $mime, $schema, $timeout);
            if ($response->status() !== 400) {
                return $response;
            }

            $body = strtolower($response->body());
            $rejected = null;
            if (! isset(self::$rejectedFields['thinking_config']) && str_contains($body, 'thinking')) {
                $rejected = 'thinking_config';
            } elseif (! isset(self::$rejectedFields['media_resolution']) && (str_contains($body, 'media_resolution') || str_contains($body, 'mediaresolution'))) {
                $rejected = 'media_resolution';
            }

            if ($rejected === null) {
                return $response;
            }

            self::$rejectedFields[$rejected] = true;
            Log::warning("Gemini model [{$model}] rejected generation_config.{$rejected}; retrying without it (remembered for this process).");
        }

        return $response;
    }

    /**
     * generation_config for one request (exposed for tests).
     *
     * @return array<string, mixed>
     */
    public function generationConfigFor(string $model, array $schema): array
    {
        $config = [
            'response_mime_type' => 'application/json',
            'response_schema' => $schema,
            'temperature' => 0.1,
            'max_output_tokens' => (int) config('ai.max_output_tokens', 2048),
        ];

        $thinking = self::thinkingConfigFor($model, (string) config('ai.gemini_thinking_level', 'minimal'));
        if ($thinking !== null && ! isset(self::$rejectedFields['thinking_config'])) {
            $config['thinking_config'] = $thinking;
        }

        $resolution = strtoupper(trim((string) config('ai.gemini_media_resolution', 'MEDIA_RESOLUTION_MEDIUM')));
        if (str_starts_with($resolution, 'MEDIA_RESOLUTION_') && ! isset(self::$rejectedFields['media_resolution'])) {
            $config['media_resolution'] = $resolution;
        }

        return $config;
    }

    /**
     * Executes the HTTP POST request to Gemini REST API.
     */
    protected function executeRequest(
        string $model,
        string $promptText,
        string $imageBytes,
        string $mime,
        array $schema,
        ?int $timeout = null
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
            'generation_config' => $this->generationConfigFor($model, $schema),
        ];

        return Http::withHeaders([
            'x-goog-api-key' => $this->apiKey,
        ])
            ->timeout($timeout ?? $this->timeout)
            ->post($url, $payload);
    }

    /**
     * Determines whether to trigger a fallback retry.
     */
    protected function shouldFallback(Response $response): bool
    {
        $status = $response->status();

        // 404 (model not found), 400 (bad model), 403 (unsupported region/model), 429, or any 5xx
        return (in_array($status, [400, 403, 404, 429], true) || $status >= 500)
            && $this->primaryModel !== $this->fallbackModel;
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
