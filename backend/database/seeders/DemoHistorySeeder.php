<?php

namespace Database\Seeders;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use App\Enums\StockMovementType;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleCounter;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\UtangPayment;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Only run when sales table is empty
        if (Sale::count() > 0) {
            return;
        }

        // Seed RNG for deterministic, repeatable demo generation
        mt_srand(20261007);

        $days = (int) env('DEMO_HISTORY_DAYS', 60);
        $baseDate = Carbon::parse(env('DEMO_BASE_DATE', '2026-10-07 18:00:00'));

        $products = Product::all();
        $customers = Customer::all();

        if ($products->isEmpty() || $customers->isEmpty()) {
            return;
        }

        $voidReasons = [
            'Maling item ang napindot ng kahera',
            'Ibinalik ng kustomer (palit item)',
            'Kulang ang dalang pambayad ng bumibili',
            'Dobleng na-punch sa POS',
        ];

        // Track customer debt ledgers for exact balance reconciliation
        // customerId => balance
        $customerLedgers = [];
        $lastPaymentDay = [];
        foreach ($customers as $c) {
            $customerLedgers[$c->id] = 0.00;
            $lastPaymentDay[$c->id] = -1;
        }

        // Active debtor IDs matching mock: [1, 3, 5, 6, 8, 9, 11]
        $recentDebtorIds = [1, 3, 5, 6, 11];

        // Track running stock per product
        $runningStock = [];
        $startDate = $baseDate->copy()->subDays($days)->setTime(6, 0, 0);

        // Record opening stock for each product as the initial movement
        foreach ($products as $p) {
            // Give adequate initial stock buffer for 60-day sales volume
            $openingStock = max(100, (int) $p->stock_quantity + 120);
            $runningStock[$p->id] = $openingStock;

            StockMovement::create([
                'product_id' => $p->id,
                'type' => StockMovementType::Restock,
                'quantity' => $openingStock,
                'stock_after' => $openingStock,
                'reference' => 'INIT-'.$p->sku,
                'notes' => 'Opening inventory balance',
                'user_id' => 1,
                'created_at' => $startDate,
                'updated_at' => $startDate,
            ]);
        }

        DB::beginTransaction();

        try {
            for ($dayOffset = $days - 1; $dayOffset >= 0; $dayOffset--) {
                $curDate = $baseDate->copy()->subDays($dayOffset);
                $datePrefix = $curDate->format('Ymd');
                $isWeekend = $curDate->isWeekend();

                // 18–33 on weekdays, +20% on weekends -> 22–40
                $dailySalesCount = mt_rand(18, 33);
                if ($isWeekend) {
                    $dailySalesCount = (int) round($dailySalesCount * 1.2);
                }

                $dailySaleSeq = 1;

                // Occasional bulk restocks for running-low items
                if ($dayOffset % 5 === 0) {
                    foreach ($products as $p) {
                        if ($runningStock[$p->id] < 35) {
                            $restockQty = max(30, (int) $p->reorder_level * 3);
                            $runningStock[$p->id] += $restockQty;

                            StockMovement::create([
                                'product_id' => $p->id,
                                'type' => StockMovementType::Restock,
                                'quantity' => $restockQty,
                                'stock_after' => $runningStock[$p->id],
                                'reference' => 'PO-'.$datePrefix,
                                'notes' => 'Supplier delivery replenishment',
                                'user_id' => 1,
                                'created_at' => $curDate->copy()->setTime(7, 30, 0),
                                'updated_at' => $curDate->copy()->setTime(7, 30, 0),
                            ]);
                        }
                    }
                }

                for ($s = 0; $s < $dailySalesCount; $s++) {
                    // Peak hour distribution
                    $peakType = mt_rand(1, 10);
                    if ($peakType <= 3) {
                        $hour = mt_rand(6, 8); // morning rush
                    } elseif ($peakType <= 6) {
                        $hour = mt_rand(11, 13); // lunch
                    } elseif ($peakType <= 9) {
                        $hour = mt_rand(17, 20); // evening peak
                    } else {
                        $hour = mt_rand(9, 16); // regular day
                    }

                    $minute = mt_rand(0, 59);
                    $second = mt_rand(0, 59);
                    $saleTime = $curDate->copy()->setTime($hour, $minute, $second);

                    $saleNo = sprintf('TT-%s-%04d', $datePrefix, $dailySaleSeq++);

                    // Cashier distribution: Juan Dela Cruz (id 2) ~75%, Nena Dela Cruz (id 1) ~25%
                    $cashierId = (mt_rand(1, 100) <= 75) ? 2 : 1;

                    // Items selection
                    $itemCount = mt_rand(1, 4);
                    $itemsData = [];
                    $saleTotal = 0.0;
                    $pickedProductIds = [];

                    for ($i = 0; $i < $itemCount; $i++) {
                        // Weighted toward top popular products (indices 0..20)
                        $pIndex = mt_rand(0, min(25, $products->count() - 1));
                        $prod = $products[$pIndex];

                        if (in_array($prod->id, $pickedProductIds, true)) {
                            continue;
                        }
                        $pickedProductIds[] = $prod->id;

                        $qty = mt_rand(1, 3);

                        // Ensure sufficient stock
                        if ($runningStock[$prod->id] < $qty) {
                            $replenish = 40;
                            $runningStock[$prod->id] += $replenish;
                            StockMovement::create([
                                'product_id' => $prod->id,
                                'type' => StockMovementType::Restock,
                                'quantity' => $replenish,
                                'stock_after' => $runningStock[$prod->id],
                                'reference' => 'PO-'.$datePrefix,
                                'notes' => 'Emergency restock',
                                'user_id' => 1,
                                'created_at' => $saleTime->copy()->subMinutes(5),
                                'updated_at' => $saleTime->copy()->subMinutes(5),
                            ]);
                        }

                        $subtotal = round((float) $prod->price * $qty, 2);
                        $saleTotal = round($saleTotal + $subtotal, 2);

                        $itemsData[] = [
                            'product' => $prod,
                            'quantity' => $qty,
                            'unit_price' => (float) $prod->price,
                            'unit_cost' => (float) $prod->cost_price,
                            'subtotal' => $subtotal,
                        ];
                    }

                    if (empty($itemsData)) {
                        continue;
                    }

                    // ~2% voided
                    $isVoided = (mt_rand(1, 100) <= 2);
                    // ~12% utang (only if not voided)
                    $isUtang = (! $isVoided && mt_rand(1, 100) <= 12);

                    $paymentType = PaymentType::Cash;
                    $customerId = null;
                    $amountPaid = $saleTotal;
                    $changeAmount = 0.0;
                    $status = $isVoided ? SaleStatus::Voided : SaleStatus::Completed;
                    $voidReason = null;
                    $voidedBy = null;
                    $voidedAt = null;

                    if ($isVoided) {
                        $voidReason = $voidReasons[array_rand($voidReasons)];
                        $voidedBy = 1; // Owner
                        $voidedAt = $saleTime->copy()->addMinutes(mt_rand(5, 25));
                    } elseif ($isUtang) {
                        $paymentType = PaymentType::Utang;
                        $eligibleDebtors = ($dayOffset >= 33) ? array_merge([8, 9], $recentDebtorIds) : $recentDebtorIds;
                        $customerId = $eligibleDebtors[array_rand($eligibleDebtors)];

                        // Target Cora (id 5) for higher credit balance
                        if ($customerId !== 5 && $customerLedgers[$customerId] > 1200) {
                            $customerId = 5;
                        }

                        $amountPaid = 0.0;
                        $changeAmount = 0.0;
                        $customerLedgers[$customerId] = round($customerLedgers[$customerId] + $saleTotal, 2);
                    } else {
                        // Cash payment
                        if (mt_rand(1, 100) <= 40) {
                            $amountPaid = $saleTotal;
                            $changeAmount = 0.0;
                        } else {
                            $quickBills = [20, 50, 100, 200, 500, 1000];
                            $tendered = $saleTotal + 50;
                            foreach ($quickBills as $b) {
                                if ($b >= $saleTotal) {
                                    $tendered = $b;
                                    break;
                                }
                            }
                            $amountPaid = (float) $tendered;
                            $changeAmount = round($amountPaid - $saleTotal, 2);
                        }
                    }

                    $sale = Sale::create([
                        'sale_no' => $saleNo,
                        'user_id' => $cashierId,
                        'customer_id' => $customerId,
                        'total_amount' => $saleTotal,
                        'payment_type' => $paymentType,
                        'amount_paid' => $amountPaid,
                        'change_amount' => $changeAmount,
                        'status' => $status,
                        'void_reason' => $voidReason,
                        'voided_by' => $voidedBy,
                        'voided_at' => $voidedAt,
                        'notes' => null,
                        'created_at' => $saleTime,
                        'updated_at' => $voidedAt ?? $saleTime,
                    ]);

                    foreach ($itemsData as $it) {
                        SaleItem::create([
                            'sale_id' => $sale->id,
                            'product_id' => $it['product']->id,
                            'product_name' => $it['product']->name,
                            'quantity' => $it['quantity'],
                            'unit_price' => $it['unit_price'],
                            'unit_cost' => $it['unit_cost'],
                            'subtotal' => $it['subtotal'],
                            'created_at' => $saleTime,
                            'updated_at' => $saleTime,
                        ]);

                        // Stock movement for the sale
                        $runningStock[$it['product']->id] -= $it['quantity'];

                        StockMovement::create([
                            'product_id' => $it['product']->id,
                            'type' => StockMovementType::Sale,
                            'quantity' => -$it['quantity'],
                            'stock_after' => $runningStock[$it['product']->id],
                            'reference' => $saleNo,
                            'notes' => "POS sale {$saleNo}",
                            'user_id' => $cashierId,
                            'created_at' => $saleTime,
                            'updated_at' => $saleTime,
                        ]);

                        // Stock movement if voided
                        if ($isVoided) {
                            $runningStock[$it['product']->id] += $it['quantity'];

                            StockMovement::create([
                                'product_id' => $it['product']->id,
                                'type' => StockMovementType::Void,
                                'quantity' => $it['quantity'],
                                'stock_after' => $runningStock[$it['product']->id],
                                'reference' => $saleNo,
                                'notes' => "Voided sale: {$voidReason}",
                                'user_id' => 1,
                                'created_at' => $voidedAt,
                                'updated_at' => $voidedAt,
                            ]);
                        }
                    }
                }

                // Customer debt repayments
                foreach ($recentDebtorIds as $cId) {
                    if ($customerLedgers[$cId] > 100) {
                        $daysSincePay = ($lastPaymentDay[$cId] === -1) ? 99 : ($lastPaymentDay[$cId] - $dayOffset);
                        if ($daysSincePay >= mt_rand(3, 7)) {
                            $minResidual = ($cId === 5) ? 2150.00 : 50.00;
                            $maxPayable = max(0, $customerLedgers[$cId] - $minResidual);
                            if ($maxPayable >= 50) {
                                $payAmount = round(min($maxPayable, mt_rand(1, 3) * 100.0), 2);
                                if ($payAmount > 0) {
                                    $customerLedgers[$cId] = round($customerLedgers[$cId] - $payAmount, 2);
                                    $lastPaymentDay[$cId] = $dayOffset;

                                    $payTime = $curDate->copy()->setTime(mt_rand(10, 16), mt_rand(0, 59), 0);
                                    UtangPayment::create([
                                        'customer_id' => $cId,
                                        'sale_id' => null,
                                        'amount' => $payAmount,
                                        'payment_date' => $payTime,
                                        'notes' => 'Partial payment sa tindahan',
                                        'recorded_by' => 1,
                                        'created_at' => $payTime,
                                        'updated_at' => $payTime,
                                    ]);
                                }
                            }
                        }
                    }
                }

                // Register the day's last sequence in sale_counters
                SaleCounter::updateOrCreate(
                    ['date' => $curDate->format('Y-m-d')],
                    ['last_number' => $dailySaleSeq - 1]
                );
            }

            // Sync final stock quantities back to products table
            foreach ($products as $p) {
                $p->update(['stock_quantity' => max(0, $runningStock[$p->id])]);
            }

            // Sync final credit balances back to customers table
            foreach ($customers as $c) {
                $c->update(['credit_balance' => max(0, round($customerLedgers[$c->id], 2))]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
