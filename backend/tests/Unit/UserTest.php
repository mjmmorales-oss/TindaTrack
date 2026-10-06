<?php

use App\Enums\UserRole;
use App\Models\User;

test('user hasRole checks role values', function () {
    $user = new User(['role' => UserRole::Owner]);
    expect($user->hasRole('owner'))->toBeTrue()
        ->and($user->hasRole('cashier'))->toBeFalse()
        ->and($user->hasRole('cashier', 'owner'))->toBeTrue();
});

test('user isOwner returns true for owner only', function () {
    $owner = new User(['role' => UserRole::Owner]);
    $cashier = new User(['role' => UserRole::Cashier]);

    expect($owner->isOwner())->toBeTrue()
        ->and($cashier->isOwner())->toBeFalse();
});

test('user role enum provides labels', function () {
    expect(UserRole::Owner->label())->toBe('Store Owner')
        ->and(UserRole::Cashier->label())->toBe('Cashier');
});
