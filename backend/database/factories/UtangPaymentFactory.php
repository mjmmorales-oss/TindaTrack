<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\User;
use App\Models\UtangPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UtangPayment>
 */
class UtangPaymentFactory extends Factory
{
    protected $model = UtangPayment::class;

    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'sale_id' => null,
            'amount' => fake()->randomFloat(2, 20, 200),
            'payment_date' => now(),
            'notes' => fake()->optional()->sentence(),
            'recorded_by' => User::factory(),
        ];
    }
}
