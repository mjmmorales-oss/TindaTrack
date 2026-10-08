<?php

namespace App\Http\Controllers;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\UtangPayment;
use App\Support\ListQuery;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UtangController extends Controller
{
    public function summary(): JsonResponse
    {
        $debtors = Customer::where('credit_balance', '>', 0)->get();
        $totalOutstanding = round((float) $debtors->sum('credit_balance'), 2);

        $now = Carbon::now('Asia/Manila');
        $sevenDaysAgo = $now->copy()->subDays(7);

        $collectedThisWeek = round((float) UtangPayment::where('payment_date', '>=', $sevenDaysAgo)->sum('amount'), 2);

        $overdueCount = 0;
        $aging = [
            '0_7' => 0.0,
            '8_30' => 0.0,
            '31_60' => 0.0,
            '60_plus' => 0.0,
        ];

        foreach ($debtors as $d) {
            $oldestSale = Sale::where('customer_id', $d->id)
                ->where('payment_type', PaymentType::Utang)
                ->where('status', SaleStatus::Completed)
                ->orderBy('created_at', 'asc')
                ->first();

            $oldestDate = $oldestSale ? $oldestSale->created_at : $d->created_at;
            $ageInDays = (int) $oldestDate->diffInDays($now);

            if ($ageInDays > 30) {
                $overdueCount++;
            }

            $bal = (float) $d->credit_balance;
            if ($ageInDays <= 7) {
                $aging['0_7'] = round($aging['0_7'] + $bal, 2);
            } elseif ($ageInDays <= 30) {
                $aging['8_30'] = round($aging['8_30'] + $bal, 2);
            } elseif ($ageInDays <= 60) {
                $aging['31_60'] = round($aging['31_60'] + $bal, 2);
            } else {
                $aging['60_plus'] = round($aging['60_plus'] + $bal, 2);
            }
        }

        return response()->json([
            'data' => [
                'total_outstanding' => $totalOutstanding,
                'debtors_count' => $debtors->count(),
                'collected_this_week' => $collectedThisWeek,
                'overdue_count' => $overdueCount,
                'aging_buckets' => $aging,
            ],
        ]);
    }

    public function debtors(Request $request): JsonResponse
    {
        $query = Customer::where('credit_balance', '>', 0);

        $paginator = ListQuery::paginate(
            query: $query,
            request: $request,
            searchColumns: ['name', 'nickname', 'contact_number'],
            allowedFilters: [],
            allowedSorts: ['credit_balance', 'name', 'created_at'],
            defaultSort: '-credit_balance',
            defaultPerPage: 15
        );

        $now = Carbon::now('Asia/Manila');
        $transformed = collect($paginator->items())->map(function (Customer $c) use ($now) {
            $oldestSale = Sale::where('customer_id', $c->id)
                ->where('payment_type', PaymentType::Utang)
                ->where('status', SaleStatus::Completed)
                ->orderBy('created_at', 'asc')
                ->first();

            $oldestDate = $oldestSale ? $oldestSale->created_at : $c->created_at;
            $ageInDays = (int) $oldestDate->diffInDays($now);
            $creditLimit = (float) $c->credit_limit;
            $creditBal = (float) $c->credit_balance;

            return [
                'id' => $c->id,
                'name' => $c->name,
                'nickname' => $c->nickname,
                'contact_number' => $c->contact_number,
                'address' => $c->address,
                'credit_limit' => $creditLimit,
                'credit_balance' => $creditBal,
                'notes' => $c->notes,
                'created_at' => $c->created_at?->toIso8601String(),
                'updated_at' => $c->updated_at?->toIso8601String(),
                'utilization_rate' => $creditLimit > 0 ? round(($creditBal / $creditLimit) * 100, 2) : 100.0,
                'is_over_limit' => $creditBal > $creditLimit,
                'oldest_debt_date' => $oldestDate?->toIso8601String(),
                'days_overdue' => max(0, $ageInDays),
            ];
        });

        return response()->json([
            'data' => $transformed,
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
}
