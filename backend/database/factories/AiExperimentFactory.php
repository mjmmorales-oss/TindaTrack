<?php

namespace Database\Factories;

use App\Models\AiExperiment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiExperiment>
 */
class AiExperimentFactory extends Factory
{
    protected $model = AiExperiment::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => 'Basket Benchmark Trial #'.fake()->numberBetween(1, 100),
            'type' => 'basket',
            'notes' => 'Ground truth experiment trial.',
        ];
    }
}
