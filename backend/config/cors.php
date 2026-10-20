<?php

return [
    'paths' => ['api/*', 'up'],
    'allowed_methods' => ['*'],
    // CORS_ALLOWED_ORIGINS (comma list) plus FRONTEND_URL, so setting only FRONTEND_URL on Railway works
    'allowed_origins' => array_values(array_unique(array_filter(array_map(
        fn ($origin) => rtrim(trim($origin), '/'),
        array_merge(
            explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
            [(string) env('FRONTEND_URL', 'http://localhost:5173')],
        ),
    )))),
    'allowed_origins_patterns' => array_values(array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGIN_PATTERNS', ''))))),
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false, // bearer tokens, no cookies
];
