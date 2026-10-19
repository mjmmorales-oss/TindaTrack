<?php

namespace App\Support;

use App\Models\Product;

/**
 * Single source of truth for the stock status labels returned by the
 * Integration API. Same rules the TindaTrack UI uses:
 *   0                      => out_of_stock
 *   1 .. reorder_level     => low_stock
 *   above reorder_level    => in_stock
 */
class StockStatus
{
    public const IN_STOCK = 'in_stock';

    public const LOW_STOCK = 'low_stock';

    public const OUT_OF_STOCK = 'out_of_stock';

    public const INSUFFICIENT = 'insufficient_stock';

    public static function for(Product $product): string
    {
        $qty = (int) $product->stock_quantity;

        if ($qty <= 0) {
            return self::OUT_OF_STOCK;
        }

        if ($qty <= (int) $product->reorder_level) {
            return self::LOW_STOCK;
        }

        return self::IN_STOCK;
    }
}
