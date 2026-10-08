<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $cost = fake()->randomFloat(2, 5, 100);
        $price = round($cost * 1.25, 2);

        return [
            'category_id' => Category::factory(),
            'name' => fake()->words(3, true),
            'sku' => 'SKU-'.strtoupper(fake()->unique()->bothify('??-####')),
            'barcode' => fake()->unique()->ean13(),
            'unit' => 'pc',
            'price' => $price,
            'cost_price' => $cost,
            'stock_quantity' => fake()->numberBetween(10, 100),
            'reorder_level' => 10,
            'is_active' => true,
            'description' => fake()->sentence(),
        ];
    }
}
