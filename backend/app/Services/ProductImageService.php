<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class ProductImageService
{
    public const MAX_UPLOAD_BYTES = 1048576; // 1MB

    public const MAX_IMPORT_BYTES = 2097152; // 2MB

    public const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    /**
     * Check if a given URL belongs to Open Food Facts domains.
     */
    public static function isOffUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (! $host) {
            return false;
        }

        return (bool) preg_match('/(^|\.)openfoodfacts\.(org|net)$/i', $host);
    }

    /**
     * Validate SSRF safety of a remote URL.
     */
    public function validateUrlSafety(string $url): string
    {
        $parsed = parse_url($url);
        $scheme = strtolower($parsed['scheme'] ?? '');
        if (! in_array($scheme, ['http', 'https'], true)) {
            throw ValidationException::withMessages(['url' => ['URL must use HTTP or HTTPS scheme.']]);
        }

        $host = $parsed['host'] ?? null;
        if (! $host) {
            throw ValidationException::withMessages(['url' => ['Invalid remote image host.']]);
        }

        // Host allowlist: Open Food Facts & open catalogs
        if (! self::isOffUrl($url)) {
            throw ValidationException::withMessages(['url' => ['Image import is only allowed from Open Food Facts domains.']]);
        }

        // Reject private/loopback/cloud metadata IP ranges
        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);
        if ($ip === '127.0.0.1' || $ip === '::1' || str_starts_with($ip, '169.254.') || filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            throw ValidationException::withMessages(['url' => ['Access to internal or private addresses is forbidden.']]);
        }

        return $url;
    }

    /**
     * Store raw binary image for a product, replacing any previous image.
     */
    public function storeImage(Product $product, string $content, string $source = 'upload', ?string $sourceUrl = null): ProductImage
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->buffer($content);

        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            throw ValidationException::withMessages(['image' => ['Only JPEG, PNG, WebP, and GIF images are supported.']]);
        }

        $width = null;
        $height = null;
        $imageInfo = @getimagesizefromstring($content);
        if ($imageInfo) {
            $width = $imageInfo[0];
            $height = $imageInfo[1];
        }

        $sha256 = hash('sha256', $content);

        return DB::transaction(function () use ($product, $mime, $content, $width, $height, $sha256, $source, $sourceUrl) {
            ProductImage::where('product_id', $product->id)->delete();

            $image = ProductImage::create([
                'product_id' => $product->id,
                'mime' => $mime,
                'size_bytes' => strlen($content),
                'width' => $width,
                'height' => $height,
                'sha256' => $sha256,
                'source' => $source,
                'source_url' => $sourceUrl,
                'data' => $content,
            ]);

            $product->update([
                'image_url' => "/api/product-images/{$image->id}",
            ]);

            return $image;
        });
    }

    /**
     * Download and store image from Open Food Facts URL.
     */
    public function importFromUrl(Product $product, string $url): ProductImage
    {
        $this->validateUrlSafety($url);

        try {
            $response = Http::timeout(8)->get($url);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages(['url' => ['Failed to download remote image: '.$e->getMessage()]]);
        }

        if (! $response->successful()) {
            throw ValidationException::withMessages(['url' => ['Remote image responded with status code '.$response->status()]]);
        }

        $content = $response->body();
        if (strlen($content) > self::MAX_IMPORT_BYTES) {
            throw ValidationException::withMessages(['url' => ['Remote image exceeds maximum size limit of 2MB.']]);
        }

        return $this->storeImage($product, $content, 'import_off', $url);
    }

    /**
     * Delete existing image for a product.
     */
    public function deleteImage(Product $product): void
    {
        DB::transaction(function () use ($product) {
            ProductImage::where('product_id', $product->id)->delete();
            $product->update(['image_url' => null]);
        });
    }
}
