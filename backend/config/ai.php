<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI Vision Provider
    |--------------------------------------------------------------------------
    |
    | Supported: "gemini", "mock"
    | Default: "gemini" if GEMINI_API_KEY is present, otherwise "mock".
    |
    */
    'provider' => env('AI_PROVIDER', env('GEMINI_API_KEY') ? 'gemini' : 'mock'),

    /*
    |--------------------------------------------------------------------------
    | Google Gemini Vision Configuration
    |--------------------------------------------------------------------------
    */
    'gemini_api_key' => env('GEMINI_API_KEY'),
    'gemini_model' => env('GEMINI_MODEL', 'gemini-3.8-flash'),
    'gemini_fallback_model' => env('GEMINI_FALLBACK_MODEL', 'gemini-3.5-flash-lite'),
    'gemini_base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),

    /*
    |--------------------------------------------------------------------------
    | Operational Guardrails & Quotas
    |--------------------------------------------------------------------------
    |
    | Prevents exceeding Google AI Studio free tier limits (15 RPM / 1,500 RPD).
    |
    */
    // Used by `ai:ping`. Scans use the primary/fallback timeouts below.
    'timeout' => (int) env('AI_TIMEOUT', 30),

    /*
    | Speed (v2.3). Primary gets a short timeout so a stuck call fails over fast:
    | worst case ≈ primary + fallback (~27 s) instead of 2 × AI_TIMEOUT (60 s).
    */
    'primary_timeout' => (int) env('AI_PRIMARY_TIMEOUT', 12),
    'fallback_timeout' => (int) env('AI_FALLBACK_TIMEOUT', 15),

    // Gemini "thinking" adds most of the latency for a constrained "match to this list"
    // task. 3.x models get thinking_level; 2.x models get thinking_budget (minimal → 0).
    // Values: minimal | low | medium | high | none (don't send the field).
    'gemini_thinking_level' => env('GEMINI_THINKING_LEVEL', 'minimal'),

    // Fewer image tokens: MEDIA_RESOLUTION_LOW | MEDIA_RESOLUTION_MEDIUM | MEDIA_RESOLUTION_HIGH | none
    'gemini_media_resolution' => env('GEMINI_MEDIA_RESOLUTION', 'MEDIA_RESOLUTION_MEDIUM'),

    'max_output_tokens' => (int) env('AI_MAX_OUTPUT_TOKENS', 2048),

    // Basket catalog prompt: above this many active products, send only products with an
    // image or a sale in the last 30 days (still capped at 400)
    'catalog_focus_threshold' => (int) env('AI_CATALOG_FOCUS_THRESHOLD', 150),
    'per_user_per_minute' => (int) env('AI_PER_USER_PER_MINUTE', 6),
    'daily_limit' => (int) env('AI_DAILY_LIMIT', 500),
    // Must stay above the SPA's AI photo cap (600 KB, AI_IMAGE_OPTIONS in src/config/ai.js)
    'max_image_kb' => (int) env('AI_MAX_IMAGE_KB', 5120),
    'save_scan_images' => (bool) env('AI_SAVE_SCAN_IMAGES', false),
];
