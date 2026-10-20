<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\ScannerEvent;
use App\Models\StockMovement;
use App\Services\ProductImageService;
use App\Support\Barcode;
use App\Support\ProductUnits;
use App\Support\SkuGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

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
        $rawProducts = $request->input('products', []);
        if (is_array($rawProducts)) {
            $normalizedProducts = array_map(function ($row) {
                if (! is_array($row)) {
                    return $row;
                }
                if (isset($row['initial_stock']) && ! isset($row['stock_quantity'])) {
                    $row['stock_quantity'] = $row['initial_stock'];
                }
                if (isset($row['cost']) && ! isset($row['cost_price'])) {
                    $row['cost_price'] = $row['cost'];
                }
                if (isset($row['min_stock']) && ! isset($row['reorder_level'])) {
                    $row['reorder_level'] = $row['min_stock'];
                }

                return $row;
            }, $rawProducts);
            $request->merge(['products' => $normalizedProducts]);
        }

        $validator = Validator::make($request->all(), [
            'products' => ['required', 'array', 'min:1', 'max:10'],
            'products.*.name' => ['required', 'string', 'max:255'],
            'products.*.sku' => ['nullable', 'string', 'max:50', 'distinct', 'unique:products,sku'],
            // Same limits as single create (ProductController@store)
            'products.*.brand' => ['nullable', 'string', 'max:255'],
            'products.*.size' => ['nullable', 'string', 'max:100'],
            'products.*.unit' => ['nullable', 'string', Rule::in(ProductUnits::ALL)],
            'products.*.category_id' => ['required', 'integer', 'exists:categories,id'],
            'products.*.barcode' => ['nullable', 'string', 'max:100', 'distinct', 'unique:products,barcode'],
            'products.*.price' => ['required', 'numeric', 'min:0'],
            'products.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'products.*.stock_quantity' => ['required', 'integer', 'min:0'],
            'products.*.reorder_level' => ['nullable', 'integer', 'min:0'],
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
                $categoryId = $row['category_id'] ?? null;
                $sku = ! empty($row['sku']) ? trim($row['sku']) : null;

                $product = SkuGenerator::create([
                    'category_id' => $categoryId,
                    'name' => $name,
                    'sku' => $sku,
                    'barcode' => $barcode,
                    'brand' => $row['brand'] ?? null,
                    'size' => $row['size'] ?? null,
                    'unit' => ! empty($row['unit']) ? $row['unit'] : 'pc',
                    'price' => (float) $row['price'],
                    'cost_price' => isset($row['cost_price']) ? (float) $row['cost_price'] : 0,
                    'stock_quantity' => $stock,
                    'reorder_level' => isset($row['reorder_level']) ? (int) $row['reorder_level'] : 5,
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
