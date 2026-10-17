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
        'phone',
        'address',
        'receipt_header',
        'receipt_footer',
        'default_reorder_level',
        'low_stock_threshold',
        'currency',
        'timezone',
        'ai_enabled',
        'ai_save_scan_images',
        'ai_research_mode',
        'visual_search_enabled',
    ];

    protected function casts(): array
    {
        return [
            'default_reorder_level' => 'integer',
            'low_stock_threshold' => 'integer',
            'ai_enabled' => 'boolean',
            'ai_save_scan_images' => 'boolean',
            'ai_research_mode' => 'boolean',
            'visual_search_enabled' => 'boolean',
        ];
    }
}
