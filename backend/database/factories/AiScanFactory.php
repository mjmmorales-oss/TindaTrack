<?php

namespace Database\Factories;

use App\Models\AiScan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiScan>
 */
class AiScanFactory extends Factory
{
    protected $model = AiScan::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'scanner_session_id' => null,
            'type' => 'basket',
            'provider' => 'mock',
            'model' => 'mock-vision-v2',
            'prompt_version' => 'basket-v1',
            'image_sha256' => hash('sha256', fake()->uuid()),
            'image_id' => null,
            'latency_ms' => fake()->numberBetween(50, 450),
            'status' => 'ok',
            'error_code' => null,
            'raw_response' => ['mock' => true],
            'result' => [
                'items' => [],
                'unmatched' => [],
            ],
            'catalog_size' => 10,
            'catalog_truncated' => false,
        ];
    }
}
