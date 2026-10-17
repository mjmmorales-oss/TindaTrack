<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ScannerEvent;
use App\Models\StockMovement;
use App\Services\ProductImageService;
use App\Support\Barcode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ProductBulkController extends Controller
{
    public function __construct(
        protected ProductImageService $imageService
    ) {}

    /**
     * Transactional bulk creation of up to 10 products from intake scan.
     */
    public function bulk(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'products' => ['required', 'array', 'min:1', 'max:10'],
            'products.*.name' => ['required', 'string', 'max:255'],
            'products.*.brand' => ['nullable', 'string', 'max:100'],
            'products.*.size' => ['nullable', 'string', 'max:50'],
            'products.*.category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'products.*.barcode' => ['nullable', 'string', 'max:100', 'distinct', 'unique:products,barcode'],
            'products.*.price' => ['required', 'numeric', 'min:0'],
            'products.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'products.*.stock_quantity' => ['required', 'integer', 'min:0'],
            'products.*.image_url' => ['nullable', 'string', 'max:2048'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $items = $validator->validated()['products'];
        $created = [];

        DB::transaction(function () use ($items, $request, &$created) {
            foreach ($items as $row) {
                $name = trim($row['name']);
                $barcode = ! empty($row['barcode']) ? Barcode::normalize(trim($row['barcode'])) : null;
                $stock = (int) $row['stock_quantity'];

                // Generate a unique SKU
                $cleanName = preg_replace('/[^A-Za-z0-9]/', '', $name) ?? '';
                $prefix = strtoupper(substr($cleanName, 0, 4));
                if (strlen($prefix) < 3) {
                    $prefix = 'ITEM';
                }

                do {
                    $sku = $prefix.'-'.strtoupper(Str::random(6));
                } while (Product::where('sku', $sku)->exists());

                $product = Product::create([
                    'category_id' => $row['category_id'] ?? null,
                    'name' => $name,
                    'sku' => $sku,
                    'barcode' => $barcode,
                    'brand' => $row['brand'] ?? null,
                    'size' => $row['size'] ?? null,
                    'unit' => 'pc',
                    'price' => (float) $row['price'],
                    'cost_price' => isset($row['cost_price']) ? (float) $row['cost_price'] : 0,
                    'stock_quantity' => $stock,
                    'reorder_level' => 5,
                    'is_active' => true,
                    'image_url' => $row['image_url'] ?? null,
                ]);

                // Record initial stock movement if quantity > 0
                if ($stock > 0) {
                    StockMovement::create([
                        'product_id' => $product->id,
                        'user_id' => $request->user()->id,
                        'type' => 'restock',
                        'quantity' => $stock,
                        'stock_after' => $stock,
                        'notes' => 'Initial stock (bulk intake)',
                    ]);
                }

                // If online image_url provided, attempt auto-import
                if (! empty($row['image_url']) && preg_match('#^https?://#i', $row['image_url'])) {
                    try {
                        $this->imageService->importFromUrl($product, $row['image_url']);
                    } catch (\Throwable) {
                        // Keep image_url as external fallback
                    }
                }

                // Resolve any unknown-barcode events from phone scanners
                if ($barcode) {
                    ScannerEvent::where('barcode', $barcode)
                        ->whereNull('resolved_at')
                        ->update([
                            'resolved_at' => now(),
                            'product_id' => $product->id,
                            'status' => 'found',
                        ]);
                }

                $created[] = $product->fresh(['category', 'image']);
            }
        });

        return response()->json([
            'data' => ProductResource::collection($created),
            'message' => count($created).' products created successfully.',
        ], 201);
    }
}
