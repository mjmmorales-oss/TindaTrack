<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductEmbedding;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductEmbedding>
 */
class ProductEmbeddingFactory extends Factory
{
    protected $model = ProductEmbedding::class;

    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'model' => 'Xenova/clip-vit-base-patch32',
            'source' => 'product_image',
            'vector' => array_map(fn () => fake()->randomFloat(4, -1, 1), range(1, 128)),
            'image_sha256' => hash('sha256', fake()->uuid()),
        ];
    }
}
