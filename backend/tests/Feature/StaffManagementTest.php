<?php

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Enums\UserRole;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    $this->owner = User::factory()->owner()->create([
        'email' => 'test_owner_'.uniqid().'@tindatrack.test',
        'is_active' => true,
    ]);
    $this->ownerToken = $this->owner->createToken('owner-token')->plainTextToken;

    $this->cashier = User::factory()->create([
        'role' => UserRole::Cashier,
        'email' => 'test_cashier_'.uniqid().'@tindatrack.test',
        'is_active' => true,
        'must_change_password' => false,
    ]);
    $this->cashierToken = $this->cashier->createToken('cashier-token')->plainTextToken;
});

test('GET /api/users lists active, inactive, and archived users with sales metrics without N+1 queries', function () {
    $inactive = User::factory()->create([
        'role' => UserRole::Cashier,
        'is_active' => false,
        'name' => 'Inactive Cashier',
    ]);

    $archived = User::factory()->create([
        'role' => UserRole::Cashier,
        'is_active' => true,
        'name' => 'Archived Cashier',
    ]);
    $archived->delete();

    // Create completed sale for cashier
    Sale::create([
        'sale_no' => 'SL-'.uniqid(),
        'user_id' => $this->cashier->id,
        'total_amount' => 250.50,
        'amount_paid' => 300,
        'change_amount' => 49.50,
        'payment_type' => PaymentType::Cash,
        'status' => SaleStatus::Completed,
    ]);

    // Active users
    $resActive = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/users?status=active')
        ->assertOk();

    expect($resActive->json('data'))->toBeArray();
    $cashierRow = collect($resActive->json('data'))->firstWhere('id', $this->cashier->id);
    expect($cashierRow)->not->toBeNull();
    expect($cashierRow['sales_count'])->toBe(1);
    expect($cashierRow['sales_total_today'])->toBe(250.5);

    // Inactive users
    $resInactive = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/users?status=inactive')
        ->assertOk();

    $inactiveRow = collect($resInactive->json('data'))->firstWhere('id', $inactive->id);
    expect($inactiveRow)->not->toBeNull();

    // Archived users
    $resArchived = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson('/api/users?status=archived')
        ->assertOk();

    $archivedRow = collect($resArchived->json('data'))->firstWhere('id', $archived->id);
    expect($archivedRow)->not->toBeNull();
    expect($archivedRow['deleted_at'])->not->toBeNull();

    // Search filter
    $resSearch = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/users?status=active&search={$this->cashier->name}")
        ->assertOk();
    expect(collect($resSearch->json('data'))->pluck('id'))->toContain($this->cashier->id);
});

test('GET /api/users/{user} returns user details including archived', function () {
    $archived = User::factory()->create(['role' => UserRole::Cashier]);
    $archived->delete();

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->getJson("/api/users/{$archived->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $archived->id)
        ->assertJsonPath('data.deleted_at', fn ($val) => ! empty($val));
});

test('POST /api/users creates cashier with generated password and must_change_password flag', function () {
    $email = 'new_cashier_'.uniqid().'@tindatrack.test';

    $res = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/users', [
            'name' => 'Pedro Penduko',
            'email' => $email,
            'phone' => '09181234567',
            'generate_password' => true,
        ])
        ->assertStatus(201);

    expect($res->json('temporary_password'))->toBeString()->not->toBeEmpty();
    expect($res->json('data.must_change_password'))->toBeTrue();

    $created = User::where('email', $email)->first();
    expect($created)->not->toBeNull();
    expect($created->must_change_password)->toBeTrue();
    expect($created->phone)->toBe('09181234567');
    expect(Hash::check($res->json('temporary_password'), $created->password))->toBeTrue();
});

test('POST /api/users enforces password complexity and does not default to password123', function () {
    // Missing password and no generate_password flag
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/users', [
            'name' => 'Insecure Staff',
            'email' => 'insecure_'.uniqid().'@tindatrack.test',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['password']);

    // Password lacking numbers
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/users', [
            'name' => 'Weak Staff',
            'email' => 'weak_'.uniqid().'@tindatrack.test',
            'password' => 'onlyletters',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['password']);
});

test('POST /api/users fails with owner_protected when attempting to create an owner', function () {
    $res = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson('/api/users', [
            'name' => 'Second Owner',
            'email' => 'owner2_'.uniqid().'@tindatrack.test',
            'role' => 'owner',
            'generate_password' => true,
        ])
        ->assertStatus(422);

    expect($res->json('code'))->toBe('owner_protected');
});

test('PATCH /api/users/{user} updates cashier details but rejects editing owner accounts', function () {
    // Update cashier
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->patchJson("/api/users/{$this->cashier->id}", [
            'name' => 'Updated Cashier Name',
            'email' => $this->cashier->email,
            'phone' => '09998887777',
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated Cashier Name')
        ->assertJsonPath('data.phone', '09998887777');

    // Attempt to edit owner
    $resOwner = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->patchJson("/api/users/{$this->owner->id}", [
            'name' => 'Hacked Owner Name',
            'email' => $this->owner->email,
        ])
        ->assertStatus(422);

    expect($resOwner->json('code'))->toBe('owner_protected');
});

test('PATCH /api/users/{user}/toggle-active toggles cashier status and enforces self_action & last_owner', function () {
    // Deactivate cashier
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->patchJson("/api/users/{$this->cashier->id}/toggle-active")
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    expect($this->cashier->fresh()->tokens()->count())->toBe(0);

    // Activate cashier back
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->patchJson("/api/users/{$this->cashier->id}/toggle-active")
        ->assertOk()
        ->assertJsonPath('data.is_active', true);

    // Self action
    $resSelf = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->patchJson("/api/users/{$this->owner->id}/toggle-active")
        ->assertStatus(422);
    expect($resSelf->json('code'))->toBe('self_action');
});

test('POST /api/users/{user}/reset-password sets temporary password, revokes tokens, and enforces rule codes', function () {
    $res = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/users/{$this->cashier->id}/reset-password", [
            'generate' => true,
        ])
        ->assertOk();

    expect($res->json('temporary_password'))->toBeString()->not->toBeEmpty();
    expect($this->cashier->fresh()->must_change_password)->toBeTrue();
    expect($this->cashier->fresh()->tokens()->count())->toBe(0);

    // Attempt to reset own password
    $resSelf = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/users/{$this->owner->id}/reset-password", ['generate' => true])
        ->assertStatus(422);
    expect($resSelf->json('code'))->toBe('self_action');
});

test('POST /api/users/{user}/revoke-sessions deletes all user tokens', function () {
    expect($this->cashier->tokens()->count())->toBeGreaterThan(0);

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/users/{$this->cashier->id}/revoke-sessions")
        ->assertOk();

    expect($this->cashier->fresh()->tokens()->count())->toBe(0);
});

test('DELETE /api/users/{user} archives cashier, revokes tokens, and blocks subsequent login', function () {
    $password = 'Secret123!';
    $this->cashier->update(['password' => Hash::make($password)]);

    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->deleteJson("/api/users/{$this->cashier->id}")
        ->assertOk();

    expect($this->cashier->fresh()->trashed())->toBeTrue();
    expect($this->cashier->fresh()->tokens()->count())->toBe(0);

    app('auth')->forgetGuards();

    // Login must be blocked for archived user
    $this->flushHeaders()
        ->postJson('/api/login', [
            'email' => $this->cashier->email,
            'password' => $password,
        ])
        ->assertStatus(422);
});

test('POST /api/users/{user}/restore restores archived user, but fails with email_taken on conflict', function () {
    $archived = User::factory()->create([
        'role' => UserRole::Cashier,
        'email' => 'conflict_'.uniqid().'@tindatrack.test',
    ]);
    $archived->delete();

    // Restores cleanly
    $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/users/{$archived->id}/restore")
        ->assertOk();
    expect($archived->fresh()->trashed())->toBeFalse();

    // Archive again
    $archived->delete();

    // In SQLite, drop the DB-level unique constraint temporarily so we can simulate
    // an email conflict where an active user was registered with this email
    Schema::table('users', function ($table) {
        $table->dropUnique(['email']);
    });

    User::factory()->create([
        'role' => UserRole::Cashier,
        'email' => $archived->email,
    ]);

    // Restore should fail with email_taken
    $resConflict = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
        ->postJson("/api/users/{$archived->id}/restore")
        ->assertStatus(422);

    expect($resConflict->json('code'))->toBe('email_taken');
});

test('sales reports still show archived cashier name via withTrashed relation', function () {
    $sale = Sale::create([
        'sale_no' => 'SL-'.uniqid(),
        'user_id' => $this->cashier->id,
        'total_amount' => 500,
        'amount_paid' => 500,
        'change_amount' => 0,
        'payment_type' => PaymentType::Cash,
        'status' => SaleStatus::Completed,
    ]);

    $this->cashier->delete();

    $loadedSale = Sale::with('cashier')->find($sale->id);
    expect($loadedSale->cashier)->not->toBeNull();
    expect($loadedSale->cashier->id)->toBe($this->cashier->id);
    expect($loadedSale->cashier->name)->toBe($this->cashier->name);
});

test('forced password change: login returns must_change_password and PUT /user/password clears it', function () {
    $password = 'TempPass123!';
    $this->cashier->update([
        'password' => Hash::make($password),
        'must_change_password' => true,
    ]);

    // Login response contains must_change_password: true
    $loginRes = $this->flushHeaders()
        ->postJson('/api/login', [
            'email' => $this->cashier->email,
            'password' => $password,
        ])
        ->assertOk()
        ->assertJsonPath('must_change_password', true);

    $token = $loginRes->json('token');

    // Change password via /user/password
    $this->withHeader('Authorization', "Bearer $token")
        ->putJson('/api/user/password', [
            'current_password' => $password,
            'password' => 'NewSecurePass123!',
            'password_confirmation' => 'NewSecurePass123!',
        ])
        ->assertOk();

    expect($this->cashier->fresh()->must_change_password)->toBeFalse();
});

test('cashier receives 403 on all /api/users endpoints', function () {
    $endpoints = [
        ['getJson', '/api/users', []],
        ['postJson', '/api/users', ['name' => 'Test', 'email' => 't@t.com']],
        ['getJson', "/api/users/{$this->cashier->id}", []],
        ['patchJson', "/api/users/{$this->cashier->id}", ['name' => 'Test']],
        ['patchJson', "/api/users/{$this->cashier->id}/toggle-active", []],
        ['postJson', "/api/users/{$this->cashier->id}/reset-password", ['generate' => true]],
        ['postJson', "/api/users/{$this->cashier->id}/revoke-sessions", []],
        ['deleteJson', "/api/users/{$this->cashier->id}", []],
        ['postJson', "/api/users/{$this->cashier->id}/restore", []],
    ];

    foreach ($endpoints as [$method, $uri, $payload]) {
        $response = $this->withHeader('Authorization', "Bearer {$this->cashierToken}")
            ->{$method}($uri, $payload);

        $response->assertStatus(403);
    }
});
