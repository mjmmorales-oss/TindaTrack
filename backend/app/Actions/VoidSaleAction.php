<?php

namespace App\Actions;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Enums\StockMovementType;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VoidSaleAction
{
    /**
     * Voids a sale, restores inventory, and reverses customer utang if applicable.
     */
    public function execute(User $user, int $saleId, string $reason): Sale
    {
        if (! $user->isOwner()) {
            throw new AuthorizationException('Tanging may-ari (owner) lamang ang may pahintulot mag-void ng resibo.');
        }

        $trimmedReason = trim($reason);
        if (mb_strlen($trimmedReason) < 5) {
            throw ValidationException::withMessages([
                'reason' => ['Kinakailangan ng dahilan sa pag-void na may hindi bababa sa 5 karakter.'],
            ]);
        }

        return DB::transaction(function () use ($user, $saleId, $trimmedReason) {
            /** @var Sale $sale */
            $sale = Sale::where('id', $saleId)->lockForUpdate()->firstOrFail();

            if ($sale->status === SaleStatus::Voided) {
                throw ValidationException::withMessages([
                    'sale' => ['Kanselado na (voided) ang benta na ito.'],
                ]);
            }

            // 1. Restore stock and log void movements
            foreach ($sale->items as $item) {
                /** @var Product $prod */
                $prod = Product::where('id', $item->product_id)->lockForUpdate()->first();
                if ($prod) {
                    $prod->increment('stock_quantity', $item->quantity);
                    $newStock = $prod->stock_quantity;

                    StockMovement::create([
                        'product_id' => $prod->id,
                        'type' => StockMovementType::Void,
                        'quantity' => $item->quantity,
                        'stock_after' => $newStock,
                        'reference' => $sale->sale_no,
                        'notes' => "Voided sale: {$trimmedReason}",
                        'user_id' => $user->id,
                    ]);
                }
            }

            // 2. Reverse customer utang balance if applicable
            if ($sale->payment_type === PaymentType::Utang && $sale->customer_id) {
                $customer = Customer::where('id', $sale->customer_id)->lockForUpdate()->first();
                if ($customer) {
                    $netDebt = round($sale->total_amount - $sale->amount_paid, 2);
                    $newBalance = max(0.0, round((float) $customer->credit_balance - $netDebt, 2));
                    $customer->forceFill(['credit_balance' => $newBalance])->save();
                }
            }

            // 3. Update sale status
            $sale->update([
                'status' => SaleStatus::Voided,
                'void_reason' => $trimmedReason,
                'voided_by' => $user->id,
                'voided_at' => now(),
            ]);

            return $sale->load(['items.product', 'customer', 'cashier']);
        });
    }
}
