<?php

test('tindatrack:check --production warns about debug, AI key and a bad FRONTEND_URL', function () {
    config([
        'app.debug' => true,
        'app.frontend_url' => 'https://tindatrack.vercel.app/',
        'ai.provider' => 'gemini',
        'ai.gemini_api_key' => null,
    ]);

    $this->artisan('tindatrack:check', ['--production' => true])
        ->expectsOutputToContain('APP_DEBUG=true')
        ->expectsOutputToContain('trailing slash')
        ->expectsOutputToContain('GEMINI_API_KEY is empty');
});

test('tindatrack:check --production passes the config checks when settings are right', function () {
    config([
        'app.debug' => false,
        'app.frontend_url' => 'https://tindatrack.vercel.app',
        'cors.allowed_origins' => ['https://tindatrack.vercel.app'],
        'ai.provider' => 'mock',
        'ai.max_image_kb' => 5120,
    ]);

    $this->artisan('tindatrack:check', ['--production' => true])
        ->doesntExpectOutputToContain('APP_DEBUG=true')
        ->doesntExpectOutputToContain('FRONTEND_URL');
});
