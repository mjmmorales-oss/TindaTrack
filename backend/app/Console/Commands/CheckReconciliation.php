<?php

namespace App\Console\Commands;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleCounter;
use App\Models\SaleItem;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\UtangPayment;
use Illuminate\Console\Command;

class CheckReconciliation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tindatrack:check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify database integrity, stock reconciliation, and customer utang balances';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('=== TindaTrack System Integrity & Reconciliation Check ===');
        $this->newLine();

        // 1. Table counts
        $counts = [
            'Users' => User::count(),
            'Settings' => Setting::count(),
            'Categories' => Category::count(),
            'Products' => Product::count(),
            'Customers' => Customer::count(),
            'Sales (Total)' => Sale::count(),
            'Sales (Completed)' => Sale::where('status', SaleStatus::Completed)->count(),
            'Sales (Voided)' => Sale::where('status', SaleStatus::Voided)->count(),
            'Sale Items' => SaleItem::count(),
            'Utang Payments' => UtangPayment::count(),
            'Stock Movements' => StockMovement::count(),
            'Sale Counters' => SaleCounter::count(),
        ];

        $this->table(
            ['Table / Resource', 'Row Count'],
            collect($counts)->map(fn ($val, $key) => [$key, number_format($val)])->values()->toArray()
        );

        $hasError = false;

        // 2. Check: Σ customer balance = Σ unpaid utang − Σ payments
        $this->info('Checking Customer Utang Reconciliation...');
        $totalCustomerBalance = round((float) Customer::sum('credit_balance'), 2);

        $totalUnpaidUtang = round((float) Sale::where('payment_type', PaymentType::Utang)
            ->where('status', SaleStatus::Completed)
            ->selectRaw('COALESCE(SUM(total_amount - amount_paid), 0) as total')
            ->value('total'), 2);

        $totalPayments = round((float) UtangPayment::sum('amount'), 2);
        $expectedCustomerBalance = round($totalUnpaidUtang - $totalPayments, 2);

        $this->line(sprintf('  - Total Customer Balance (table): ₱%s', number_format($totalCustomerBalance, 2)));
        $this->line(sprintf('  - Total Completed Utang:          ₱%s', number_format($totalUnpaidUtang, 2)));
        $this->line(sprintf('  - Total Utang Payments:           ₱%s', number_format($totalPayments, 2)));
        $this->line(sprintf('  - Expected Customer Balance:      ₱%s', number_format($expectedCustomerBalance, 2)));

        if (abs($totalCustomerBalance - $expectedCustomerBalance) > 0.01) {
            $this->error(sprintf(
                '  FAIL: Balance mismatch! Σ balance (₱%0.2f) != Σ utang (₱%0.2f) - Σ payments (₱%0.2f)',
                $totalCustomerBalance,
                $totalUnpaidUtang,
                $totalPayments
            ));
            $hasError = true;
        } else {
            $this->info('  PASS: Σ customer balance equals Σ unpaid utang − Σ payments.');
        }

        // Per-customer verification
        $customerMismatches = 0;
        foreach (Customer::all() as $cust) {
            $custDebt = round((float) Sale::where('customer_id', $cust->id)
                ->where('payment_type', PaymentType::Utang)
                ->where('status', SaleStatus::Completed)
                ->selectRaw('COALESCE(SUM(total_amount - amount_paid), 0) as total')
                ->value('total'), 2);

            $custPaid = round((float) UtangPayment::where('customer_id', $cust->id)->sum('amount'), 2);
            $expectedCustBal = max(0.0, round($custDebt - $custPaid, 2));

            if (abs($cust->credit_balance - $expectedCustBal) > 0.01) {
                $this->error(sprintf(
                    '    Mismatch for customer #%d (%s): recorded=₱%0.2f, expected=₱%0.2f',
                    $cust->id,
                    $cust->name,
                    $cust->credit_balance,
                    $expectedCustBal
                ));
                $customerMismatches++;
                $hasError = true;
            }
        }
        if ($customerMismatches === 0) {
            $this->info('  PASS: All individual customer balances perfectly reconciled.');
        }

        // 3. Check: Product stock = opening stock + Σ movements
        $this->info('Checking Product Stock Movements Reconciliation...');
        $stockMismatches = 0;
        foreach (Product::all() as $prod) {
            $movementsSum = (int) $prod->stockMovements()->sum('quantity');
            $expectedStock = $movementsSum; // Opening stock was recorded as an initial movement

            if ((int) $prod->stock_quantity !== $expectedStock) {
                $this->error(sprintf(
                    '  FAIL: Stock mismatch for product #%d (%s): stock_quantity=%d, Σ movements=%d',
                    $prod->id,
                    $prod->name,
                    $prod->stock_quantity,
                    $movementsSum
                ));
                $stockMismatches++;
                $hasError = true;
            }
        }
        if ($stockMismatches === 0) {
            $this->info('  PASS: Product stock = opening stock + Σ movements for all products.');
        }

        // 4. Check: No negative stock
        $this->info('Checking for negative stock...');
        $negativeStockCount = Product::where('stock_quantity', '<', 0)->count();
        if ($negativeStockCount > 0) {
            $this->error(sprintf('  FAIL: Found %d products with negative stock!', $negativeStockCount));
            $hasError = true;
        } else {
            $this->info('  PASS: No negative stock found in products table.');
        }

        // 5. Check: Unique sale numbers
        $this->info('Checking uniqueness of sale numbers...');
        $totalSales = Sale::count();
        $uniqueSales = Sale::distinct('sale_no')->count('sale_no');
        if ($totalSales !== $uniqueSales) {
            $this->error(sprintf('  FAIL: Duplicate sale numbers detected! Total=%d, Unique=%d', $totalSales, $uniqueSales));
            $hasError = true;
        } else {
            $this->info(sprintf('  PASS: All %d sale numbers are unique.', $totalSales));
        }

        $this->newLine();
        if ($hasError) {
            $this->error('Reconciliation check FAILED.');

            return 1;
        }

        $this->info('All reconciliation checks PASSED successfully!');

        return 0;
    }
}
