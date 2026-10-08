<?php

namespace App\Http\Controllers;

use App\Http\Resources\StockMovementResource;
use App\Models\Product;
use App\Models\StockMovement;
use App\Support\ListQuery;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function overview(): JsonResponse
    {
        $products = Product::where('is_active', true)->get();

        $inStockCount = 0;
        $lowStockCount = 0;
        $outOfStockCount = 0;
        $totalCostVal = 0.0;
        $totalRetailVal = 0.0;

        foreach ($products as $p) {
            $stock = (int) $p->stock_quantity;
            $reorder = (int) $p->reorder_level;
            $cost = (float) $p->cost_price;
            $price = (float) $p->price;

            if ($stock <= 0) {
                $outOfStockCount++;
            } elseif ($stock <= $reorder) {
                $lowStockCount++;
            } else {
                $inStockCount++;
            }

            $totalCostVal = round($totalCostVal + ($stock * $cost), 2);
            $totalRetailVal = round($totalRetailVal + ($stock * $price), 2);
        }

        $profit = round($totalRetailVal - $totalCostVal, 2);

        return response()->json([
            'data' => [
                'total_products' => Product::count(),
                'in_stock_count' => $inStockCount,
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'total_stock_value_cost' => $totalCostVal,
                'total_stock_value_retail' => $totalRetailVal,
                'estimated_potential_profit' => $profit,
            ],
        ]);
    }

    public function movements(Request $request): JsonResponse
    {
        $query = StockMovement::with(['product', 'user']);

        $allowedFilters = [
            'product_id' => 'product_id',
            'type' => 'type',
            'from' => function (Builder $q, $val) {
                $q->where('created_at', '>=', Carbon::parse($val));
            },
            'to' => function (Builder $q, $val) {
                $q->where('created_at', '<=', Carbon::parse($val));
            },
        ];

        $paginator = ListQuery::paginate(
            query: $query,
            request: $request,
            searchColumns: ['reference', 'notes'],
            allowedFilters: $allowedFilters,
            allowedSorts: ['created_at', 'quantity'],
            defaultSort: '-created_at',
            defaultPerPage: 20
        );

        return response()->json([
            'data' => StockMovementResource::collection($paginator->items()),
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

    public function restockList(): JsonResponse
    {
        $lowAndOut = Product::with('category')
            ->where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('name')
            ->get();

        $items = [];
        $grouped = [];

        foreach ($lowAndOut as $p) {
            $suggested = max(1, ($p->reorder_level * 2) - $p->stock_quantity);
            $catName = $p->category?->name ?? 'Other';
            $estimatedCost = round($suggested * (float) $p->cost_price, 2);

            $item = [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'unit' => $p->unit,
                'category_id' => $p->category_id,
                'category_name' => $catName,
                'stock_quantity' => (int) $p->stock_quantity,
                'reorder_level' => (int) $p->reorder_level,
                'suggested_quantity' => $suggested,
                'cost_price' => (float) $p->cost_price,
                'estimated_cost' => $estimatedCost,
            ];

            $items[] = $item;
            if (! isset($grouped[$catName])) {
                $grouped[$catName] = [];
            }
            $grouped[$catName][] = $item;
        }

        return response()->json([
            'data' => [
                'total_items' => count($items),
                'items' => $items,
                'grouped' => $grouped,
            ],
        ]);
    }
}
