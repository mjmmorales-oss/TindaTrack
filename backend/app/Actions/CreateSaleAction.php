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
                'items' => ['Cart is empty. Select at least one product.'],
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
            // The same product on two lines must not oversell: check the running total per product
            $requestedQty = [];

            foreach ($cartItems as $index => $item) {
                $prodId = $item['product_id'] ?? null;
                $qty = (int) ($item['quantity'] ?? 0);

                if (! $prodId || ! isset($products[$prodId])) {
                    $stockErrors["items.{$index}.product_id"] = ['Product not found in inventory.'];

                    continue;
                }

                $prod = $products[$prodId];

                if (! $prod->is_active) {
                    $stockErrors["items.{$index}.product_id"] = ["Product '{$prod->name}' is inactive."];

                    continue;
                }

                if ($qty <= 0) {
                    $stockErrors["items.{$index}.quantity"] = ['Valid product quantity is required.'];

                    continue;
                }

                $requestedQty[$prodId] = ($requestedQty[$prodId] ?? 0) + $qty;
                if ($requestedQty[$prodId] > $prod->stock_quantity) {
                    $stockErrors["items.{$index}.quantity"] = [
                        "Insufficient stock for '{$prod->name}'. Current stock: {$prod->stock_quantity}.",
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
                    'add_method' => $item['add_method'] ?? 'tap',
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
                            "Insufficient payment. Total amount: ₱{$totalAmount}, paid: ₱{$amountPaid}.",
                        ],
                    ]);
                }
                $changeAmount = round($amountPaid - $totalAmount, 2);
            } elseif ($paymentType === PaymentType::Utang) {
                if (! $customerId) {
                    throw ValidationException::withMessages([
                        'customer_id' => ['A customer must be selected for credit (utang) sales.'],
                    ]);
                }

                $customer = Customer::where('id', $customerId)->lockForUpdate()->first();
                if (! $customer) {
                    throw ValidationException::withMessages([
                        'customer_id' => ['Customer not found.'],
                    ]);
                }

                if ($amountPaid > $totalAmount) {
                    throw ValidationException::withMessages([
                        'amount_paid' => [
                            "The amount paid now (₱{$amountPaid}) can't be more than the total (₱{$totalAmount}). Use a cash sale instead.",
                        ],
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
                                    'This sale exceeds the credit limit (₱%s) for %s. Current balance: ₱%s, New balance: ₱%s.',
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
                'cart_started_at' => $payment['cart_started_at'] ?? null,
                'cart_duration_ms' => $payment['cart_duration_ms'] ?? null,
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
                    'add_method' => $itemData['add_method'],
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
