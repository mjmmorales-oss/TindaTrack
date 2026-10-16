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
    'timeout' => (int) env('AI_TIMEOUT', 30),
    'per_user_per_minute' => (int) env('AI_PER_USER_PER_MINUTE', 6),
    'daily_limit' => (int) env('AI_DAILY_LIMIT', 500),
    'max_image_kb' => (int) env('AI_MAX_IMAGE_KB', 1500),
    'save_scan_images' => (bool) env('AI_SAVE_SCAN_IMAGES', false),
];
