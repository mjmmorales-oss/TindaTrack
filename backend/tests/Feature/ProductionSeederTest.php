<?php

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    // Clear users before testing production seeder logic
    User::query()->delete();
});

test('production seeder creates users when environment variables are set', function () {
    // Mock production environment
    app()->detectEnvironment(fn () => 'production');

    config([
        'app.demo_owner_password' => 'SuperSecretOwner123!',
        'app.demo_cashier_password' => 'SuperSecretCashier456!',
        'app.demo_owner_email' => 'custom-owner@store.com',
        'app.demo_cashier_email' => 'custom-cashier@store.com',
    ]);

    $this->artisan('db:seed', ['--class' => ReferenceDataSeeder::class, '--force' => true]);

    $owner = User::where('email', 'custom-owner@store.com')->first();
    $cashier = User::where('email', 'custom-cashier@store.com')->first();

    expect($owner)->not->toBeNull()
        ->and($owner->role)->toBe(UserRole::Owner)
        ->and(Hash::check('SuperSecretOwner123!', $owner->password))->toBeTrue()
        ->and(Hash::check('password', $owner->password))->toBeFalse()
        ->and($cashier)->not->toBeNull()
        ->and($cashier->role)->toBe(UserRole::Cashier)
        ->and(Hash::check('SuperSecretCashier456!', $cashier->password))->toBeTrue()
        ->and(Hash::check('password', $cashier->password))->toBeFalse();
});

test('production seeder skips user creation when passwords are not set', function () {
    // Mock production environment
    app()->detectEnvironment(fn () => 'production');

    config([
        'app.demo_owner_password' => null,
        'app.demo_cashier_password' => null,
    ]);

    $this->artisan('db:seed', ['--class' => ReferenceDataSeeder::class, '--force' => true]);

    expect(User::count())->toBe(0);
});

test('production seeder is idempotent and preserves changed passwords unless DEMO_RESET_PASSWORDS is true', function () {
    app()->detectEnvironment(fn () => 'production');

    config([
        'app.demo_owner_password' => 'InitialPassword123!',
        'app.demo_cashier_password' => 'InitialCashier123!',
        'app.demo_owner_email' => 'idempotent@store.com',
        'app.demo_cashier_email' => 'idempotent-cashier@store.com',
        'app.demo_reset_passwords' => false,
    ]);

    $this->artisan('db:seed', ['--class' => ReferenceDataSeeder::class, '--force' => true]);

    $owner = User::where('email', 'idempotent@store.com')->first();
    expect($owner)->not->toBeNull();

    // User updates password to something else
    $owner->password = Hash::make('UserManuallyChangedPassword999!');
    $owner->save();

    // Re-run seeder with reset passwords = false
    $this->artisan('db:seed', ['--class' => ReferenceDataSeeder::class, '--force' => true]);

    $owner->refresh();
    expect(Hash::check('UserManuallyChangedPassword999!', $owner->password))->toBeTrue()
        ->and(Hash::check('InitialPassword123!', $owner->password))->toBeFalse();

    // Re-run seeder with reset passwords = true
    config(['app.demo_reset_passwords' => true]);
    $this->artisan('db:seed', ['--class' => ReferenceDataSeeder::class, '--force' => true]);

    $owner->refresh();
    expect(Hash::check('InitialPassword123!', $owner->password))->toBeTrue();
});
