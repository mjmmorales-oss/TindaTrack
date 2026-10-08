<?php

namespace App\Http\Controllers;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\SaleResource;
use App\Http\Resources\UtangPaymentResource;
use App\Models\Customer;
use App\Support\ListQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        $allowedFilters = [
            'has_balance' => function (Builder $q, $val) {
                if (filter_var($val, FILTER_VALIDATE_BOOLEAN)) {
                    $q->where('credit_balance', '>', 0);
                }
            },
        ];

        $paginator = ListQuery::paginate(
            query: $query,
            request: $request,
            searchColumns: ['name', 'nickname', 'contact_number'],
            allowedFilters: $allowedFilters,
            allowedSorts: ['name', 'credit_balance', 'credit_limit', 'created_at'],
            defaultSort: 'name',
            defaultPerPage: 15
        );

        return response()->json([
            'data' => CustomerResource::collection($paginator->items()),
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

    public function show(Customer $customer): JsonResponse
    {
        return response()->json([
            'data' => new CustomerResource($customer),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'nickname' => ['nullable', 'string', 'max:100'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $customer = Customer::create([
            'name' => trim($validated['name']),
            'nickname' => ! empty($validated['nickname']) ? trim($validated['nickname']) : null,
            'contact_number' => ! empty($validated['contact_number']) ? trim($validated['contact_number']) : null,
            'address' => ! empty($validated['address']) ? trim($validated['address']) : null,
            'credit_limit' => round((float) ($validated['credit_limit'] ?? 500.0), 2),
            'credit_balance' => 0.0,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'data' => new CustomerResource($customer),
        ], 201);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'nickname' => ['nullable', 'string', 'max:100'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'credit_limit' => ['sometimes', 'required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }
        if (isset($validated['nickname'])) {
            $validated['nickname'] = trim($validated['nickname']);
        }
        if (isset($validated['credit_limit'])) {
            $validated['credit_limit'] = round((float) $validated['credit_limit'], 2);
        }

        $customer->update($validated);

        return response()->json([
            'data' => new CustomerResource($customer),
        ]);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        if ($customer->credit_balance > 0) {
            throw ValidationException::withMessages([
                'credit_balance' => [
                    sprintf(
                        'May natitirang utang pa na ₱%s si %s. Kolektahin muna ang bayad bago burahin.',
                        number_format($customer->credit_balance, 2),
                        $customer->name
                    ),
                ],
            ]);
        }

        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully.',
        ]);
    }

    public function ledger(Customer $customer): JsonResponse
    {
        // 1. Get all completed utang sales for this customer
        $sales = $customer->sales()
            ->with(['items'])
            ->where('payment_type', PaymentType::Utang)
            ->where('status', SaleStatus::Completed)
            ->get();

        // 2. Get all payments for this customer
        $payments = $customer->utangPayments()->get();

        // 3. Combine events in chronological order (oldest first)
        $events = [];

        foreach ($sales as $s) {
            $netDebt = round((float) $s->total_amount - (float) $s->amount_paid, 2);
            $events[] = [
                'id' => "sale-{$s->id}",
                'type' => 'sale',
                'date' => $s->created_at->toIso8601String(),
                'timestamp' => $s->created_at->timestamp,
                'title' => "Utang Sale ({$s->sale_no})",
                'meta' => "{$s->items->count()} items · Resibo {$s->sale_no}",
                'amount' => $netDebt,
                'amountTone' => 'utang',
                'reference' => $s->sale_no,
                'sale' => new SaleResource($s),
            ];
        }

        foreach ($payments as $p) {
            $payDate = $p->payment_date ?? $p->created_at;
            $events[] = [
                'id' => "payment-{$p->id}",
                'type' => 'payment',
                'date' => $payDate->toIso8601String(),
                'timestamp' => $payDate->timestamp,
                'title' => 'Pagbabayad ng Utang',
                'meta' => $p->notes ?: 'Bayad sa tindahan',
                'amount' => -round((float) $p->amount, 2),
                'amountTone' => 'success',
                'reference' => "PAY-{$p->id}",
                'payment' => new UtangPaymentResource($p),
            ];
        }

        // Sort ascending by timestamp
        usort($events, fn ($a, $b) => $a['timestamp'] <=> $b['timestamp']);

        // Calculate running balance
        $running = 0.0;
        $timeline = [];
        foreach ($events as $ev) {
            $running = round($running + $ev['amount'], 2);
            unset($ev['timestamp']);
            $ev['balance'] = max(0.0, $running);
            $timeline[] = $ev;
        }

        // Display newest first
        $timeline = array_reverse($timeline);

        return response()->json([
            'data' => [
                'customer' => new CustomerResource($customer),
                'timeline' => $timeline,
                'current_balance' => (float) $customer->credit_balance,
            ],
        ]);
    }
}
