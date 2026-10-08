<?php

namespace App\Http\Controllers;

use App\Enums\SaleStatus;
use App\Models\Category;
use App\Models\Sale;
use App\Models\SaleItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function sales(Request $request): JsonResponse
    {
        $from = $request->input('from') ? Carbon::parse($request->input('from')) : null;
        $to = $request->input('to') ? Carbon::parse($request->input('to')) : null;
        $granularity = $request->input('granularity', 'daily');

        $isSqlite = DB::connection()->getDriverName() === 'sqlite';

        // 1. Overall Summary via SQL
        $summaryQuery = Sale::where('status', SaleStatus::Completed);
        if ($from) {
            $summaryQuery->where('created_at', '>=', $from);
        }
        if ($to) {
            $summaryQuery->where('created_at', '<=', $to);
        }

        $summaryRow = $summaryQuery->selectRaw("
            COALESCE(SUM(total_amount), 0) as total_sales,
            COUNT(*) as total_transactions,
            COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN total_amount ELSE 0 END), 0) as total_cash,
            COALESCE(SUM(CASE WHEN payment_type = 'utang' THEN total_amount ELSE 0 END), 0) as total_utang
        ")->first();

        $totalSales = round((float) ($summaryRow->total_sales ?? 0), 2);
        $totalTransactions = (int) ($summaryRow->total_transactions ?? 0);
        $totalCash = round((float) ($summaryRow->total_cash ?? 0), 2);
        $totalUtang = round((float) ($summaryRow->total_utang ?? 0), 2);

        // Cost and Profit
        $costQuery = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', SaleStatus::Completed);
        if ($from) {
            $costQuery->where('sales.created_at', '>=', $from);
        }
        if ($to) {
            $costQuery->where('sales.created_at', '<=', $to);
        }

        $totalCost = round((float) $costQuery->selectRaw('COALESCE(SUM(sale_items.quantity * sale_items.unit_cost), 0) as total_cost')->value('total_cost'), 2);
        $totalProfit = round($totalSales - $totalCost, 2);
        $profitMargin = $totalSales > 0 ? round(($totalProfit / $totalSales) * 100, 2) : 0.0;

        // 2. Series Aggregates
        if ($granularity === 'monthly') {
            $periodExpr = $isSqlite ? "strftime('%Y-%m', sales.created_at)" : "DATE_FORMAT(sales.created_at, '%Y-%m')";
        } elseif ($granularity === 'weekly') {
            $periodExpr = $isSqlite ? "strftime('%Y-W%W', sales.created_at)" : "DATE_FORMAT(sales.created_at, 'Wk %m-%d')";
        } else {
            $periodExpr = $isSqlite ? 'date(sales.created_at)' : 'DATE(sales.created_at)';
        }

        $seriesRows = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', SaleStatus::Completed)
            ->when($from, fn ($q) => $q->where('sales.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('sales.created_at', '<=', $to))
            ->selectRaw("
                {$periodExpr} as period_key,
                COUNT(DISTINCT sales.id) as transactions,
                COALESCE(SUM(sale_items.subtotal), 0) as sales,
                COALESCE(SUM(sale_items.quantity * sale_items.unit_cost), 0) as cost
            ")
            ->groupBy('period_key')
            ->orderBy('period_key')
            ->get();

        // Get cash vs utang per period
        $paymentPerPeriod = Sale::where('status', SaleStatus::Completed)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->selectRaw("
                {$periodExpr} as period_key,
                COALESCE(SUM(CASE WHEN payment_type = 'cash' THEN total_amount ELSE 0 END), 0) as cash,
                COALESCE(SUM(CASE WHEN payment_type = 'utang' THEN total_amount ELSE 0 END), 0) as utang
            ")
            ->groupBy('period_key')
            ->get()
            ->keyBy('period_key');

        $series = [];
        foreach ($seriesRows as $row) {
            $k = (string) $row->period_key;
            $sSales = round((float) $row->sales, 2);
            $sCost = round((float) $row->cost, 2);
            $sProfit = round($sSales - $sCost, 2);
            $pay = $paymentPerPeriod->get($k);

            $series[] = [
                'period' => $k,
                'sales' => $sSales,
                'cost' => $sCost,
                'gross_profit' => $sProfit,
                'cash' => $pay ? round((float) $pay->cash, 2) : 0.0,
                'utang' => $pay ? round((float) $pay->utang, 2) : 0.0,
                'transactions' => (int) $row->transactions,
            ];
        }

        return response()->json([
            'data' => [
                'summary' => [
                    'total_sales' => $totalSales,
                    'total_gross_profit' => $totalProfit,
                    'profit_margin' => $profitMargin,
                    'total_transactions' => $totalTransactions,
                    'total_cash' => $totalCash,
                    'total_utang' => $totalUtang,
                ],
                'series' => $series,
            ],
        ]);
    }

    public function bestSellers(Request $request): JsonResponse
    {
        $from = $request->input('from') ? Carbon::parse($request->input('from')) : null;
        $to = $request->input('to') ? Carbon::parse($request->input('to')) : null;
        $limit = (int) $request->input('limit', 10);
        $limit = max(1, min(100, $limit));

        $rows = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.status', SaleStatus::Completed)
            ->when($from, fn ($q) => $q->where('sales.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('sales.created_at', '<=', $to))
            ->selectRaw('
                sale_items.product_id,
                sale_items.product_name,
                COALESCE(products.sku, "") as sku,
                COALESCE(categories.name, "Uncategorized") as category_name,
                SUM(sale_items.quantity) as quantity_sold,
                SUM(sale_items.subtotal) as revenue,
                SUM(sale_items.quantity * sale_items.unit_cost) as cost
            ')
            ->groupBy('sale_items.product_id', 'sale_items.product_name', 'products.sku', 'categories.name')
            ->orderByDesc('quantity_sold')
            ->limit($limit)
            ->get();

        $ranked = $rows->map(function ($r) {
            $rev = round((float) $r->revenue, 2);
            $cost = round((float) $r->cost, 2);

            return [
                'product_id' => $r->product_id,
                'product_name' => $r->product_name,
                'sku' => $r->sku,
                'category_name' => $r->category_name,
                'quantity_sold' => (int) $r->quantity_sold,
                'revenue' => $rev,
                'cost' => $cost,
                'gross_profit' => round($rev - $cost, 2),
            ];
        });

        return response()->json([
            'data' => $ranked,
        ]);
    }

    public function categoryBreakdown(Request $request): JsonResponse
    {
        $from = $request->input('from') ? Carbon::parse($request->input('from')) : null;
        $to = $request->input('to') ? Carbon::parse($request->input('to')) : null;

        $categories = Category::all()->keyBy('id');

        $rows = SaleItem::join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->where('sales.status', SaleStatus::Completed)
            ->when($from, fn ($q) => $q->where('sales.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('sales.created_at', '<=', $to))
            ->selectRaw('
                products.category_id,
                SUM(sale_items.subtotal) as revenue,
                SUM(sale_items.quantity) as items_sold
            ')
            ->groupBy('products.category_id')
            ->get();

        $grandRevenue = round((float) $rows->sum('revenue'), 2);

        $catData = [];
        foreach ($categories as $cat) {
            $match = $rows->firstWhere('category_id', $cat->id);
            $rev = $match ? round((float) $match->revenue, 2) : 0.0;
            $items = $match ? (int) $match->items_sold : 0;
            $pct = $grandRevenue > 0 ? round(($rev / $grandRevenue) * 100, 2) : 0.0;

            $catData[] = [
                'category_id' => $cat->id,
                'category_name' => $cat->name,
                'color' => $cat->color,
                'revenue' => $rev,
                'items_sold' => $items,
                'percentage' => $pct,
            ];
        }

        // Sort descending by revenue
        usort($catData, fn ($a, $b) => $b['revenue'] <=> $a['revenue']);

        return response()->json([
            'data' => [
                'total_revenue' => $grandRevenue,
                'categories' => $catData,
            ],
        ]);
    }

    public function hourly(Request $request): JsonResponse
    {
        $from = $request->input('from') ? Carbon::parse($request->input('from')) : null;
        $to = $request->input('to') ? Carbon::parse($request->input('to')) : null;

        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        $hourExpr = $isSqlite ? "CAST(strftime('%H', created_at) AS INTEGER)" : 'HOUR(created_at)';

        $rows = Sale::where('status', SaleStatus::Completed)
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->selectRaw("
                {$hourExpr} as hour_num,
                SUM(total_amount) as sales,
                COUNT(*) as transactions
            ")
            ->groupBy('hour_num')
            ->get()
            ->keyBy('hour_num');

        $hours = [];
        for ($i = 0; $i < 24; $i++) {
            $label = match ($i) {
                0 => '12 AM',
                12 => '12 PM',
                default => ($i < 12) ? "{$i} AM" : ($i - 12).' PM',
            };

            $matched = $rows->get($i);
            $hours[] = [
                'hour' => $i,
                'label' => $label,
                'sales' => $matched ? round((float) $matched->sales, 2) : 0.0,
                'transactions' => $matched ? (int) $matched->transactions : 0,
            ];
        }

        return response()->json([
            'data' => $hours,
        ]);
    }
}
