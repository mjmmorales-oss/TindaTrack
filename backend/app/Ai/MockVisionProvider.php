<?php

namespace App\Ai;

use App\Ai\Prompts\BasketPrompt;
use App\Ai\Prompts\ProductPrompt;

class MockVisionProvider implements VisionProvider
{
    /**
     * Identifies items in a basket photo and matches against the catalog.
     * Deterministic based on the sha256 hash of image bytes.
     *
     * @param  array<int, array<string, mixed>>  $catalog
     */
    public function analyzeBasket(string $imageBytes, string $mime, array $catalog): VisionResult
    {
        $hash = hash('sha256', $imageBytes);
        $seed = hexdec(substr($hash, 0, 8));

        $items = [];
        $unmatched = [
            [
                'label' => 'donut',
                'quantity' => 1,
                'box_2d' => [500, 600, 800, 900],
            ],
        ];

        if (! empty($catalog)) {
            $catalogCount = count($catalog);
            // 2 to 4 items (or catalogCount if smaller)
            $numItems = min($catalogCount, 2 + ($seed % 3));
            $step = max(1, (int) floor($catalogCount / $numItems));

            for ($i = 0; $i < $numItems; $i++) {
                $catalogIndex = ($i * $step + ($seed % $catalogCount)) % $catalogCount;
                $product = $catalog[$catalogIndex];
                $qty = 1 + (($seed + $i) % 3); // 1-3
                $confidence = round(0.70 + ((($seed + ($i * 7)) % 29) / 100), 2);

                $ymin = 100 + ($i * 180);
                $xmin = 100 + ($i * 120);
                $ymax = min(950, $ymin + 250);
                $xmax = min(950, $xmin + 250);

                $items[] = [
                    'product_id' => (int) ($product['id'] ?? ($i + 1)),
                    'quantity' => $qty,
                    'confidence' => $confidence,
                    'box_2d' => [$ymin, $xmin, $ymax, $xmax],
                ];
            }
        }

        return new VisionResult(
            items: $items,
            unmatched: $unmatched,
            raw: ['mock' => true, 'seed' => $seed],
            model: 'mock-vision-v2',
            latencyMs: 45,
            promptVersion: BasketPrompt::VERSION
        );
    }

    /**
     * Identifies up to 5 new products in an intake photo.
     * Deterministic based on the sha256 hash of image bytes.
     *
     * @param  array<int, array<string, mixed>>  $categories
     */
    public function analyzeNewProducts(string $imageBytes, string $mime, array $categories): VisionResult
    {
        $hash = hash('sha256', $imageBytes);
        $seed = hexdec(substr($hash, 0, 8));

        $catId1 = $categories[0]['id'] ?? null;
        $catId2 = $categories[1]['id'] ?? $catId1;
        $catId3 = $categories[2]['id'] ?? $catId1;

        $products = [
            [
                'name' => 'Silver Swan Soy Sauce',
                'brand' => 'Silver Swan',
                'size' => '350ml',
                'category_id' => $catId1 ? (int) $catId1 : null,
                'estimated_count' => 1 + ($seed % 3),
                'barcode_text' => '4800016644813',
                'confidence' => 0.94,
                'box_2d' => [120, 100, 650, 380],
            ],
            [
                'name' => 'Datu Puti Vinegar',
                'brand' => 'Datu Puti',
                'size' => '350ml',
                'category_id' => $catId2 ? (int) $catId2 : null,
                'estimated_count' => 1 + (($seed + 1) % 2),
                'barcode_text' => '4800016644820',
                'confidence' => 0.89,
                'box_2d' => [120, 420, 650, 700],
            ],
            [
                'name' => 'Lucky Me Pancit Canton Original',
                'brand' => 'Lucky Me',
                'size' => '80g',
                'category_id' => $catId3 ? (int) $catId3 : null,
                'estimated_count' => 2 + ($seed % 4),
                'barcode_text' => '4807770270017',
                'confidence' => 0.91,
                'box_2d' => [680, 200, 920, 800],
            ],
        ];

        return new VisionResult(
            items: [],
            unmatched: [],
            raw: ['mock' => true, 'seed' => $seed],
            model: 'mock-vision-v2',
            latencyMs: 50,
            promptVersion: ProductPrompt::VERSION,
            products: $products,
            moreThanFive: false
        );
    }

    /**
     * Verifies provider connectivity.
     */
    public function ping(): array
    {
        return [
            'ok' => true,
            'provider' => 'mock',
            'model' => 'mock-vision-v2',
            'latency_ms' => 12,
            'message' => 'Mock vision provider operational (deterministic offline mode).',
        ];
    }
}
