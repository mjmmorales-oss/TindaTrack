<?php

namespace Database\Factories;

use App\Models\Setting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Setting>
 */
class SettingFactory extends Factory
{
    protected $model = Setting::class;

    public function definition(): array
    {
        return [
            'store_name' => 'Tindahan ni Aling Nena',
            'store_tagline' => 'Mura at Sariwa Araw-araw',
            'phone' => '0917-123-4567',
            'address' => 'Purok 3, Brgy. San Isidro',
            'receipt_header' => 'Tindahan ni Aling Nena',
            'receipt_footer' => 'Salamat po! Balik po kayo!',
            'default_reorder_level' => 10,
            'low_stock_threshold' => 5,
            'currency' => 'PHP',
            'timezone' => 'Asia/Manila',
        ];
    }
}
