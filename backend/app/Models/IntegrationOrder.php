<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * An order received from an external system (System 1 - TindaOrder)
 * through the Inventory Integration API.
 */
class IntegrationOrder extends Model
{
    protected $fillable = [
        'order_id',
        'customer_id',
        'source_system',
        'status',
        'total_amount',
        'items',
        'response',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'float',
            'items' => 'array',
            'response' => 'array',
        ];
    }
}
