<?php

use App\Enums\UserRole;
use App\Models\User;

test('owner can access /api/owner/ping with 200 status', function () {
    $owner = User::factory()->owner()->create();
    $token = $owner->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer $token")
        ->getJson('/api/owner/ping');

    $response->assertStatus(200)
        ->assertJson([
            'message' => 'Hello, owner! Role middleware works.',
        ]);
});

test('cashier receives 403 on /api/owner/ping', function () {
    $cashier = User::factory()->create([
        'role' => UserRole::Cashier,
    ]);
    $token = $cashier->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer $token")
        ->getJson('/api/owner/ping');

    $response->assertStatus(403)
        ->assertJson([
            'message' => 'You do not have permission to perform this action.',
        ]);
});

test('both owner and cashier can access /api/staff/ping', function () {
    $owner = User::factory()->owner()->create();
    $ownerToken = $owner->createToken('test')->plainTextToken;

    $this->withHeader('Authorization', "Bearer $ownerToken")
        ->getJson('/api/staff/ping')
        ->assertStatus(200)
        ->assertJson([
            'message' => 'Hello, staff! Any active role can see this.',
        ]);

    $cashier = User::factory()->create([
        'role' => UserRole::Cashier,
    ]);
    $cashierToken = $cashier->createToken('test')->plainTextToken;

    $this->withHeader('Authorization', "Bearer $cashierToken")
        ->getJson('/api/staff/ping')
        ->assertStatus(200)
        ->assertJson([
            'message' => 'Hello, staff! Any active role can see this.',
        ]);
});

test('inactive user is blocked from protected routes and tokens are deleted', function () {
    $user = User::factory()->create(['is_active' => true]);
    $token = $user->createToken('test')->plainTextToken;

    // Deactivate user after issuing token
    $user->update(['is_active' => false]);

    $response = $this->withHeader('Authorization', "Bearer $token")
        ->getJson('/api/staff/ping');

    $response->assertStatus(403)
        ->assertJson([
            'message' => 'Your account has been deactivated. Please contact the store owner.',
        ]);

    expect($user->tokens()->count())->toBe(0);
});
