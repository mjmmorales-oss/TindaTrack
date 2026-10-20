<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\ProductImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProductImageController extends Controller
{
    public function __construct(
        protected ProductImageService $imageService
    ) {}

    /**
     * Public endpoint to stream binary product image with 1-year immutable caching and ETag.
     */
    public function show(Request $request, string $ulid): Response
    {
        $image = ProductImage::findOrFail($ulid);

        $etag = '"'.$image->sha256.'"';
        $ifNoneMatch = $request->header('If-None-Match');

        if ($ifNoneMatch === $etag || $ifNoneMatch === $image->sha256) {
            return response('', 304, [
                'ETag' => $etag,
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ]);
        }

        $content = is_resource($image->data) ? stream_get_contents($image->data) : $image->data;

        return response($content, 200, [
            'Content-Type' => $image->mime,
            'Content-Length' => strlen($content),
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'ETag' => $etag,
        ]);
    }

    /**
     * Upload an image file for a product (owner only).
     */
    public function upload(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'max:1024'], // 1MB
            // ai_crop: AI Stock-In uploads each product's crop from the shelf photo
            'source' => ['nullable', 'string', 'in:upload,camera,ai_crop'],
        ]);

        $file = $request->file('image');
        $content = file_get_contents($file->getRealPath());
        $source = $request->input('source', 'upload');

        $this->imageService->storeImage($product, $content, $source);

        return response()->json([
            'data' => new ProductResource($product->fresh(['category', 'image'])),
        ]);
    }

    /**
     * Import a product image from Open Food Facts URL with SSRF protection (owner only).
     */
    public function import(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'string', 'url', 'max:2048'],
        ]);

        $this->imageService->importFromUrl($product, $validated['url']);

        return response()->json([
            'data' => new ProductResource($product->fresh(['category', 'image'])),
        ]);
    }

    /**
     * Delete a product image (owner only).
     */
    public function destroy(Product $product): JsonResponse
    {
        $this->imageService->deleteImage($product);

        return response()->json([
            'data' => new ProductResource($product->fresh(['category', 'image'])),
        ]);
    }
}
