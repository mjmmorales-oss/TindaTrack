<?php

namespace App\Ai;

interface VisionProvider
{
    /**
     * Identifies items in a basket photo and matches against the catalog.
     *
     * @param  string  $imageBytes  Raw binary image content
     * @param  string  $mime  e.g. image/jpeg, image/png, image/webp
     * @param  array<int, array<string, mixed>>  $catalog  Compact catalog array
     */
    public function analyzeBasket(string $imageBytes, string $mime, array $catalog): VisionResult;

    /**
     * Identifies up to 5 new products in an intake photo.
     *
     * @param  string  $imageBytes  Raw binary image content
     * @param  string  $mime  e.g. image/jpeg, image/png, image/webp
     * @param  array<int, array<string, mixed>>  $categories  Store categories list
     */
    public function analyzeNewProducts(string $imageBytes, string $mime, array $categories): VisionResult;

    /**
     * Verifies provider connectivity and returns diagnostic information.
     *
     * @return array{ok: bool, provider: string, model: string, latency_ms: int, message?: string}
     */
    public function ping(): array;
}
