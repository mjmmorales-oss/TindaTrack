<?php

namespace App\Actions;

use App\Enums\StockMovementType;
use App\Enums\UserRole;
use App\Models\IntegrationOrder;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\StockStatus;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * System 2 (TindaTrack Inventory) business logic for an order received
 * from System 1 (TindaOrder Online Ordering System).
 *
 * 1. Idempotency  - an order_id that was already accepted is never processed twice.
 * 2. Locking      - products are locked (SELECT ... FOR UPDATE) so two orders
 *                   cannot oversell the same stock at the same time.
 * 3. All-or-nothing - if ANY item lacks stock, nothing is deducted (409 rejected).
 * 4. Audit trail  - every deduction writes a stock_movements row referencing the order_id.
 */
class ProcessIntegrationOrderAction
{
    /**
     * @param  array{order_id: string|int, customer_id: string|int, items: array<int, array{product_id: int, quantity: int}>}  $payload
     * @return array{http_status: int, body: array<string, mixed>}
     */
    public function execute(array $payload, string $sourceSystem = 'TindaOrder'): array
    {
        $orderId = (string) $payload['order_id'];
        $customerId = (string) $payload['customer_id'];

        // 1. Idempotent replay: same order_id already accepted -> return the original result.
        $existing = IntegrationOrder::where('order_id', $orderId)->first();
        if ($existing) {
            return $this->replay($existing);
        }

        $actor = $this->resolveActor();

        try {
            return DB::transaction(function () use ($payload, $orderId, $customerId, $sourceSystem, $actor) {
                $requested = collect($payload['items'])->map(fn ($i) => [
                    'product_id' => (int) $i['product_id'],
                    'quantity' => (int) $i['quantity'],
                ]);

                // 2. Lock the involved product rows for the duration of the transaction.
                $products = Product::whereIn('id', $requested->pluck('product_id'))
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                // 3. Check every line first (all-or-nothing).
                $lines = [];
                $shortages = 0;
                foreach ($requested as $item) {
                    $product = $products[$item['product_id']];
                    $enough = $item['quantity'] <= (int) $product->stock_quantity;
                    if (! $enough) {
                        $shortages++;
                    }
                    $lines[] = [
                        'product' => $product,
                        'quantity' => $item['quantity'],
                        'enough' => $enough,
                    ];
                }

                if ($shortages > 0) {
                    return [
                        'http_status' => 409,
                        'body' => [
                            'order_id' => $orderId,
                            'customer_id' => $customerId,
                            'status' => 'rejected',
                            'message' => "Order rejected. Insufficient stock for {$shortages} item(s). No stock was deducted.",
                            'items' => array_map(fn ($l) => [
                                'product_id' => $l['product']->id,
                                'product_name' => $l['product']->name,
                                'requested_quantity' => $l['quantity'],
                                'available_quantity' => (int) $l['product']->stock_quantity,
                                'stock_status' => $l['enough']
                                    ? StockStatus::for($l['product'])
                                    : StockStatus::INSUFFICIENT,
                            ], $lines),
                            'processed_at' => now()->toIso8601String(),
                        ],
                    ];
                }

                // 4. Deduct stock and write the audit trail.
                $items = [];
                $total = 0.0;
                foreach ($lines as $line) {
                    /** @var Product $product */
                    $product = $line['product'];
                    $qty = $line['quantity'];

                    $product->decrement('stock_quantity', $qty);
                    $product->refresh();

                    StockMovement::create([
                        'product_id' => $product->id,
                        'type' => StockMovementType::Sale,
                        'quantity' => -$qty,
                        'stock_after' => (int) $product->stock_quantity,
                        'reference' => $orderId,
                        'notes' => "Online order {$orderId} from {$sourceSystem} (customer {$customerId})",
                        'user_id' => $actor->id,
                    ]);

                    $unitPrice = (float) $product->price;
                    $subtotal = round($unitPrice * $qty, 2);
                    $total = round($total + $subtotal, 2);

                    $items[] = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'requested_quantity' => $qty,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                        'available_quantity' => (int) $product->stock_quantity,
                        'stock_status' => StockStatus::for($product),
                    ];
                }

                $body = [
                    'order_id' => $orderId,
                    'customer_id' => $customerId,
                    'status' => 'accepted',
                    'message' => 'Order accepted. Stock has been deducted from inventory.',
                    'items' => $items,
                    'total_amount' => $total,
                    'processed_at' => now()->toIso8601String(),
                ];

                // 5. Persist the order (unique order_id guards against duplicates).
                IntegrationOrder::create([
                    'order_id' => $orderId,
                    'customer_id' => $customerId,
                    'source_system' => $sourceSystem,
                    'status' => 'accepted',
                    'total_amount' => $total,
                    'items' => $items,
                    'response' => $body,
                ]);

                return ['http_status' => 201, 'body' => $body];
            });
        } catch (QueryException $e) {
            // Two identical requests arrived at the same instant: the unique index
            // rolled this one back (stock untouched). Return the stored result.
            $existing = IntegrationOrder::where('order_id', $orderId)->first();
            if ($existing) {
                return $this->replay($existing);
            }
            throw $e;
        }
    }

    /**
     * @return array{http_status: int, body: array<string, mixed>}
     */
    private function replay(IntegrationOrder $order): array
    {
        return [
            'http_status' => 200,
            'body' => array_merge($order->response, [
                'duplicate' => true,
                'message' => 'Duplicate request. This order_id was already processed; stock was NOT deducted again.',
            ]),
        ];
    }

    /**
     * Stock movements must be attributed to a user. Integration orders are
     * attributed to the first active store owner account.
     */
    private function resolveActor(): User
    {
        $owner = User::where('role', UserRole::Owner->value)
            ->where('is_active', true)
            ->orderBy('id')
            ->first();

        if (! $owner) {
            throw new RuntimeException('No active owner account found to attribute integration stock movements.');
        }

        return $owner;
    }
}
