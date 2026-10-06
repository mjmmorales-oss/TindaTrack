<?php

use App\Models\User;

test('users can authenticate and receive a token', function () {
    $user = User::factory()->create();

    $response = $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'user' => [
                'id',
                'name',
                'email',
                'role',
                'role_label',
                'is_active',
                'last_login_at',
                'created_at',
            ],
            'token',
        ]);

    expect($user->fresh()->last_login_at)->not->toBeNull();
});

test('users cannot authenticate with invalid password', function () {
    $user = User::factory()->create();

    $response = $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('inactive user cannot log in', function () {
    $user = User::factory()->inactive()->create();

    $response = $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);

    expect($response->json('errors.email.0'))
        ->toBe('This account has been deactivated. Please contact the store owner.');
});

test('logout revokes the token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer $token")
        ->postJson('/api/logout');

    $response->assertNoContent();

    expect($user->tokens()->count())->toBe(0);

    auth()->forgetGuards();

    // Verify revoked token can no longer access protected endpoints
    $protectedResponse = $this->withHeader('Authorization', "Bearer $token")
        ->getJson('/api/user');

    $protectedResponse->assertStatus(401);
});

test('authenticated user can fetch user details', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer $token")
        ->getJson('/api/user');

    $response->assertStatus(200)
        ->assertJson([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'is_active' => true,
        ]);
});
