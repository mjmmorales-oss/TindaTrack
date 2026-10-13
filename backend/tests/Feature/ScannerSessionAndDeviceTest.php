<?php

use App\Enums\UserRole;
use App\Events\ScannerItemScanned;
use App\Models\Category;
use App\Models\Product;
use App\Models\ScannerEvent;
use App\Models\ScannerSession;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->owner = User::factory()->create([
        'role' => UserRole::Owner,
        'is_active' => true,
    ]);
    $this->ownerToken = $this->owner->createToken('test')->plainTextToken;

    $this->cashier = User::factory()->create([
        'role' => UserRole::Cashier,
        'is_active' => true,
    ]);
    $this->cashierToken = $this->cashier->createToken('test')->plainTextToken;
});

test('full pairing flow: create session, pair with code, and verify session status', function () {
    // 1. Owner creates POS scanner session
    $createRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/scanner-sessions', ['mode' => 'pos']);

    $createRes->assertStatus(201)
        ->assertJsonStructure(['data' => ['id', 'pairing_code', 'pairing_expires_at', 'expires_at', 'mode']]);

    $sessionId = $createRes->json('data.id');
    $pairingCode = $createRes->json('data.pairing_code');

    // 2. Phone pairs using the code
    $pairRes = $this->postJson('/api/scanner/pair', [
        'pairing_code' => $pairingCode,
        'device_label' => 'iPhone 15 Pro',
    ]);

    $pairRes->assertStatus(200)
        ->assertJsonStructure(['data' => ['token', 'session' => ['id', 'mode', 'expires_at'], 'store_name', 'user_name']]);

    $deviceToken = $pairRes->json('data.token');
    expect($pairRes->json('data.session.id'))->toBe($sessionId);

    // 3. Laptop checks session status
    $statusRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/scanner-sessions/{$sessionId}");

    $statusRes->assertStatus(200)
        ->assertJson([
            'data' => [
                'id' => $sessionId,
                'paired' => true,
                'device_label' => 'iPhone 15 Pro',
                'online' => true,
                'ended_at' => null,
            ],
        ]);
});

test('a pairing code cannot be reused once paired', function () {
    $session = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'TEST-1234',
        'pairing_expires_at' => now()->addMinutes(10),
        'expires_at' => now()->addHours(12),
    ]);

    // First pairing succeeds
    $this->postJson('/api/scanner/pair', ['pairing_code' => 'TEST-1234'])
        ->assertStatus(200);

    // Second pairing attempt with same code fails
    $this->postJson('/api/scanner/pair', ['pairing_code' => 'TEST-1234'])
        ->assertStatus(422)
        ->assertJson(['reason' => 'used', 'message' => 'This pairing code has already been used. Please request a new code from the POS.']);
});

test('an expired pairing code returns 422', function () {
    ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'EXPR-9999',
        'pairing_expires_at' => now()->subMinute(),
        'expires_at' => now()->addHours(12),
    ]);

    $this->postJson('/api/scanner/pair', ['pairing_code' => 'EXPR-9999'])
        ->assertStatus(422)
        ->assertJson(['reason' => 'expired', 'message' => 'Pairing code has expired. Please request a new code from the POS.']);
});

test('a wrong device token returns 401', function () {
    $this->withHeader('X-Scanner-Token', 'invalid-random-token-here')
        ->postJson('/api/scanner/scans', ['barcode' => '3017620422003'])
        ->assertStatus(401)
        ->assertJson(['message' => 'Scanner session ended']);
});

test('an ended session returns 401', function () {
    $token = 'test-token-40chars-random-string-sample-1';
    ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'ENDD-0001',
        'pairing_expires_at' => now()->addMinutes(10),
        'device_token_hash' => hash('sha256', $token),
        'ended_at' => now(),
        'expires_at' => now()->addHours(12),
    ]);

    $this->withHeader('X-Scanner-Token', $token)
        ->postJson('/api/scanner/scans', ['barcode' => '3017620422003'])
        ->assertStatus(401)
        ->assertJson(['message' => 'Scanner session ended']);
});

test('a scan creates an event with the correct status for found, out_of_stock, and unknown products', function () {
    $token = 'test-token-40chars-random-string-sample-2';
    $session = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'SCAN-0002',
        'pairing_expires_at' => now()->addMinutes(10),
        'device_token_hash' => hash('sha256', $token),
        'expires_at' => now()->addHours(12),
    ]);

    $category = Category::factory()->create();

    // 1. Found product with stock > 0
    $pFound = Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'Coca-Cola 1.5L',
        'barcode' => '3017620422003',
        'price' => 75.0,
        'stock_quantity' => 10,
        'is_active' => true,
    ]);

    $resFound = $this->withHeader('X-Scanner-Token', $token)
        ->postJson('/api/scanner/scans', ['barcode' => '3017620422003', 'quantity' => 2]);

    $resFound->assertStatus(201)
        ->assertJson([
            'data' => [
                'status' => 'found',
                'product' => [
                    'id' => $pFound->id,
                    'name' => 'Coca-Cola 1.5L',
                    'price' => 75.0,
                ],
            ],
        ]);

    // 2. Out of stock product (stock = 0)
    $pOOS = Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'Out of Stock Coffee',
        'barcode' => '96385074',
        'price' => 15.0,
        'stock_quantity' => 0,
        'is_active' => true,
    ]);

    $resOOS = $this->withHeader('X-Scanner-Token', $token)
        ->postJson('/api/scanner/scans', ['barcode' => '96385074']);

    $resOOS->assertStatus(201)
        ->assertJson([
            'data' => [
                'status' => 'out_of_stock',
                'product' => [
                    'id' => $pOOS->id,
                    'name' => 'Out of Stock Coffee',
                    'stock' => 0,
                ],
            ],
        ]);

    // 3. Unknown barcode
    $resUnknown = $this->withHeader('X-Scanner-Token', $token)
        ->postJson('/api/scanner/scans', ['barcode' => 'SKU-UNKNOWN-ITEM']);

    $resUnknown->assertStatus(201)
        ->assertJson([
            'data' => [
                'status' => 'unknown',
                'product' => null,
            ],
        ]);

    expect(ScannerEvent::where('scanner_session_id', $session->id)->count())->toBe(3);
});

test('polling with after returns only newer events', function () {
    $session = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'POLL-0003',
        'pairing_expires_at' => now()->addMinutes(10),
        'expires_at' => now()->addHours(12),
    ]);

    $e1 = ScannerEvent::create(['scanner_session_id' => $session->id, 'barcode' => '1111', 'status' => 'unknown']);
    $e2 = ScannerEvent::create(['scanner_session_id' => $session->id, 'barcode' => '2222', 'status' => 'unknown']);
    $e3 = ScannerEvent::create(['scanner_session_id' => $session->id, 'barcode' => '3333', 'status' => 'unknown']);

    // Polling with after=e1->id returns only e2 and e3
    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/scanner-sessions/{$session->id}/events?after={$e1->id}");

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data)->toHaveCount(2);
    expect($data[0]['id'])->toBe($e2->id);
    expect($data[1]['id'])->toBe($e3->id);
});

test('user A cannot read user B session or events', function () {
    $userB = User::factory()->create(['role' => UserRole::Owner, 'is_active' => true]);
    $userBToken = $userB->createToken('test')->plainTextToken;

    $sessionA = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'USRA-0004',
        'pairing_expires_at' => now()->addMinutes(10),
        'expires_at' => now()->addHours(12),
    ]);

    // User B tries to view session A
    $this->withHeader('Authorization', "Bearer {$userBToken}")
        ->getJson("/api/scanner-sessions/{$sessionA->id}")
        ->assertStatus(403);

    // User B tries to read session A events
    $this->withHeader('Authorization', "Bearer {$userBToken}")
        ->getJson("/api/scanner-sessions/{$sessionA->id}/events")
        ->assertStatus(403);

    // User B tries to delete session A
    $this->withHeader('Authorization', "Bearer {$userBToken}")
        ->deleteJson("/api/scanner-sessions/{$sessionA->id}")
        ->assertStatus(403);
});

test('cashier cannot create an inventory-mode session but can create a pos session', function () {
    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/scanner-sessions', ['mode' => 'inventory'])
        ->assertStatus(403);

    $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
        ->postJson('/api/scanner-sessions', ['mode' => 'pos'])
        ->assertStatus(201);
});

test('device token cannot call normal API routes', function () {
    $token = 'test-token-40chars-random-string-sample-5';
    ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'NORM-0005',
        'pairing_expires_at' => now()->addMinutes(10),
        'device_token_hash' => hash('sha256', $token),
        'expires_at' => now()->addHours(12),
    ]);

    // Calling GET /api/products with only X-Scanner-Token (no Sanctum Bearer token) returns 401
    $this->withHeader('X-Scanner-Token', $token)
        ->getJson('/api/products')
        ->assertStatus(401);
});

test('Event fake asserts that ScannerItemScanned broadcast event is dispatched', function () {
    Event::fake([ScannerItemScanned::class]);

    $token = 'test-token-40chars-random-string-sample-6';
    $session = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'BCST-0006',
        'pairing_expires_at' => now()->addMinutes(10),
        'device_token_hash' => hash('sha256', $token),
        'expires_at' => now()->addHours(12),
    ]);

    $this->withHeader('X-Scanner-Token', $token)
        ->postJson('/api/scanner/scans', ['barcode' => '3017620422003']);

    Event::assertDispatched(ScannerItemScanned::class, function ($e) use ($session) {
        return $e->event->scanner_session_id === $session->id && $e->event->barcode === '3017620422003';
    });
});

test('heartbeat touches last_seen_at and returns ended false', function () {
    $token = 'test-token-40chars-random-string-sample-7';
    $session = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'HART-0007',
        'pairing_expires_at' => now()->addMinutes(10),
        'device_token_hash' => hash('sha256', $token),
        'last_seen_at' => now()->subMinutes(5),
        'expires_at' => now()->addHours(12),
    ]);

    $this->withHeader('X-Scanner-Token', $token)
        ->postJson('/api/scanner/heartbeat')
        ->assertStatus(200)
        ->assertJson(['data' => ['ended' => false]]);

    $session->refresh();
    expect($session->last_seen_at->gt(now()->subSeconds(5)))->toBeTrue();
});

test('unknown barcodes endpoint returns distinct barcodes and counts for owner', function () {
    $session = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'UNKN-0008',
        'pairing_expires_at' => now()->addMinutes(10),
        'expires_at' => now()->addHours(12),
    ]);

    ScannerEvent::create(['scanner_session_id' => $session->id, 'barcode' => 'UNKNOWN-ABC', 'status' => 'unknown', 'created_at' => now()->subMinutes(10)]);
    ScannerEvent::create(['scanner_session_id' => $session->id, 'barcode' => 'UNKNOWN-ABC', 'status' => 'unknown', 'created_at' => now()->subMinutes(5)]);
    ScannerEvent::create(['scanner_session_id' => $session->id, 'barcode' => 'UNKNOWN-XYZ', 'status' => 'unknown', 'created_at' => now()->subMinutes(2)]);

    $response = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/scanner/unknown-barcodes');

    $response->assertStatus(200);
    $data = $response->json('data');
    expect($data)->toHaveCount(2);

    $barcodes = collect($data)->pluck('scan_count', 'barcode');
    expect($barcodes['UNKNOWN-ABC'])->toBe(2);
    expect($barcodes['UNKNOWN-XYZ'])->toBe(1);
});

test('creating a product with a barcode marks matching unresolved scanner events as resolved', function () {
    $session = ScannerSession::create([
        'user_id' => $this->owner->id,
        'mode' => 'pos',
        'pairing_code' => 'UNKN-0009',
        'pairing_expires_at' => now()->addMinutes(10),
        'expires_at' => now()->addHours(12),
    ]);

    $event = ScannerEvent::create([
        'scanner_session_id' => $session->id,
        'barcode' => '4800016054111',
        'status' => 'unknown',
        'created_at' => now()->subMinutes(10),
    ]);

    $category = Category::factory()->create(['name' => 'Noodles']);

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/products', [
            'name' => 'Pancit Canton Kalamansi',
            'sku' => 'TEST-SKU-999',
            'barcode' => '4800016054111',
            'category_id' => $category->id,
            'price' => 18,
            'cost_price' => 15,
        ])
        ->assertStatus(201);

    $event->refresh();
    expect($event->resolved_at)->not->toBeNull();
    expect($event->product_id)->not->toBeNull();
});
