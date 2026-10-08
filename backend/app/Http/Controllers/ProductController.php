<?php

namespace App\Http\Controllers;

use App\Actions\AdjustStockAction;
use App\Enums\StockMovementType;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\StockMovement;
use App\Support\ListQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category');

        $allowedFilters = [
            'category_id' => 'category_id',
            'is_active' => function (Builder $q, $val) {
                $q->where('is_active', filter_var($val, FILTER_VALIDATE_BOOLEAN));
            },
            'stock_status' => function (Builder $q, $val) {
                if ($val === 'out_of_stock') {
                    $q->where('stock_quantity', '<=', 0);
                } elseif ($val === 'low_stock') {
                    $q->where('stock_quantity', '>', 0)->whereColumn('stock_quantity', '<=', 'reorder_level');
                } elseif ($val === 'in_stock') {
                    $q->whereColumn('stock_quantity', '>', 'reorder_level');
                }
            },
        ];

        $paginator = ListQuery::paginate(
            query: $query,
            request: $request,
            searchColumns: ['name', 'sku', 'barcode'],
            allowedFilters: $allowedFilters,
            allowedSorts: ['name', 'price', 'stock_quantity', 'created_at', 'sku'],
            defaultSort: 'name',
            defaultPerPage: 15
        );

        return response()->json([
            'data' => ProductResource::collection($paginator->items()),
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json([
            'data' => new ProductResource($product->load('category')),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:50', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:50', 'unique:products,barcode'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'unit' => ['nullable', 'string', 'max:20'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $initialStock = (int) ($validated['stock_quantity'] ?? 0);

        $product = DB::transaction(function () use ($validated, $initialStock, $request) {
            $prod = Product::create([
                'name' => trim($validated['name']),
                'sku' => trim($validated['sku']),
                'barcode' => ! empty($validated['barcode']) ? trim($validated['barcode']) : null,
                'category_id' => $validated['category_id'],
                'unit' => $validated['unit'] ?? 'pc',
                'price' => round((float) $validated['price'], 2),
                'cost_price' => round((float) $validated['cost_price'], 2),
                'stock_quantity' => $initialStock,
                'reorder_level' => (int) ($validated['reorder_level'] ?? 10),
                'is_active' => $validated['is_active'] ?? true,
                'description' => $validated['description'] ?? null,
            ]);

            if ($initialStock > 0) {
                StockMovement::create([
                    'product_id' => $prod->id,
                    'type' => StockMovementType::Restock,
                    'quantity' => $initialStock,
                    'stock_after' => $initialStock,
                    'reference' => 'INIT-'.$prod->sku,
                    'notes' => 'Panimulang imbentaryo (Initial stock)',
                    'user_id' => $request->user()->id,
                ]);
            }

            return $prod;
        });

        return response()->json([
            'data' => new ProductResource($product->load('category')),
        ], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'sku' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('products', 'sku')->ignore($product->id)],
            'barcode' => ['nullable', 'string', 'max:50', Rule::unique('products', 'barcode')->ignore($product->id)],
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'unit' => ['nullable', 'string', 'max:20'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'cost_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }
        if (isset($validated['sku'])) {
            $validated['sku'] = trim($validated['sku']);
        }
        if (isset($validated['barcode'])) {
            $validated['barcode'] = ! empty($validated['barcode']) ? trim($validated['barcode']) : null;
        }

        $product->update($validated);

        return response()->json([
            'data' => new ProductResource($product->fresh(['category'])),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
        ]);
    }

    public function adjustStock(Request $request, Product $product, AdjustStockAction $action): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:restock,damage,correction,correction_plus,correction_minus'],
            'quantity' => ['required', 'integer'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $updated = $action->execute(
            user: $request->user(),
            productId: $product->id,
            type: $validated['type'],
            quantity: (int) $validated['quantity'],
            notes: $validated['notes'] ?? null
        );

        return response()->json([
            'data' => new ProductResource($updated),
        ]);
    }

    public function lowStock(): JsonResponse
    {
        $products = Product::with('category')
            ->where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('stock_quantity')
            ->get();

        return response()->json([
            'data' => ProductResource::collection($products),
        ]);
    }
}
