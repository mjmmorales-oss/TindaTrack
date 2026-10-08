<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'nickname' => fake()->firstName(),
            'contact_number' => '09'.fake()->numerify('#########'),
            'address' => fake()->address(),
            'credit_limit' => fake()->randomElement([500.0, 1000.0, 1500.0]),
            'credit_balance' => 0.0,
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
