<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_name',
        'store_tagline',
        'phone',
        'address',
        'receipt_header',
        'receipt_footer',
        'default_reorder_level',
        'low_stock_threshold',
        'currency',
        'timezone',
    ];

    protected function casts(): array
    {
        return [
            'default_reorder_level' => 'integer',
            'low_stock_threshold' => 'integer',
        ];
    }
}
