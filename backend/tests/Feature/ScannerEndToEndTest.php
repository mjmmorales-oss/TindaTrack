<?php

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\ScannerSession;
use App\Models\User;
use Carbon\Carbon;

beforeEach(function () {
    $this->owner = User::factory()->create([
        'role' => UserRole::Owner,
        'is_active' => true,
        'email' => 'owner.e2e@tindatrack.test',
    ]);
    $this->ownerToken = $this->owner->createToken('test-token')->plainTextToken;

    $this->category = Category::first() ?? Category::factory()->create();

    $this->product = Product::firstOrCreate(
        ['barcode' => '3017620422003'],
        [
            'name' => 'Nutella Hazelnut Spread',
            'sku' => 'NOO-LMC-001',
            'price' => 18.50,
            'cost_price' => 15.00,
            'stock_quantity' => 50,
            'reorder_level' => 10,
            'category_id' => $this->category->id,
            'is_active' => true,
        ]
    );
});

test('scanner end-to-end flow: session creation, normalized pairing, scans, events polling, and session lifecycle', function () {
    // 1. Owner creates POS scanner session
    $createRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/scanner-sessions', ['mode' => 'pos']);

    $createRes->assertStatus(201)
        ->assertJsonStructure([
            'data' => [
                'id',
                'pairing_code',
                'pairing_expires_at',
                'expires_at',
                'mode',
            ],
        ]);

    $sessionId = $createRes->json('data.id');
    $pairingCode = $createRes->json('data.pairing_code');
    $pairingExpiresAt = $createRes->json('data.pairing_expires_at');

    // Assert pairing code alphabet (ABCDEFGHJKMNPQRSTUVWXYZ23456789) and format XXXX-XXXX
    expect($pairingCode)->toMatch('/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/');
    expect(Carbon::parse($pairingExpiresAt)->isFuture())->toBeTrue();

    // 2. Pair with lowercase and dash-less variant
    $dashlessLowerCode = strtolower(str_replace('-', '', $pairingCode));
    $pairRes = $this->postJson('/api/scanner/pair', [
        'pairing_code' => $dashlessLowerCode,
        'device_label' => 'Android Phone',
    ]);

    $pairRes->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'token',
                'session' => [
                    'id',
                    'mode',
                    'expires_at',
                ],
                'store_name',
                'user_name',
            ],
        ]);

    $deviceToken = $pairRes->json('data.token');
    expect($deviceToken)->toBeString()->toHaveLength(40);
    expect($pairRes->json('data.session.id'))->toBe($sessionId);

    // 3. Device sends a scan for a seeded product
    $scanRes = $this->withHeader('X-Scanner-Token', $deviceToken)
        ->postJson('/api/scanner/scans', [
            'barcode' => $this->product->barcode,
            'quantity' => 2,
        ]);

    $scanRes->assertStatus(201)
        ->assertJsonStructure([
            'data' => [
                'event_id',
                'status',
                'product' => [
                    'id',
                    'name',
                    'price',
                    'stock',
                ],
            ],
        ]);

    expect($scanRes->json('data.status'))->toBe('found');
    expect($scanRes->json('data.product.id'))->toBe($this->product->id);

    $eventId = $scanRes->json('data.event_id');

    // 4. Laptop polls scanner events
    $eventsRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/scanner-sessions/{$sessionId}/events?after=0");

    $eventsRes->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'scanner_session_id',
                    'barcode',
                    'status',
                    'product_id',
                    'quantity',
                    'payload',
                    'created_at',
                ],
            ],
        ]);

    $events = $eventsRes->json('data');
    expect(count($events))->toBeGreaterThanOrEqual(1);
    expect($events[0]['id'])->toBe($eventId);
    expect($events[0]['barcode'])->toBe($this->product->barcode);
    expect($events[0]['payload']['name'])->toBe($this->product->name);

    // 5. Trying to pair again with already used session code returns 422 with reason=used
    $usedPairRes = $this->postJson('/api/scanner/pair', [
        'pairing_code' => $pairingCode,
    ]);
    $usedPairRes->assertStatus(422)
        ->assertJson([
            'reason' => 'used',
        ]);

    // 6. Creating a second session ends the first active unended session
    $createSecondRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/scanner-sessions', ['mode' => 'pos']);

    $createSecondRes->assertStatus(201);
    $secondSessionId = $createSecondRes->json('data.id');
    $secondPairingCode = $createSecondRes->json('data.pairing_code');

    // Verify session 1 is ended
    $firstSessionDb = ScannerSession::find($sessionId);
    expect($firstSessionDb->ended_at)->not->toBeNull();

    // 7. Pairing with non-existent code returns 422 with reason=not_found
    $notFoundRes = $this->postJson('/api/scanner/pair', [
        'pairing_code' => 'ZZZZ-9999',
    ]);
    $notFoundRes->assertStatus(422)
        ->assertJson([
            'reason' => 'not_found',
        ]);

    // 8. Ending session 2 then pairing returns 422 with reason=expired
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->deleteJson("/api/scanner-sessions/{$secondSessionId}")
        ->assertStatus(200);

    $expiredPairRes = $this->postJson('/api/scanner/pair', [
        'pairing_code' => $secondPairingCode,
    ]);
    $expiredPairRes->assertStatus(422)
        ->assertJson([
            'reason' => 'expired',
        ]);
});
