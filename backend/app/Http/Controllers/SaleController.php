<?php

namespace App\Http\Controllers;

use App\Actions\CreateSaleAction;
use App\Actions\VoidSaleAction;
use App\Enums\SaleStatus;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Support\DateInput;
use App\Support\ListQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Sale::with(['items.product', 'customer', 'cashier']);

        // Cashier role visibility enforcement
        if ($user->hasRole('cashier')) {
            $query->where('user_id', $user->id);
        }

        $allowedFilters = [
            'payment_type' => 'payment_type',
            'status' => 'status',
            'user_id' => 'user_id',
            'customer_id' => 'customer_id',
            'from' => function (Builder $q, $val) {
                $q->where('created_at', '>=', DateInput::from($val));
            },
            'to' => function (Builder $q, $val) {
                $q->where('created_at', '<=', DateInput::to($val));
            },
        ];

        $paginator = ListQuery::paginate(
            query: $query,
            request: $request,
            searchColumns: ['sale_no', 'notes'],
            allowedFilters: $allowedFilters,
            allowedSorts: ['created_at', 'total_amount', 'sale_no'],
            defaultSort: '-created_at',
            defaultPerPage: 20
        );

        // Summary strip over the same filtered rows (the paginator left the filters on $query)
        $completed = (clone $query)->reorder()->where('status', SaleStatus::Completed);
        $completedCount = (clone $completed)->count();
        $completedTotal = round((float) (clone $completed)->sum('total_amount'), 2);

        return response()->json([
            'summary' => [
                'total_amount' => $completedTotal,
                'total_count' => $paginator->total(),
                'average_sale' => $completedCount > 0 ? round($completedTotal / $completedCount, 2) : 0,
            ],
            'data' => SaleResource::collection($paginator->items()),
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

    public function show(Request $request, Sale $sale): JsonResponse
    {
        $user = $request->user();
        if ($user->hasRole('cashier') && $sale->user_id !== $user->id) {
            abort(403, 'You cannot view receipts belonging to another cashier.');
        }

        return response()->json([
            'data' => new SaleResource($sale->load(['items.product', 'customer', 'cashier'])),
        ]);
    }

    public function store(Request $request, CreateSaleAction $action): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.add_method' => ['nullable', 'string', 'max:30'],
            'payment_type' => ['nullable', 'string', 'in:cash,utang'],
            'amount_paid' => ['nullable', 'numeric', 'min:0'],
            'customer_id' => ['nullable', 'integer'],
            'override_limit' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
            'cart_started_at' => ['nullable', 'date'],
            'cart_duration_ms' => ['nullable', 'integer', 'min:0'],
        ]);

        $sale = $action->execute(
            cashier: $request->user(),
            cartItems: $validated['items'],
            payment: $validated
        );

        return response()->json([
            'data' => new SaleResource($sale),
        ], 201);
    }

    public function void(Request $request, Sale $sale, VoidSaleAction $action): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $voidedSale = $action->execute(
            user: $request->user(),
            saleId: $sale->id,
            reason: $validated['reason']
        );

        return response()->json([
            'data' => new SaleResource($voidedSale),
            'message' => 'Sale voided successfully and stock returned to inventory.',
        ]);
    }
}
