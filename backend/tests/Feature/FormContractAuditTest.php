<?php

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->owner = User::factory()->owner()->create();
    $this->cashier = User::factory()->cashier()->create();

    $this->ownerHeaders = [
        'Authorization' => "Bearer {$this->owner->createToken('test-owner')->plainTextToken}",
        'Accept' => 'application/json',
    ];

    $this->cashierHeaders = [
        'Authorization' => "Bearer {$this->cashier->createToken('test-cashier')->plainTextToken}",
        'Accept' => 'application/json',
    ];

    $this->fixturesDir = base_path('../contracts/payloads');
});

function loadFixture(string $fixturesDir, string $file): array
{
    $path = "{$fixturesDir}/{$file}";
    if (! file_exists($path)) {
        throw new RuntimeException("Fixture file not found: {$path}");
    }

    return json_decode(file_get_contents($path), true);
}

test('F3: product-create fixture creates product and optional fields can be omitted', function () {
    $payload = loadFixture($this->fixturesDir, 'product-create.json');
    $category = Category::first();
    $payload['category_id'] = $category->id;
    $payload['barcode'] = '4800016644899';
    $payload['sku'] = 'TT-TEST-001';

    // 1. Full fixture succeeds
    $res = $this->withHeaders($this->ownerHeaders)->postJson('/api/products', $payload);
    $res->assertCreated();
    expect($res->json('data.name'))->toBe($payload['name']);

    // 2. Omit every field the frontend form treats as optional
    $minimalPayload = [
        'name' => 'Minimal Required Product',
        'category_id' => $category->id,
        'price' => 20.0,
        'cost_price' => 15.0,
    ];

    $resMin = $this->withHeaders($this->ownerHeaders)->postJson('/api/products', $minimalPayload);
    $resMin->assertCreated();
    expect($resMin->json('data.sku'))->not->toBeEmpty();
});

test('F3: product-quick-add fixture succeeds without sku', function () {
    $payload = loadFixture($this->fixturesDir, 'product-quick-add.json');
    $category = Category::first();
    $payload['category_id'] = $category->id;
    $payload['barcode'] = '4800361376899';

    $res = $this->withHeaders($this->ownerHeaders)->postJson('/api/products', $payload);
    $res->assertCreated();
    expect($res->json('data.sku'))->toMatch('/^TT-[A-Z]{3}-\d{3,}$/');
});

test('F3: product-homemade fixture succeeds with internal barcode and auto sku', function () {
    $payload = loadFixture($this->fixturesDir, 'product-homemade.json');
    $category = Category::first();
    $payload['category_id'] = $category->id;
    $payload['barcode'] = '2000000000099';

    $res = $this->withHeaders($this->ownerHeaders)->postJson('/api/products', $payload);
    $res->assertCreated();
    expect($res->json('data.barcode'))->toBe('2000000000099');
});

test('F3: product-update fixture updates product successfully', function () {
    $product = Product::first();
    $payload = loadFixture($this->fixturesDir, 'product-update.json');
    $payload['category_id'] = $product->category_id;
    $payload['sku'] = $product->sku;
    $payload['barcode'] = '4800016644888';

    $res = $this->withHeaders($this->ownerHeaders)->putJson("/api/products/{$product->id}", $payload);
    $res->assertOk();
    expect($res->json('data.name'))->toBe($payload['name']);
});

test('F3: product-bulk fixture bulk-intakes products', function () {
    $payload = loadFixture($this->fixturesDir, 'product-bulk.json');
    $category = Category::first();
    $payload['products'][0]['category_id'] = $category->id;
    $payload['products'][0]['barcode'] = '4800016052099';

    $res = $this->withHeaders($this->ownerHeaders)->postJson('/api/products/bulk', $payload);
    $res->assertCreated();
    expect($res->json('data'))->toHaveCount(1);
    expect($res->json('data.0.sku'))->not->toBeEmpty();
});

test('F3: product-adjust-stock fixture adjusts inventory count', function () {
    $product = Product::first();
    $payload = loadFixture($this->fixturesDir, 'product-adjust-stock.json');

    $res = $this->withHeaders($this->ownerHeaders)->postJson("/api/products/{$product->id}/adjust", $payload);
    $res->assertOk();
});

test('F3: category create and update fixtures succeed and optional fields can be omitted', function () {
    $createPayload = loadFixture($this->fixturesDir, 'category-create.json');

    $res = $this->withHeaders($this->ownerHeaders)->postJson('/api/categories', $createPayload);
    $res->assertCreated();
    $categoryId = $res->json('data.id');

    // Minimal create (only name)
    $resMin = $this->withHeaders($this->ownerHeaders)->postJson('/api/categories', [
        'name' => 'Minimal Category Name',
    ]);
    $resMin->assertCreated();

    // Update
    $updatePayload = loadFixture($this->fixturesDir, 'category-update.json');
    $resUpdate = $this->withHeaders($this->ownerHeaders)->putJson("/api/categories/{$categoryId}", $updatePayload);
    $resUpdate->assertOk();
});

test('F3: customer create, pos-mini, and update fixtures succeed and optional fields can be omitted', function () {
    $createPayload = loadFixture($this->fixturesDir, 'customer-create.json');

    // Cashier can create customer
    $res = $this->withHeaders($this->cashierHeaders)->postJson('/api/customers', $createPayload);
    $res->assertCreated();
    $customerId = $res->json('data.id');

    // POS Mini form
    $miniPayload = loadFixture($this->fixturesDir, 'customer-pos-mini.json');
    $resMini = $this->withHeaders($this->cashierHeaders)->postJson('/api/customers', $miniPayload);
    $resMini->assertCreated();

    // Minimal customer (only name)
    $resMin = $this->withHeaders($this->cashierHeaders)->postJson('/api/customers', [
        'name' => 'Juan Dela Cruz Alone',
    ]);
    $resMin->assertCreated();

    // Update
    $updatePayload = loadFixture($this->fixturesDir, 'customer-update.json');
    $resUpdate = $this->withHeaders($this->cashierHeaders)->putJson("/api/customers/{$customerId}", $updatePayload);
    $resUpdate->assertOk();
});

test('F3: sale checkout (cash and utang) fixtures succeed for cashier', function () {
    $product = Product::first();
    $customer = Customer::first();

    // Cash sale
    $cashPayload = loadFixture($this->fixturesDir, 'sale-cash.json');
    $cashPayload['items'][0]['product_id'] = $product->id;
    $cashPayload['amount_paid'] = $product->price * 2;

    $resCash = $this->withHeaders($this->cashierHeaders)->postJson('/api/sales', $cashPayload);
    $resCash->assertCreated();

    // Utang sale
    $utangPayload = loadFixture($this->fixturesDir, 'sale-utang.json');
    $utangPayload['items'][0]['product_id'] = $product->id;
    $utangPayload['customer_id'] = $customer->id;

    $resUtang = $this->withHeaders($this->cashierHeaders)->postJson('/api/sales', $utangPayload);
    $resUtang->assertCreated();
});

test('F3: sale void fixture succeeds for owner', function () {
    $product = Product::first();

    $cashPayload = loadFixture($this->fixturesDir, 'sale-cash.json');
    $cashPayload['items'][0]['product_id'] = $product->id;
    $cashPayload['amount_paid'] = $product->price * 2;

    $resCash = $this->withHeaders($this->ownerHeaders)->postJson('/api/sales', $cashPayload);
    $resCash->assertCreated();
    $saleId = $resCash->json('data.id');

    // Void sale (owner only)
    $voidPayload = loadFixture($this->fixturesDir, 'sale-void.json');
    $resVoid = $this->withHeaders($this->ownerHeaders)->postJson("/api/sales/{$saleId}/void", $voidPayload);
    $resVoid->assertOk();
});

test('F3: utang payment fixture records customer debt repayment', function () {
    $customer = Customer::first();
    $customer->update(['credit_balance' => 200.00]);

    $payload = loadFixture($this->fixturesDir, 'utang-payment.json');
    $payload['customer_id'] = $customer->id;
    $payload['amount'] = 50.00;

    $res = $this->withHeaders($this->cashierHeaders)->postJson('/api/utang-payments', $payload);
    $res->assertCreated();
    expect((float) $customer->fresh()->credit_balance)->toBe(150.00);
});

test('F3: staff create, update, and reset password fixtures succeed', function () {
    $createPayload = loadFixture($this->fixturesDir, 'staff-create.json');
    $createPayload['email'] = 'test.cashier.audit@tindatrack.ph';

    $res = $this->withHeaders($this->ownerHeaders)->postJson('/api/users', $createPayload);
    $res->assertCreated();
    $userId = $res->json('data.id');

    // Update
    $updatePayload = loadFixture($this->fixturesDir, 'staff-update.json');
    $updatePayload['email'] = 'test.cashier.audit.updated@tindatrack.ph';
    $resUpdate = $this->withHeaders($this->ownerHeaders)->patchJson("/api/users/{$userId}", $updatePayload);
    $resUpdate->assertOk();

    // Reset password
    $resetPayload = loadFixture($this->fixturesDir, 'staff-reset-password.json');
    $resReset = $this->withHeaders($this->ownerHeaders)->postJson("/api/users/{$userId}/reset-password", $resetPayload);
    $resReset->assertOk();
});

test('F3: settings update fixture saves store profile, receipt, and AI toggles', function () {
    $payload = loadFixture($this->fixturesDir, 'settings-update.json');

    $res = $this->withHeaders($this->ownerHeaders)->putJson('/api/settings', $payload);
    $res->assertOk();
    expect($res->json('data.store_name'))->toBe($payload['store_name']);
    expect($res->json('data.ai_enabled'))->toBe(true);
});

test('F3: account password change fixture updates authenticated user password', function () {
    $payload = loadFixture($this->fixturesDir, 'account-password.json');

    $res = $this->withHeaders($this->ownerHeaders)->putJson('/api/user/password', $payload);
    $res->assertOk();
});

test('F3: scanner session create fixture succeeds for cashier', function () {
    $sessionPayload = loadFixture($this->fixturesDir, 'scanner-session-create.json');

    $resSession = $this->withHeaders($this->cashierHeaders)->postJson('/api/scanner-sessions', $sessionPayload);
    $resSession->assertCreated();
    expect($resSession->json('data.pairing_code'))->not->toBeEmpty();
});

test('F3: ai experiment create fixture succeeds for owner', function () {
    $expPayload = loadFixture($this->fixturesDir, 'ai-experiment-create.json');
    $resExp = $this->withHeaders($this->ownerHeaders)->postJson('/api/ai/experiments', $expPayload);
    $resExp->assertCreated();
});

test('F3: auth login fixture succeeds', function () {
    $loginPayload = loadFixture($this->fixturesDir, 'auth-login.json');
    User::factory()->owner()->create([
        'email' => $loginPayload['email'],
        'password' => Hash::make($loginPayload['password']),
    ]);

    $resLogin = $this->postJson('/api/login', $loginPayload);
    $resLogin->assertOk();
    expect($resLogin->json('token'))->not->toBeEmpty();
});

test('F3: auth register fixture succeeds', function () {
    $regPayload = loadFixture($this->fixturesDir, 'auth-register.json');
    $resReg = $this->postJson('/api/register', $regPayload);
    $resReg->assertCreated();
    expect($resReg->json('token'))->not->toBeEmpty();
});
