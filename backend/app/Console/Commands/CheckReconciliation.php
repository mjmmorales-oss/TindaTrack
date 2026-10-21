<?php

namespace App\Console\Commands;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Models\BarcodeCatalog;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleCounter;
use App\Models\SaleItem;
use App\Models\ScannerEvent;
use App\Models\ScannerSession;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\UtangPayment;
use Illuminate\Console\Command;

class CheckReconciliation extends Command
{
    /**
     * Deployment sanity checks. Prints WARN lines (does not change the exit code,
     * which stays tied to data integrity) so a misconfigured Railway deploy is obvious.
     */
    protected function productionChecks(): void
    {
        $this->info('=== Production configuration ===');
        $warnings = [];

        if (empty(config('app.key'))) {
            $warnings[] = 'APP_KEY is missing. Run: php artisan key:generate --show and set it on Railway.';
        }
        if (config('app.debug')) {
            $warnings[] = 'APP_DEBUG=true: error pages would expose stack traces. Set APP_DEBUG=false.';
        }

        // Via config: after `config:cache` (Railway pre-deploy) env() returns null here
        $frontend = (string) config('app.frontend_url', '');
        if ($frontend === '' || ! preg_match('#^https?://[^/]+#', $frontend)) {
            $warnings[] = "FRONTEND_URL is not a valid URL ('{$frontend}'). Set it to the Vercel URL, e.g. https://tindatrack.vercel.app";
        } elseif (str_ends_with($frontend, '/')) {
            $warnings[] = 'FRONTEND_URL ends with "/": CORS compares exact origins. Remove the trailing slash.';
        } elseif (app()->environment('production') && preg_match('#localhost|127\.0\.0\.1#', $frontend)) {
            $warnings[] = "FRONTEND_URL points at localhost ('{$frontend}') in production.";
        } elseif (! in_array($frontend, config('cors.allowed_origins', []), true)) {
            $warnings[] = 'FRONTEND_URL is not in the CORS allowed origins.';
        }

        if (config('ai.provider') === 'gemini' && empty(config('ai.gemini_api_key'))) {
            $warnings[] = 'AI_PROVIDER=gemini but GEMINI_API_KEY is empty. Set the key, or AI_PROVIDER=mock for an offline demo.';
        }

        if (! is_link(public_path('storage')) && ! is_dir(public_path('storage'))) {
            $warnings[] = 'public/storage link is missing. Run: php artisan storage:link';
        }

        $uploadMax = $this->iniBytes((string) ini_get('upload_max_filesize'));
        $postMax = $this->iniBytes((string) ini_get('post_max_size'));
        if ($uploadMax > 0 && $uploadMax < 2 * 1024 * 1024) {
            $warnings[] = 'PHP upload_max_filesize is below 2M: large photos may be dropped.';
        }
        if ($postMax > 0 && $uploadMax > 0 && $postMax < $uploadMax) {
            $warnings[] = 'PHP post_max_size is smaller than upload_max_filesize.';
        }
        if ((int) config('ai.max_image_kb') < 600) {
            $warnings[] = 'AI_MAX_IMAGE_KB is below the SPA\'s 600 KB AI photo cap.';
        }

        foreach ($warnings as $warning) {
            $this->warn("  WARN: {$warning}");
        }
        if ($warnings === []) {
            $this->info('  PASS: Production configuration looks right.');
        }
        $this->newLine();
    }

    private function iniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }
        $unit = strtolower(substr($value, -1));
        $number = (int) $value;

        return match ($unit) {
            'g' => $number * 1024 ** 3,
            'm' => $number * 1024 ** 2,
            'k' => $number * 1024,
            default => (int) $value,
        };
    }

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tindatrack:check
        {--production : Also warn about deployment settings (APP_KEY, APP_DEBUG, FRONTEND_URL, AI key, storage link, upload limits)}';

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
        if ($this->option('production')) {
            $this->productionChecks();
        }

        $this->info('=== TindaTrack System Integrity & Reconciliation Check ===');
        $this->newLine();

        // 1. Table counts
        $counts = [
            'Users' => User::count(),
            'Settings' => Setting::count(),
            'Categories' => Category::count(),
            'Products' => Product::count(),
            'Barcode Catalog' => BarcodeCatalog::count(),
            'Scanner Sessions' => ScannerSession::count(),
            'Scanner Events' => ScannerEvent::count(),
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
