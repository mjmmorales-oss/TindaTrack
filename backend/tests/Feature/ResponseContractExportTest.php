<?php

use App\Models\Customer;
use App\Models\Product;
use App\Models\ScannerSession;
use App\Models\User;
use Database\Seeders\DemoHistorySeeder;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * v2.2 C1.3: writes a type skeleton (keys + JSON types, no values) of every
 * read endpoint the UI uses to contracts/responses/api/*.json. Vitest
 * (src/test/responseContracts.test.jsx) compares the mock services against
 * these files, so a mock that returns a different shape fails CI instead of
 * hiding an API bug. Deterministic: re-running rewrites identical files.
 */
function responseShape(mixed $value): mixed
{
    if (is_array($value)) {
        if ($value === []) {
            return 'empty';
        }
        if (array_is_list($value)) {
            // Merge every element so optional keys (null in one row, set in another) all appear
            $merged = null;
            foreach ($value as $item) {
                $merged = mergeShapes($merged, responseShape($item));
            }

            return [$merged];
        }
        $out = [];
        foreach ($value as $key => $item) {
            $out[$key] = responseShape($item);
        }
        ksort($out);

        return $out;
    }

    return match (true) {
        is_int($value), is_float($value) => 'number',
        is_string($value) => 'string',
        is_bool($value) => 'boolean',
        default => 'null',
    };
}

function mergeShapes(mixed $a, mixed $b): mixed
{
    if ($a === null || $a === 'null' || $a === 'empty') {
        return $b;
    }
    if ($b === null || $b === 'null' || $b === 'empty') {
        return $a;
    }
    if (is_array($a) && is_array($b) && ! array_is_list($a) && ! array_is_list($b)) {
        foreach ($b as $key => $value) {
            $a[$key] = mergeShapes($a[$key] ?? null, $value);
        }
        ksort($a);

        return $a;
    }
    if (is_array($a) && is_array($b) && array_is_list($a) && array_is_list($b)) {
        return [mergeShapes($a[0] ?? null, $b[0] ?? null)];
    }

    return $a;
}

test('C1.3: export response type skeletons for every UI read endpoint', function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->seed(DemoHistorySeeder::class);

    $owner = User::where('email', 'owner@tindatrack.test')->firstOrFail();
    $headers = ['Authorization' => 'Bearer '.$owner->createToken('contracts')->plainTextToken];

    $product = Product::query()->orderBy('id')->firstOrFail();
    $customer = Customer::query()->orderBy('id')->firstOrFail();
    $saleId = $this->withHeaders($headers)->getJson('/api/sales')->json('data.0.id');

    $session = ScannerSession::create([
        'user_id' => $owner->id,
        'mode' => 'pos',
        'pairing_code' => 'CNTR-ACTS',
        'pairing_expires_at' => now()->addMinutes(10),
        'expires_at' => now()->addHours(8),
    ]);

    $endpoints = [
        'products-list' => '/api/products?per_page=5',
        'products-detail' => "/api/products/{$product->id}",
        'products-low-stock' => '/api/products/low-stock',
        'categories-list' => '/api/categories',
        'customers-list' => '/api/customers?per_page=5',
        'customers-detail' => "/api/customers/{$customer->id}",
        'customers-ledger' => "/api/customers/{$customer->id}/ledger",
        'sales-list' => '/api/sales?per_page=5',
        'sales-detail' => "/api/sales/{$saleId}",
        'utang-summary' => '/api/utang/summary',
        'utang-debtors' => '/api/utang/debtors',
        'dashboard' => '/api/dashboard',
        'reports-sales' => '/api/reports/sales',
        'reports-best-sellers' => '/api/reports/best-sellers',
        'reports-category-breakdown' => '/api/reports/category-breakdown',
        'reports-hourly' => '/api/reports/hourly',
        'inventory-overview' => '/api/inventory/overview',
        'inventory-movements' => '/api/inventory/movements?per_page=5',
        'inventory-restock-list' => '/api/inventory/restock-list',
        'settings' => '/api/settings',
        'users-list' => '/api/users',
        'users-detail' => "/api/users/{$owner->id}",
        'ai-status' => '/api/ai/status',
        'scanner-session' => "/api/scanner-sessions/{$session->id}",
        'barcode-lookup' => '/api/barcode-lookup/'.($product->barcode ?: '4801981118502'),
    ];

    $dir = base_path('../contracts/responses/api');
    if (! is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    foreach ($endpoints as $name => $url) {
        $response = $this->withHeaders($headers)->getJson($url);
        expect($response->status())->toBe(200, "{$name} ({$url}) returned {$response->status()}");

        $json = json_encode(responseShape($response->json()), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        file_put_contents("{$dir}/{$name}.json", $json."\n");
    }

    // Mutations whose responses the UI reads
    $debtor = Customer::where('credit_balance', '>', 1)->orderBy('id')->firstOrFail();
    $stocked = Product::where('is_active', true)->where('stock_quantity', '>', 1)->orderBy('id')->firstOrFail();
    $mutations = [
        'utang-payment-create' => ['/api/utang-payments', ['customer_id' => $debtor->id, 'amount' => 1]],
        'sales-create' => ['/api/sales', [
            'items' => [['product_id' => $stocked->id, 'quantity' => 1]],
            'payment_type' => 'cash',
            'amount_paid' => 10000,
        ]],
    ];
    foreach ($mutations as $name => [$url, $payload]) {
        $response = $this->withHeaders($headers)->postJson($url, $payload);
        expect($response->status())->toBe(201, "{$name} returned {$response->status()}: {$response->getContent()}");
        $json = json_encode(responseShape($response->json()), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        file_put_contents("{$dir}/{$name}.json", $json."\n");
    }

    expect(glob("{$dir}/*.json"))->toHaveCount(count($endpoints) + count($mutations));
});
