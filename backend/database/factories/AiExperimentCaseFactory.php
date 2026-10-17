<?php

namespace Database\Factories;

use App\Models\AiExperiment;
use App\Models\AiExperimentCase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiExperimentCase>
 */
class AiExperimentCaseFactory extends Factory
{
    protected $model = AiExperimentCase::class;

    public function definition(): array
    {
        return [
            'ai_experiment_id' => AiExperiment::factory(),
            'case_number' => 1,
            'image_id' => null,
            'ground_truth' => [
                ['product_id' => 1, 'quantity' => 2],
            ],
            'predicted' => [
                ['product_id' => 1, 'quantity' => 2],
            ],
            'is_correct' => true,
            'latency_ms' => 150,
            'metrics' => [
                'precision' => 1.0,
                'recall' => 1.0,
                'mae' => 0.0,
            ],
        ];
    }
}
