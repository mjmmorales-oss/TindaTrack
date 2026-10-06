<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            ['name' => 'Nena Dela Cruz', 'email' => 'owner@tindatrack.test', 'role' => UserRole::Owner, 'is_active' => true],
            ['name' => 'Juan Dela Cruz', 'email' => 'cashier@tindatrack.test', 'role' => UserRole::Cashier, 'is_active' => true],
            ['name' => 'Bea Santos', 'email' => 'inactive@tindatrack.test', 'role' => UserRole::Cashier, 'is_active' => false],
        ];

        foreach ($users as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                $data + ['password' => Hash::make(env('DEMO_PASSWORD', 'password'))]
            );
        }
    }
}
