<?php

namespace App\Http\Controllers;

use App\Enums\SaleStatus;
use App\Http\Resources\SaleResource;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $range = $request->input('range', 'today');
        $currentUser = $request->user();

        $now = Carbon::now('Asia/Manila');
        $nowIso = $now->toIso8601String();

        $rangeDays = match ($range) {
            '7d' => 7,
            '30d' => 30,
            default => 1,
        };

        if ($range === 'today') {
            $currentStart = $now->copy()->startOfDay();
            $prevStart = $now->copy()->subDay()->startOfDay();
            $prevEnd = $now->copy()->subDay();
        } else {
            $currentStart = $now->copy()->subDays($rangeDays);
            $prevStart = $now->copy()->subDays($rangeDays * 2);
            $prevEnd = $currentStart;
        }

        // 1. Current period sales aggregate
        $currentAgg = Sale::where('status', SaleStatus::Completed)
            ->where('created_at', '>=', $currentStart)
            ->where('created_at', '<=', $now)
            ->selectRaw("
                COALESCE(SUM(total_amount), 0) as total_sales,
                COUNT(*) as tx_count,
                COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
                COALESCE(SUM(CASE WHEN payment_type = 'utang' THEN total_amount ELSE 0 END), 0) as utang_total
            ")
            ->first();

        $currentSalesTotal = round((float) ($currentAgg->total_sales ?? 0), 2);
        $currentTxCount = (int) ($currentAgg->tx_count ?? 0);
        $cashTotal = round((float) ($currentAgg->cash_total ?? 0), 2);
        $utangTotal = round((float) ($currentAgg->utang_total ?? 0), 2);

        // 2. Previous period sales aggregate (for deltas)
        $prevAgg = Sale::where('status', SaleStatus::Completed)
            ->where('created_at', '>=', $prevStart)
            ->where('created_at', '<', $prevEnd)
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total_sales, COUNT(*) as tx_count')
            ->first();

        $prevSalesTotal = round((float) ($prevAgg->total_sales ?? 0), 2);
        $prevTxCount = (int) ($prevAgg->tx_count ?? 0);

        $salesDelta = $prevSalesTotal > 0
            ? round((($currentSalesTotal - $prevSalesTotal) / $prevSalesTotal) * 100, 2)
            : 0.0;

        $txDelta = $prevTxCount > 0
            ? round((($currentTxCount - $prevTxCount) / $prevTxCount) * 100, 2)
            : 0.0;

        // 3. Customer & Stock status
        $totalUtang = round((float) Customer::where('credit_balance', '>', 0)->sum('credit_balance'), 2);
        $debtorsCount = Customer::where('credit_balance', '>', 0)->count();

        $lowStockCount = Product::where('is_active', true)
            ->where('stock_quantity', '>', 0)
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->count();

        $outOfStockCount = Product::where('is_active', true)
            ->where('stock_quantity', '<=', 0)
            ->count();

        // 4. Sales Trend Points
        $numPoints = ($range === 'today') ? 7 : $rangeDays;
        $trendMap = [];

        for ($i = $numPoints - 1; $i >= 0; $i--) {
            $d = $now->copy()->subDays($i);
            $key = $d->format('Y-m-d');
            $trendMap[$key] = [
                'date' => $key,
                'label' => $d->format('D'),
                'sales' => 0.0,
                'cash' => 0.0,
                'utang' => 0.0,
                'transactions' => 0,
            ];
        }

        $trendStart = $now->copy()->subDays($numPoints - 1)->startOfDay();
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        $dateExpr = $isSqlite ? 'date(created_at)' : 'DATE(created_at)';

        $trendRows = Sale::where('status', SaleStatus::Completed)
            ->where('created_at', '>=', $trendStart)
            ->where('created_at', '<=', $now)
            ->selectRaw("
                {$dateExpr} as date_key,
                COALESCE(SUM(total_amount), 0) as sales,
                COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN total_amount ELSE 0 END), 0) as cash,
                COALESCE(SUM(CASE WHEN payment_type = 'utang' THEN total_amount ELSE 0 END), 0) as utang,
                COUNT(*) as transactions
            ")
            ->groupBy('date_key')
            ->get();

        foreach ($trendRows as $row) {
            $k = (string) $row->date_key;
            if (isset($trendMap[$k])) {
                $trendMap[$k]['sales'] = round((float) $row->sales, 2);
                $trendMap[$k]['cash'] = round((float) $row->cash, 2);
                $trendMap[$k]['utang'] = round((float) $row->utang, 2);
                $trendMap[$k]['transactions'] = (int) $row->transactions;
            }
        }
        $salesTrend = array_values($trendMap);

        // 5. Top 5 Sellers via SQL
        $topSellersRows = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', SaleStatus::Completed)
            ->where('sales.created_at', '>=', $currentStart)
            ->where('sales.created_at', '<=', $now)
            ->selectRaw('
                sale_items.product_id,
                sale_items.product_name,
                SUM(sale_items.quantity) as quantity,
                SUM(sale_items.subtotal) as revenue
            ')
            ->groupBy('sale_items.product_id', 'sale_items.product_name')
            ->orderByDesc('quantity')
            ->limit(5)
            ->get();

        $maxQty = $topSellersRows->isNotEmpty() ? (int) $topSellersRows->first()->quantity : 1;
        $topSellers = [];
        foreach ($topSellersRows as $index => $row) {
            $qty = (int) $row->quantity;
            $topSellers[] = [
                'id' => $row->product_id,
                'name' => $row->product_name,
                'quantity' => $qty,
                'revenue' => round((float) $row->revenue, 2),
                'rank' => $index + 1,
                'progress' => $maxQty > 0 ? (int) round(($qty / $maxQty) * 100) : 0,
            ];
        }

        // 6. Running Low (5 rows)
        $runningLow = Product::where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('stock_quantity')
            ->limit(5)
            ->get(['id', 'name', 'sku', 'stock_quantity', 'reorder_level', 'unit']);

        // 7. Recent Sales (5 rows)
        $recentSales = Sale::with(['items', 'customer', 'cashier'])
            ->where('status', SaleStatus::Completed)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        // 8. Cashier Shift Stats
        $todayStart = $now->copy()->startOfDay();
        $myShiftAgg = Sale::where('status', SaleStatus::Completed)
            ->where('user_id', $currentUser->id)
            ->where('created_at', '>=', $todayStart)
            ->selectRaw('COALESCE(SUM(total_amount), 0) as my_total, COUNT(*) as my_count')
            ->first();

        $mySalesToday = Sale::with(['items', 'customer'])
            ->where('status', SaleStatus::Completed)
            ->where('user_id', $currentUser->id)
            ->where('created_at', '>=', $todayStart)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'range' => $range,
                'kpis' => [
                    'sales' => $currentSalesTotal,
                    'sales_delta' => $salesDelta,
                    'transactions' => $currentTxCount,
                    'transactions_delta' => $txDelta,
                    'outstanding_utang' => $totalUtang,
                    'debtors_count' => $debtorsCount,
                    'low_stock_count' => $lowStockCount,
                    'out_of_stock_count' => $outOfStockCount,
                ],
                'payment_mix' => [
                    'cash' => $cashTotal,
                    'utang' => $utangTotal,
                    'cash_percent' => $currentSalesTotal > 0 ? (int) round(($cashTotal / $currentSalesTotal) * 100) : 100,
                    'utang_percent' => $currentSalesTotal > 0 ? (int) round(($utangTotal / $currentSalesTotal) * 100) : 0,
                ],
                'sales_trend' => $salesTrend,
                'top_sellers' => $topSellers,
                'running_low' => $runningLow,
                'recent_sales' => SaleResource::collection($recentSales),
                'cashier_shift' => [
                    'my_sales_total' => round((float) ($myShiftAgg->my_total ?? 0), 2),
                    'my_transactions_count' => (int) ($myShiftAgg->my_count ?? 0),
                    'my_recent_sales' => SaleResource::collection($mySalesToday),
                ],
            ],
        ]);
    }
}
