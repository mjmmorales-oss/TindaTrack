<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductEmbeddingResource;
use App\Models\Product;
use App\Models\ProductEmbedding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductEmbeddingController extends Controller
{
    /**
     * Lists product embeddings for building the local visual search index.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProductEmbedding::query();

        if ($request->filled('model')) {
            $query->where('model', $request->query('model'));
        }

        $embeddings = $query->latest()->get();

        return response()->json([
            'data' => ProductEmbeddingResource::collection($embeddings),
        ]);
    }

    /**
     * Stores a new visual embedding vector for a product (owner only).
     */
    public function store(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'model' => ['required', 'string', 'max:100'],
            'source' => ['required', 'string', 'in:product_image,reference_photo,correction'],
            'vector' => ['required', 'array'],
            'vector.*' => ['numeric'],
            'image_sha256' => ['nullable', 'string', 'max:64'],
        ]);

        $model = $validated['model'];

        // Cap reference vectors at 10 per product (purge oldest if needed)
        $existingCount = $product->embeddings()->where('model', $model)->count();
        if ($existingCount >= 10) {
            $oldest = $product->embeddings()
                ->where('model', $model)
                ->oldest()
                ->first();
            $oldest?->delete();
        }

        $embedding = $product->embeddings()->create([
            'model' => $model,
            'source' => $validated['source'],
            'vector' => $validated['vector'],
            'image_sha256' => $validated['image_sha256'] ?? null,
        ]);

        return response()->json([
            'data' => new ProductEmbeddingResource($embedding),
            'message' => 'Visual embedding stored.',
        ], 201);
    }

    /**
     * Removes an embedding vector (owner only).
     */
    public function destroy(Product $product, int $id): JsonResponse
    {
        $embedding = $product->embeddings()->findOrFail($id);
        $embedding->delete();

        return response()->json([
            'message' => 'Embedding removed successfully.',
        ]);
    }
}
