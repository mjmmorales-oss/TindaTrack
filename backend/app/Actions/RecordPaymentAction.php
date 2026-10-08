<?php

namespace App\Actions;

use App\Models\Customer;
use App\Models\User;
use App\Models\UtangPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordPaymentAction
{
    /**
     * Records a debt payment, reducing the customer's balance inside a transaction.
     */
    public function execute(User $recorder, int $customerId, float $amount, ?string $paymentDate = null, ?string $notes = null): UtangPayment
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['Dapat mas mataas sa zero ang halaga ng ibabayad.'],
            ]);
        }

        return DB::transaction(function () use ($recorder, $customerId, $amount, $paymentDate, $notes) {
            /** @var Customer $customer */
            $customer = Customer::where('id', $customerId)->lockForUpdate()->firstOrFail();

            if ($amount > (float) $customer->credit_balance) {
                throw ValidationException::withMessages([
                    'amount' => [
                        sprintf(
                            'Hindi maaaring lumampas ang bayad (₱%0.2f) sa kasalukuyang utang (₱%0.2f).',
                            $amount,
                            $customer->credit_balance
                        ),
                    ],
                ]);
            }

            $newBalance = max(0.0, round((float) $customer->credit_balance - $amount, 2));
            $customer->forceFill(['credit_balance' => $newBalance])->save();

            $payment = UtangPayment::create([
                'customer_id' => $customer->id,
                'sale_id' => null,
                'amount' => round($amount, 2),
                'payment_date' => $paymentDate ?? now(),
                'notes' => $notes,
                'recorded_by' => $recorder->id,
            ]);

            return $payment->load(['customer', 'recorder']);
        });
    }
}
