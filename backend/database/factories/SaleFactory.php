<?php

namespace Database\Factories;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sale>
 */
class SaleFactory extends Factory
{
    protected $model = Sale::class;

    public function definition(): array
    {
        $total = fake()->randomFloat(2, 20, 500);

        return [
            'sale_no' => 'TT-'.now()->format('Ymd').'-'.fake()->unique()->numerify('####'),
            'user_id' => User::factory(),
            'customer_id' => null,
            'total_amount' => $total,
            'payment_type' => PaymentType::Cash,
            'amount_paid' => $total,
            'change_amount' => 0.0,
            'status' => SaleStatus::Completed,
            'notes' => null,
        ];
    }

    public function utang(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_type' => PaymentType::Utang,
            'customer_id' => Customer::factory(),
            'amount_paid' => 0.0,
            'change_amount' => 0.0,
        ]);
    }
}
