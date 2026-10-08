<?php

namespace App\Actions;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdjustStockAction
{
    /**
     * Adjusts the stock quantity of a single product inside a transaction.
     */
    public function execute(User $user, int $productId, string $type, int $quantity, ?string $notes = null): Product
    {
        if ($quantity == 0) {
            throw ValidationException::withMessages([
                'quantity' => ['Hindi maaaring maging zero ang bilang ng pagsasaayos.'],
            ]);
        }

        return DB::transaction(function () use ($user, $productId, $type, $quantity, $notes) {
            /** @var Product $product */
            $product = Product::where('id', $productId)->lockForUpdate()->firstOrFail();

            // Calculate stock delta
            $delta = $quantity;
            $movementType = StockMovementType::Correction;

            if ($type === 'damage' || $type === 'correction_minus') {
                $delta = -abs($quantity);
                $movementType = ($type === 'damage') ? StockMovementType::Damage : StockMovementType::Correction;
            } elseif ($type === 'restock' || $type === 'correction_plus') {
                $delta = abs($quantity);
                $movementType = ($type === 'restock') ? StockMovementType::Restock : StockMovementType::Correction;
            } elseif ($type === 'correction') {
                $delta = $quantity;
                $movementType = StockMovementType::Correction;
            }

            $newStock = (int) $product->stock_quantity + $delta;

            if ($newStock < 0) {
                throw ValidationException::withMessages([
                    'quantity' => [
                        sprintf(
                            'Hindi maaaring maging negatibo ang stock. Kasalukuyang stock: %d, Bawas: %d.',
                            $product->stock_quantity,
                            abs($delta)
                        ),
                    ],
                ]);
            }

            $product->forceFill(['stock_quantity' => $newStock])->save();

            StockMovement::create([
                'product_id' => $product->id,
                'type' => $movementType,
                'quantity' => $delta,
                'stock_after' => $newStock,
                'reference' => 'ADJ-'.$product->id.'-'.date('His'),
                'notes' => $notes ?: 'Pagsasaayos ng stock sa imbentaryo',
                'user_id' => $user->id,
            ]);

            return $product->fresh(['category']);
        });
    }

    /**
     * Executes bulk restocking for multiple products.
     *
     * @param  array  $items  Array of ['product_id' => int, 'quantity' => int]
     */
    public function bulkRestock(User $user, array $items, ?string $notes = null): array
    {
        return DB::transaction(function () use ($user, $items, $notes) {
            $updatedProducts = [];
            foreach ($items as $item) {
                $prodId = (int) ($item['product_id'] ?? 0);
                $qty = (int) ($item['quantity'] ?? 0);
                if ($prodId > 0 && $qty > 0) {
                    $updatedProducts[] = $this->execute($user, $prodId, 'restock', $qty, $notes ?: 'Bulk restock mula sa restock list');
                }
            }

            return $updatedProducts;
        });
    }
}
