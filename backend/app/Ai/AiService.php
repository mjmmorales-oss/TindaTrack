<?php

namespace App\Ai;

use App\Ai\Exceptions\AiDailyLimitException;
use App\Ai\Exceptions\AiDisabledException;
use App\Ai\Exceptions\AiException;
use App\Ai\Exceptions\AiRateLimitedException;
use App\Models\AiScan;
use App\Models\AiScanImage;
use App\Models\Category;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Services\ProductLookupService;
use App\Support\Barcode;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;

class AiService
{
    public function __construct(
        protected VisionProvider $provider,
        protected ProductLookupService $productLookup
    ) {}

    /**
     * Returns the operational status and remaining quotas for AI services.
     *
     * @return array<string, mixed>
     */
    public function getStatus(?User $user = null): array
    {
        $enabled = $this->isAiEnabled();
        $providerName = (string) config('ai.provider', 'mock');
        $model = $providerName === 'gemini'
            ? (string) config('ai.gemini_model', 'gemini-3.8-flash')
            : 'mock-vision-v2';

        $dailyLimit = (int) config('ai.daily_limit', 500);
        $dailyUsed = (int) Cache::get('ai:daily_count:'.date('Y-m-d'), 0);
        $dailyRemaining = max(0, $dailyLimit - $dailyUsed);
        $perMinute = (int) config('ai.per_user_per_minute', 6);

        return [
            'enabled' => $enabled,
            'provider' => $providerName,
            'model' => $model,
            'demo' => $providerName === 'mock',
            'daily_remaining' => $dailyRemaining,
            'daily_limit' => $dailyLimit,
            'per_minute' => $perMinute,
        ];
    }

    /**
     * Checks if AI features are globally enabled in settings.
     */
    public function isAiEnabled(): bool
    {
        try {
            $setting = Setting::first();
            if ($setting && isset($setting->ai_enabled)) {
                return (bool) $setting->ai_enabled;
            }
        } catch (\Throwable) {
            // Table or column might not exist yet during migration
        }

        return true;
    }

    /**
     * Validates image binary or UploadedFile, verifying size and MIME type.
     *
     * @return array{bytes: string, mime: string, sha256: string}
     */
    public function validateImage(string|UploadedFile $image): array
    {
        if ($image instanceof UploadedFile) {
            if (! $image->isValid()) {
                throw new AiException('Uploaded image file is invalid.', 'ai_invalid_image', 422);
            }
            $bytes = file_get_contents($image->getRealPath());
        } else {
            $bytes = $image;
        }

        if (empty($bytes)) {
            throw new AiException('Image content is empty.', 'ai_invalid_image', 422);
        }

        $maxKb = (int) config('ai.max_image_kb', 1500);
        $maxBytes = $maxKb * 1024;
        if (strlen($bytes) > $maxBytes) {
            throw new AiException("Image size exceeds the maximum limit of {$maxKb} KB.", 'ai_oversize_image', 422);
        }

        $info = @getimagesizefromstring($bytes);
        if ($info === false) {
            throw new AiException('File is not a valid image.', 'ai_invalid_image', 422);
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        $mime = $info['mime'] ?? '';
        if (! in_array($mime, $allowedMimes, true)) {
            throw new AiException('Only JPEG, PNG, and WebP images are supported.', 'ai_invalid_image', 422);
        }

        return [
            'bytes' => $bytes,
            'mime' => $mime,
            'sha256' => hash('sha256', $bytes),
        ];
    }

    /**
     * Verifies per-user rate limit and global daily quota.
     */
    public function checkLimits(?User $user = null): void
    {
        if (! $this->isAiEnabled()) {
            throw new AiDisabledException('AI features are disabled in store settings.');
        }

        $userId = $user?->id ?? 'guest';
        $rateKey = "ai:user:{$userId}";
        $perMinute = (int) config('ai.per_user_per_minute', 6);

        if (RateLimiter::tooManyAttempts($rateKey, $perMinute)) {
            throw new AiRateLimitedException("AI request limit of {$perMinute} requests per minute exceeded.");
        }

        $dailyLimit = (int) config('ai.daily_limit', 500);
        $dailyKey = 'ai:daily_count:'.date('Y-m-d');
        $dailyCount = (int) Cache::get($dailyKey, 0);

        if ($dailyCount >= $dailyLimit) {
            throw new AiDailyLimitException("Daily AI request limit of {$dailyLimit} requests exceeded.");
        }
    }

    /**
     * Records a hit against the rate limiter and daily quota cache.
     */
    public function recordUsage(?User $user = null): void
    {
        $userId = $user?->id ?? 'guest';
        $rateKey = "ai:user:{$userId}";
        $perMinute = (int) config('ai.per_user_per_minute', 6);

        RateLimiter::hit($rateKey, 60);

        $dailyKey = 'ai:daily_count:'.date('Y-m-d');
        Cache::increment($dailyKey);
    }

    /**
     * Analyzes a basket photo and post-processes matching items against active catalog.
     *
     * @return array<string, mixed>
     */
    public function processBasket(string|UploadedFile $image, ?User $user = null, ?string $scannerSessionId = null): array
    {
        $this->checkLimits($user);
        $imageData = $this->validateImage($image);

        // Fetch active catalog (max 400 items)
        $query = Product::where('is_active', true)->with(['category', 'image']);
        $totalActive = $query->count();

        // 400 best selling or most recently updated
        $activeProducts = $query->orderByDesc('updated_at')->limit(400)->get();
        $catalogTruncated = $totalActive > 400;

        $catalog = $activeProducts->map(fn (Product $p) => [
            'id' => $p->id,
            'name' => $p->name,
            'size' => $p->unit ?? 'pc',
            'category' => $p->category?->name ?? '',
        ])->values()->all();

        $activeById = $activeProducts->keyBy('id');

        $visionResult = $this->provider->analyzeBasket(
            $imageData['bytes'],
            $imageData['mime'],
            $catalog
        );

        $this->recordUsage($user);

        // Post-processing for basket items:
        // 1. Group & merge duplicates by product_id
        $groupedItems = [];
        $unmatched = $visionResult->unmatched;

        foreach ($visionResult->items as $rawItem) {
            $productId = (int) ($rawItem['product_id'] ?? 0);
            $qty = min(99, max(1, (int) ($rawItem['quantity'] ?? 1)));
            $confidence = (float) ($rawItem['confidence'] ?? 0);
            $box = $rawItem['box_2d'] ?? [0, 0, 0, 0];

            // If not in active catalog, drop and move to unmatched
            if (! $activeById->has($productId)) {
                $unmatched[] = [
                    'label' => "Product #{$productId}",
                    'quantity' => $qty,
                    'box_2d' => $box,
                ];

                continue;
            }

            if (! isset($groupedItems[$productId])) {
                $groupedItems[$productId] = [
                    'product_id' => $productId,
                    'quantity' => $qty,
                    'confidence' => $confidence,
                    'box_2d' => $box,
                    'boxes' => [$box],
                ];
            } else {
                $groupedItems[$productId]['quantity'] = min(99, $groupedItems[$productId]['quantity'] + $qty);
                $groupedItems[$productId]['confidence'] = max($groupedItems[$productId]['confidence'], $confidence);
                $groupedItems[$productId]['boxes'][] = $box;
            }
        }

        // 2. Attach product snapshot, confidence bucket, exceeds_stock
        $finalItems = [];
        foreach ($groupedItems as $productId => $item) {
            /** @var Product $product */
            $product = $activeById->get($productId);
            $stock = (int) ($product->stock_quantity ?? 0);
            $conf = $item['confidence'];

            $bucket = match (true) {
                $conf >= 0.8 => 'high',
                $conf >= 0.5 => 'check',
                default => 'low',
            };

            $finalItems[] = [
                'product_id' => $productId,
                'quantity' => $item['quantity'],
                'confidence' => $conf,
                'confidence_bucket' => $bucket,
                'box_2d' => $item['box_2d'],
                'boxes' => $item['boxes'],
                'exceeds_stock' => $item['quantity'] > $stock,
                'product' => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => (float) $product->price,
                    'stock' => $stock,
                    'image_url' => $product->image_url ?? (($product->relationLoaded('image') && $product->image) ? url("/api/products/{$product->id}/image") : null),
                    'unit' => $product->unit ?? 'pc',
                    'barcode' => $product->barcode,
                ],
            ];
        }

        $resultPayload = [
            'items' => $finalItems,
            'unmatched' => $unmatched,
        ];

        $this->lazyPruneImages();

        $imageId = null;
        if ($this->shouldSaveScanImages()) {
            $scanImg = AiScanImage::create([
                'mime_type' => $imageData['mime'],
                'image_size' => strlen($imageData['bytes']),
                'image_data' => $imageData['bytes'],
            ]);
            $imageId = $scanImg->id;
        }

        $scan = null;
        $userId = $user?->id ?? User::value('id');
        if ($userId) {
            $scan = AiScan::create([
                'user_id' => $userId,
                'scanner_session_id' => $scannerSessionId,
                'type' => 'basket',
                'provider' => config('ai.provider', 'mock'),
                'model' => $visionResult->model,
                'prompt_version' => $visionResult->promptVersion,
                'image_sha256' => $imageData['sha256'],
                'image_id' => $imageId,
                'latency_ms' => $visionResult->latencyMs,
                'status' => 'ok',
                'raw_response' => is_array($visionResult->raw) ? $visionResult->raw : ['raw' => $visionResult->raw],
                'result' => $resultPayload,
                'catalog_size' => $totalActive,
                'catalog_truncated' => $catalogTruncated,
            ]);

            if ($imageId) {
                AiScanImage::where('id', $imageId)->update(['ai_scan_id' => $scan->id]);
            }
        }

        return [
            'scan_id' => $scan?->id,
            'provider' => config('ai.provider', 'mock'),
            'model' => $visionResult->model,
            'latency_ms' => $visionResult->latencyMs,
            'prompt_version' => $visionResult->promptVersion,
            'image_sha256' => $imageData['sha256'],
            'catalog_size' => $totalActive,
            'catalog_truncated' => $catalogTruncated,
            'items' => $finalItems,
            'unmatched' => $unmatched,
            'raw' => $visionResult->raw,
        ];
    }

    /**
     * Analyzes an intake photo of up to 5 new products, performing GTIN enrichment and duplicate detection.
     *
     * @return array<string, mixed>
     */
    public function processNewProducts(string|UploadedFile $image, ?User $user = null): array
    {
        $this->checkLimits($user);
        $imageData = $this->validateImage($image);

        $categories = Category::all(['id', 'name'])->toArray();
        $validCatIds = array_column($categories, 'id');

        $visionResult = $this->provider->analyzeNewProducts(
            $imageData['bytes'],
            $imageData['mime'],
            $categories
        );

        $this->recordUsage($user);

        // Preload all store products for duplicate detection
        $existingProducts = Product::all(['id', 'name', 'barcode', 'category_id', 'price', 'unit']);

        $processedProducts = [];
        foreach ($visionResult->products as $raw) {
            $name = trim((string) ($raw['name'] ?? ''));
            $brand = trim((string) ($raw['brand'] ?? ''));
            $size = trim((string) ($raw['size'] ?? ''));
            $catId = isset($raw['category_id']) && in_array((int) $raw['category_id'], $validCatIds, true)
                ? (int) $raw['category_id']
                : null;
            $estCount = max(1, (int) ($raw['estimated_count'] ?? 1));
            $barcodeText = trim((string) ($raw['barcode_text'] ?? ''));
            $barcodeText = $barcodeText !== '' ? $barcodeText : null;
            $confidence = (float) ($raw['confidence'] ?? 0.8);
            $box = $raw['box_2d'] ?? [0, 0, 0, 0];

            $enrichment = null;

            // GTIN barcode enrichment
            if ($barcodeText && Barcode::isValidGtin($barcodeText)) {
                try {
                    $lookup = $this->productLookup->lookup($barcodeText);
                    if (! empty($lookup['catalog']['found'])) {
                        $cat = $lookup['catalog'];
                        $enrichment = [
                            'source' => $cat['source'] ?? 'barcode_lookup',
                            'name' => $cat['name'] ?? null,
                            'brand' => $cat['brand'] ?? null,
                            'size' => $cat['size'] ?? null,
                            'image_url' => $cat['image_url'] ?? null,
                        ];

                        if (empty($name) && ! empty($cat['name'])) {
                            $name = $cat['name'];
                        }
                    }
                } catch (\Throwable) {
                    // Fail silently on enrichment error
                }
            }

            // Duplicate detection against existing store products
            $duplicateOf = $this->findDuplicateProduct($name, $barcodeText, $existingProducts);

            $processedProducts[] = [
                'name' => $name,
                'brand' => $brand,
                'size' => $size,
                'category_id' => $catId,
                'estimated_count' => $estCount,
                'barcode_text' => $barcodeText,
                'confidence' => $confidence,
                'box_2d' => $box,
                'enrichment' => $enrichment,
                'duplicate_of' => $duplicateOf,
            ];
        }

        $resultPayload = [
            'products' => $processedProducts,
        ];

        $this->lazyPruneImages();

        $imageId = null;
        if ($this->shouldSaveScanImages()) {
            $scanImg = AiScanImage::create([
                'mime_type' => $imageData['mime'],
                'image_size' => strlen($imageData['bytes']),
                'image_data' => $imageData['bytes'],
            ]);
            $imageId = $scanImg->id;
        }

        $scan = null;
        $userId = $user?->id ?? User::value('id');
        if ($userId) {
            $scan = AiScan::create([
                'user_id' => $userId,
                'scanner_session_id' => null,
                'type' => 'products',
                'provider' => config('ai.provider', 'mock'),
                'model' => $visionResult->model,
                'prompt_version' => $visionResult->promptVersion,
                'image_sha256' => $imageData['sha256'],
                'image_id' => $imageId,
                'latency_ms' => $visionResult->latencyMs,
                'status' => 'ok',
                'raw_response' => is_array($visionResult->raw) ? $visionResult->raw : ['raw' => $visionResult->raw],
                'result' => $resultPayload,
                'catalog_size' => count($categories),
                'catalog_truncated' => false,
            ]);

            if ($imageId) {
                AiScanImage::where('id', $imageId)->update(['ai_scan_id' => $scan->id]);
            }
        }

        return [
            'scan_id' => $scan?->id,
            'provider' => config('ai.provider', 'mock'),
            'model' => $visionResult->model,
            'latency_ms' => $visionResult->latencyMs,
            'prompt_version' => $visionResult->promptVersion,
            'image_sha256' => $imageData['sha256'],
            'products' => $processedProducts,
            'raw' => $visionResult->raw,
        ];
    }

    /**
     * Checks if a candidate product is an exact barcode match or fuzzy name match.
     *
     * @param  Collection<int, Product>  $existingProducts
     * @return array{id: int, name: string, reason: string, similarity?: float}|null
     */
    protected function findDuplicateProduct(?string $candidateName, ?string $barcode, $existingProducts): ?array
    {
        // 1. Exact barcode match
        if ($barcode) {
            $normBarcode = Barcode::normalize($barcode);
            foreach ($existingProducts as $p) {
                if ($p->barcode && Barcode::normalize($p->barcode) === $normBarcode) {
                    return [
                        'id' => $p->id,
                        'name' => $p->name,
                        'reason' => 'barcode',
                    ];
                }
            }
        }

        // 2. Fuzzy name match (>= 85% similarity)
        if (! empty($candidateName)) {
            $normCandidate = $this->normalizeForFuzzyMatch($candidateName);
            $bestMatch = null;
            $bestSim = 0.0;

            foreach ($existingProducts as $p) {
                $normExisting = $this->normalizeForFuzzyMatch($p->name);
                similar_text($normCandidate, $normExisting, $percent);

                if ($percent >= 85.0 && $percent > $bestSim) {
                    $bestSim = $percent;
                    $bestMatch = [
                        'id' => $p->id,
                        'name' => $p->name,
                        'reason' => 'name',
                        'similarity' => round($percent / 100, 2),
                    ];
                }
            }

            if ($bestMatch) {
                return $bestMatch;
            }
        }

        return null;
    }

    /**
     * Normalizes a product name for fuzzy matching (lowercase, removes punctuation, stop words).
     */
    protected function normalizeForFuzzyMatch(string $name): string
    {
        $lower = strtolower($name);
        $cleaned = preg_replace('/[^a-z0-9\s]/', ' ', $lower) ?? '';
        $words = preg_split('/\s+/', $cleaned, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $stopWords = [
            'g', 'kg', 'ml', 'l', 'pc', 'pcs', 'pack', 'packs', 'can', 'cans',
            'bottle', 'bottles', 'sachet', 'sachets', 'box', 'boxes',
        ];

        $filtered = array_filter($words, fn ($w) => ! in_array($w, $stopWords, true));

        return implode(' ', $filtered);
    }

    /**
     * Determines whether scan images should be persisted to the database.
     */
    protected function shouldSaveScanImages(): bool
    {
        try {
            $setting = Setting::first();
            if ($setting && isset($setting->ai_save_scan_images)) {
                return (bool) $setting->ai_save_scan_images;
            }
        } catch (\Throwable) {
        }

        return (bool) config('ai.save_scan_images', false);
    }

    /**
     * Lazily purges stored scan images older than 30 days.
     */
    protected function lazyPruneImages(): void
    {
        try {
            if (mt_rand(1, 50) === 1) {
                AiScanImage::where('created_at', '<', now()->subDays(30))->delete();
            }
        } catch (\Throwable) {
        }
    }
}
