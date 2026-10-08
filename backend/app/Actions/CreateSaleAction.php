<?php

namespace App\Actions;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Enums\StockMovementType;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleCounter;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateSaleAction
{
    /**
     * Executes the sale creation within a database transaction.
     *
     * @param  array  $cartItems  array of ['product_id' => int, 'quantity' => int]
     * @param  array  $payment  ['payment_type' => 'cash'|'utang', 'amount_paid' => float, 'customer_id' => ?int, 'override_limit' => ?bool, 'notes' => ?string]
     */
    public function execute(User $cashier, array $cartItems, array $payment): Sale
    {
        if (empty($cartItems)) {
            throw ValidationException::withMessages([
                'items' => ['Walang laman ang cart. Pumili ng kahit isang produkto.'],
            ]);
        }

        return DB::transaction(function () use ($cashier, $cartItems, $payment) {
            $paymentType = PaymentType::tryFrom($payment['payment_type'] ?? 'cash') ?? PaymentType::Cash;
            $customerId = $payment['customer_id'] ?? null;
            $overrideLimit = (bool) ($payment['override_limit'] ?? false);
            $notes = $payment['notes'] ?? null;

            // 1. Lock and validate involved products
            $productIds = collect($cartItems)->pluck('product_id')->unique()->all();
            $products = Product::whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

            $itemsToCreate = [];
            $totalAmount = 0.0;
            $stockErrors = [];

            foreach ($cartItems as $index => $item) {
                $prodId = $item['product_id'] ?? null;
                $qty = (int) ($item['quantity'] ?? 0);

                if (! $prodId || ! isset($products[$prodId])) {
                    $stockErrors["items.{$index}.product_id"] = ['Hindi mahanap ang produkto sa imbentaryo.'];

                    continue;
                }

                $prod = $products[$prodId];

                if (! $prod->is_active) {
                    $stockErrors["items.{$index}.product_id"] = ["Hindi na aktibo ang produktong '{$prod->name}'."];

                    continue;
                }

                if ($qty <= 0) {
                    $stockErrors["items.{$index}.quantity"] = ['Kailangan ng wastong bilang ng produkto.'];

                    continue;
                }

                if ($qty > $prod->stock_quantity) {
                    $stockErrors["items.{$index}.quantity"] = [
                        "Kulang ang stock para sa '{$prod->name}'. Kasalukuyang stock: {$prod->stock_quantity}.",
                    ];

                    continue;
                }

                $unitPrice = (float) $prod->price;
                $unitCost = (float) $prod->cost_price;
                $subtotal = round($unitPrice * $qty, 2);
                $totalAmount = round($totalAmount + $subtotal, 2);

                $itemsToCreate[] = [
                    'product' => $prod,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'unit_cost' => $unitCost,
                    'subtotal' => $subtotal,
                ];
            }

            if (! empty($stockErrors)) {
                throw ValidationException::withMessages($stockErrors);
            }

            // 2. Validate Payment
            $amountPaid = isset($payment['amount_paid']) ? (float) $payment['amount_paid'] : 0.0;
            $changeAmount = 0.0;
            $customer = null;

            if ($paymentType === PaymentType::Cash) {
                if ($amountPaid < $totalAmount) {
                    throw ValidationException::withMessages([
                        'amount_paid' => [
                            "Kulang ang bayad. Kabuuang halaga: ₱{$totalAmount}, binayad: ₱{$amountPaid}.",
                        ],
                    ]);
                }
                $changeAmount = round($amountPaid - $totalAmount, 2);
            } elseif ($paymentType === PaymentType::Utang) {
                if (! $customerId) {
                    throw ValidationException::withMessages([
                        'customer_id' => ['Kailangang pumili ng kustomer (suki) para sa utang.'],
                    ]);
                }

                $customer = Customer::where('id', $customerId)->lockForUpdate()->first();
                if (! $customer) {
                    throw ValidationException::withMessages([
                        'customer_id' => ['Hindi mahanap ang kustomer.'],
                    ]);
                }

                $netNewDebt = round($totalAmount - $amountPaid, 2);
                $projectedBalance = round((float) $customer->credit_balance + $netNewDebt, 2);

                // Credit limit check
                if ($projectedBalance > (float) $customer->credit_limit) {
                    // Cashiers cannot override credit limit. Owners may override with flag.
                    if ($cashier->hasRole('cashier') || ! $overrideLimit) {
                        throw ValidationException::withMessages([
                            'credit_limit' => [
                                sprintf(
                                    'Lalampas sa credit limit (₱%s) ni %s ang utang na ito. Kasalukuyang utang: ₱%s, Bagong balanse: ₱%s.',
                                    number_format($customer->credit_limit, 2),
                                    $customer->name,
                                    number_format($customer->credit_balance, 2),
                                    number_format($projectedBalance, 2)
                                ),
                            ],
                        ]);
                    }
                }

                // Increment customer balance
                $customer->forceFill(['credit_balance' => $projectedBalance])->save();
            }

            // 3. Generate sequential sale number TT-YYYYMMDD-#### using locked sale_counters
            $todayDate = Carbon::now('Asia/Manila')->format('Y-m-d');
            $datePrefix = Carbon::now('Asia/Manila')->format('Ymd');

            $counter = SaleCounter::where('date', $todayDate)->lockForUpdate()->first();
            if (! $counter) {
                $counter = SaleCounter::create(['date' => $todayDate, 'last_number' => 0]);
            }
            $counter->increment('last_number');
            $saleNo = sprintf('TT-%s-%04d', $datePrefix, $counter->last_number);

            // 4. Create Sale
            $sale = Sale::create([
                'sale_no' => $saleNo,
                'user_id' => $cashier->id,
                'customer_id' => $customerId,
                'total_amount' => $totalAmount,
                'payment_type' => $paymentType,
                'amount_paid' => $amountPaid,
                'change_amount' => $changeAmount,
                'status' => SaleStatus::Completed,
                'notes' => $notes,
            ]);

            // 5. Decrement stock, create items and stock movements
            foreach ($itemsToCreate as $itemData) {
                /** @var Product $prod */
                $prod = $itemData['product'];
                $qty = $itemData['quantity'];

                $prod->decrement('stock_quantity', $qty);
                $newStock = $prod->stock_quantity;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $prod->id,
                    'product_name' => $prod->name,
                    'quantity' => $qty,
                    'unit_price' => $itemData['unit_price'],
                    'unit_cost' => $itemData['unit_cost'],
                    'subtotal' => $itemData['subtotal'],
                ]);

                StockMovement::create([
                    'product_id' => $prod->id,
                    'type' => StockMovementType::Sale,
                    'quantity' => -$qty,
                    'stock_after' => $newStock,
                    'reference' => $saleNo,
                    'notes' => "POS sale {$saleNo}",
                    'user_id' => $cashier->id,
                ]);
            }

            return $sale->load(['items.product', 'customer', 'cashier']);
        });
    }
}
