<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class ReferenceDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Demo Users
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

        // 2. Settings (Singleton row)
        $settingsPath = database_path('data/settings.json');
        if (File::exists($settingsPath)) {
            $settingsData = json_decode(File::get($settingsPath), true);
            Setting::updateOrCreate(
                ['id' => 1],
                [
                    'store_name' => $settingsData['store_name'] ?? 'Tindahan ni Aling Nena',
                    'store_tagline' => 'Mura at Sariwa Araw-araw',
                    'phone' => $settingsData['contact_number'] ?? '0917-123-4567',
                    'address' => $settingsData['address'] ?? 'Purok 3, Brgy. San Isidro',
                    'receipt_header' => $settingsData['receipt_header'] ?? 'Tindahan ni Aling Nena',
                    'receipt_footer' => $settingsData['receipt_footer'] ?? 'Salamat po! Balik po kayo!',
                    'default_reorder_level' => $settingsData['default_reorder_level'] ?? 10,
                    'low_stock_threshold' => 5,
                    'currency' => 'PHP',
                    'timezone' => 'Asia/Manila',
                ]
            );
        }

        // 3. Categories
        $categoriesPath = database_path('data/categories.json');
        if (File::exists($categoriesPath)) {
            $categories = json_decode(File::get($categoriesPath), true);
            foreach ($categories as $cat) {
                Category::updateOrCreate(
                    ['name' => $cat['name']],
                    [
                        'id' => $cat['id'],
                        'code' => $cat['code'],
                        'description' => $cat['description'] ?? null,
                        'color' => $cat['color'] ?? '#0E7C66',
                        'icon' => $cat['icon'] ?? 'Package',
                    ]
                );
            }
        }

        // 4. Products
        $productsPath = database_path('data/products.json');
        if (File::exists($productsPath)) {
            $products = json_decode(File::get($productsPath), true);
            foreach ($products as $p) {
                $existing = Product::where('sku', $p['sku'])->first();
                Product::updateOrCreate(
                    ['sku' => $p['sku']],
                    [
                        'id' => $p['id'],
                        'category_id' => $p['category_id'],
                        'name' => $p['name'],
                        'barcode' => $p['barcode'] ?? null,
                        'unit' => $p['unit'] ?? 'pc',
                        'price' => $p['price'],
                        'cost_price' => $p['cost_price'],
                        'stock_quantity' => $existing ? $existing->stock_quantity : ($p['stock_quantity'] ?? 0),
                        'reorder_level' => $p['reorder_level'] ?? 10,
                        'is_active' => $p['is_active'] ?? true,
                        'description' => $p['description'] ?? null,
                    ]
                );
            }
        }

        // 5. Customers
        $customersPath = database_path('data/customers.json');
        if (File::exists($customersPath)) {
            $customers = json_decode(File::get($customersPath), true);
            foreach ($customers as $c) {
                $existing = Customer::where('contact_number', $c['contact_number'])->first();
                Customer::updateOrCreate(
                    ['contact_number' => $c['contact_number']],
                    [
                        'id' => $c['id'],
                        'name' => $c['name'],
                        'nickname' => $c['nickname'] ?? null,
                        'address' => $c['address'] ?? null,
                        'credit_limit' => $c['credit_limit'] ?? 500,
                        'credit_balance' => $existing ? $existing->credit_balance : 0,
                        'notes' => $c['notes'] ?? null,
                    ]
                );
            }
        }
    }
}
