<?php

namespace Database\Factories;

use App\Models\AiScan;
use App\Models\AiScanFeedback;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiScanFeedback>
 */
class AiScanFeedbackFactory extends Factory
{
    protected $model = AiScanFeedback::class;

    public function definition(): array
    {
        return [
            'ai_scan_id' => AiScan::factory(),
            'line_type' => 'item',
            'suggested_product_id' => Product::factory(),
            'suggested_quantity' => 1,
            'confidence' => 0.95,
            'final_product_id' => null,
            'final_quantity' => 1,
            'action' => 'accepted',
        ];
    }
}
