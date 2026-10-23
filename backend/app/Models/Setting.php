<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'id',
        'store_name',
        'store_tagline',
        'owner_name',
        'phone',
        'address',
        'receipt_header',
        'receipt_footer',
        'show_cashier_name',
        'default_reorder_level',
        'low_stock_threshold',
        'low_stock_threshold_percent',
        'currency',
        'timezone',
        'ai_enabled',
        'ai_save_scan_images',
        'ai_research_mode',
        'visual_search_enabled',
        'auto_capture_basket',
        'auto_capture_stockin',
        'auto_capture_sensitivity',
    ];

    protected function casts(): array
    {
        return [
            'default_reorder_level' => 'integer',
            'low_stock_threshold' => 'integer',
            'low_stock_threshold_percent' => 'integer',
            'show_cashier_name' => 'boolean',
            'ai_enabled' => 'boolean',
            'ai_save_scan_images' => 'boolean',
            'ai_research_mode' => 'boolean',
            'visual_search_enabled' => 'boolean',
            'auto_capture_basket' => 'boolean',
            'auto_capture_stockin' => 'boolean',
            'auto_capture_sensitivity' => 'string',
        ];
    }
}
