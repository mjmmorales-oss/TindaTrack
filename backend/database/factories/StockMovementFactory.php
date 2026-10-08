<?php

namespace Database\Factories;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockMovement>
 */
class StockMovementFactory extends Factory
{
    protected $model = StockMovement::class;

    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'type' => StockMovementType::Restock,
            'quantity' => fake()->numberBetween(5, 50),
            'stock_after' => fake()->numberBetween(10, 100),
            'reference' => 'PO-'.fake()->numerify('####'),
            'notes' => fake()->optional()->sentence(),
            'user_id' => User::factory(),
        ];
    }
}
