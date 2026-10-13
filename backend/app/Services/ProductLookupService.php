<?php

namespace App\Services;

use App\Http\Resources\ProductResource;
use App\Models\BarcodeCatalog;
use App\Models\Product;
use App\Support\Barcode;
use App\Support\CategoryGuesser;
use Illuminate\Support\Facades\Http;

class ProductLookupService
{
    /**
     * Resolves a barcode against local inventory, local cache, and Open Food Facts.
     *
     * @return array{barcode: string, local_product: ProductResource|null, catalog: array|null}
     */
    public function lookup(string $barcode): array
    {
        $normalized = Barcode::normalize($barcode);

        // 1. Local products hit short-circuits
        $localProduct = Product::with('category')->where('barcode', $normalized)->first();
        if ($localProduct) {
            return [
                'barcode' => $normalized,
                'local_product' => new ProductResource($localProduct),
                'catalog' => null,
            ];
        }

        // 2. Fresh barcode_catalog cache hit
        $cached = BarcodeCatalog::where('barcode', $normalized)->first();
        if ($cached) {
            $found = (bool) $cached->found;
            $maxAgeDays = $found ? 30 : 1;

            if ($cached->fetched_at && $cached->fetched_at->gt(now()->subDays($maxAgeDays))) {
                if (! $found) {
                    return [
                        'barcode' => $normalized,
                        'local_product' => null,
                        'catalog' => [
                            'found' => false,
                            'source' => null,
                            'name' => null,
                            'brand' => null,
                            'size' => null,
                            'image_url' => null,
                            'suggested_category_id' => null,
                            'attribution' => null,
                        ],
                    ];
                }

                $suggestedCat = CategoryGuesser::guess($cached->categories ?? [], $cached->name ?? '');

                return [
                    'barcode' => $normalized,
                    'local_product' => null,
                    'catalog' => [
                        'found' => true,
                        'source' => $cached->source,
                        'name' => $cached->name,
                        'brand' => $cached->brand,
                        'size' => $cached->size,
                        'image_url' => $cached->image_url,
                        'suggested_category_id' => $suggestedCat,
                        'attribution' => self::getAttribution($cached->source),
                    ],
                ];
            }
        }

        // 3. Online lookup via Open Food Facts / Open Products / Open Beauty Facts
        $enabled = (bool) config('services.openfoodfacts.enabled', true);
        if (! $enabled || ! Barcode::isValidGtin($normalized) || Barcode::isInternal($normalized)) {
            return [
                'barcode' => $normalized,
                'local_product' => null,
                'catalog' => [
                    'found' => false,
                    'source' => null,
                    'name' => null,
                    'brand' => null,
                    'size' => null,
                    'image_url' => null,
                    'suggested_category_id' => null,
                    'attribution' => null,
                ],
            ];
        }

        $baseUrls = config('services.openfoodfacts.base_urls', [
            'openfoodfacts' => 'https://world.openfoodfacts.org',
            'openproductsfacts' => 'https://world.openproductsfacts.org',
            'openbeautyfacts' => 'https://world.openbeautyfacts.org',
        ]);
        $userAgent = config('services.openfoodfacts.user_agent', 'TindaTrack/1.1 (your-email@example.com)');
        $timeout = (int) config('services.openfoodfacts.timeout', 5);

        $hit = null;
        $hitSource = null;
        $transientFailureOccurred = false;

        foreach ($baseUrls as $sourceKey => $baseUrl) {
            try {
                $response = Http::withHeaders(['User-Agent' => $userAgent])
                    ->timeout($timeout)
                    ->retry(1, 300)
                    ->get("{$baseUrl}/api/v2/product/{$normalized}.json", [
                        'fields' => 'code,product_name,product_name_en,generic_name,brands,quantity,image_front_url,image_url,categories_tags',
                    ]);

                if ($response->status() === 429 || $response->serverError()) {
                    $transientFailureOccurred = true;

                    continue;
                }

                if ($response->successful()) {
                    $json = $response->json();
                    if (isset($json['status']) && (int) $json['status'] === 1 && isset($json['product'])) {
                        $p = $json['product'];
                        $name = trim($p['product_name'] ?? $p['product_name_en'] ?? $p['generic_name'] ?? '');
                        if ($name !== '') {
                            $hit = $p;
                            $hitSource = $sourceKey;
                            break;
                        }
                    }
                }
            } catch (\Throwable) {
                $transientFailureOccurred = true;

                continue;
            }
        }

        // 4. Hit found -> cache and return
        if ($hit !== null) {
            $name = trim($hit['product_name'] ?? $hit['product_name_en'] ?? $hit['generic_name'] ?? '');
            $brandsList = explode(',', $hit['brands'] ?? '');
            $brand = ! empty($brandsList[0]) ? trim($brandsList[0]) : null;
            $size = ! empty($hit['quantity']) ? trim($hit['quantity']) : null;
            $imageUrl = $hit['image_front_url'] ?? $hit['image_url'] ?? null;
            $categories = $hit['categories_tags'] ?? [];

            BarcodeCatalog::updateOrCreate(
                ['barcode' => $normalized],
                [
                    'found' => true,
                    'source' => $hitSource,
                    'name' => $name,
                    'brand' => $brand,
                    'size' => $size,
                    'image_url' => $imageUrl,
                    'categories' => $categories,
                    'fetched_at' => now(),
                ]
            );

            $suggestedCat = CategoryGuesser::guess($categories, $name);

            return [
                'barcode' => $normalized,
                'local_product' => null,
                'catalog' => [
                    'found' => true,
                    'source' => $hitSource,
                    'name' => $name,
                    'brand' => $brand,
                    'size' => $size,
                    'image_url' => $imageUrl,
                    'suggested_category_id' => $suggestedCat,
                    'attribution' => self::getAttribution($hitSource),
                ],
            ];
        }

        // 5. Miss: cache only if no transient network/server failure occurred
        if (! $transientFailureOccurred) {
            BarcodeCatalog::updateOrCreate(
                ['barcode' => $normalized],
                [
                    'found' => false,
                    'source' => null,
                    'name' => null,
                    'brand' => null,
                    'size' => null,
                    'image_url' => null,
                    'categories' => null,
                    'fetched_at' => now(),
                ]
            );
        }

        return [
            'barcode' => $normalized,
            'local_product' => null,
            'catalog' => [
                'found' => false,
                'source' => null,
                'name' => null,
                'brand' => null,
                'size' => null,
                'image_url' => null,
                'suggested_category_id' => null,
                'attribution' => null,
            ],
        ];
    }

    /**
     * Maps catalog source to ODbL attribution label.
     */
    public static function getAttribution(?string $source): ?string
    {
        return match ($source) {
            'openproductsfacts' => 'Data from Open Products Facts (ODbL)',
            'openbeautyfacts' => 'Data from Open Beauty Facts (ODbL)',
            'openfoodfacts' => 'Data from Open Food Facts (ODbL)',
            default => 'Data from Open Food Facts (ODbL)',
        };
    }
}
