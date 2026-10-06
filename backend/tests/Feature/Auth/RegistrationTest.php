<?php

use App\Enums\UserRole;

test('new users can register as owner and receive a token', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertStatus(201)
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
        ])
        ->assertJsonPath('user.role', UserRole::Owner->value)
        ->assertJsonPath('user.role_label', 'Store Owner')
        ->assertJsonPath('user.is_active', true);

    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com',
        'role' => UserRole::Owner->value,
        'is_active' => true,
    ]);
});
