<?php

namespace App\Support;

/**
 * Selling units accepted for products. Must match PRODUCT_UNITS in
 * frontend/src/features/products/schemas.js (AI Stock-In could save "box",
 * which the product form then refused to edit).
 */
class ProductUnits
{
    public const ALL = ['pc', 'pack', 'sachet', 'bottle', 'can', 'cup', 'box', 'bag', 'roll', 'kg', 'g', 'L', 'ml'];
}
