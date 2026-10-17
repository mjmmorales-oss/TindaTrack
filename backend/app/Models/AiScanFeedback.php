<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiScanFeedback extends Model
{
    use HasFactory;

    protected $table = 'ai_scan_feedback';

    protected $fillable = [
        'ai_scan_id',
        'line_type',
        'suggested_product_id',
        'suggested_quantity',
        'confidence',
        'final_product_id',
        'final_quantity',
        'action',
    ];

    protected function casts(): array
    {
        return [
            'suggested_quantity' => 'integer',
            'final_quantity' => 'integer',
            'confidence' => 'float',
        ];
    }

    public function scan(): BelongsTo
    {
        return $this->belongsTo(AiScan::class, 'ai_scan_id');
    }

    public function suggestedProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'suggested_product_id');
    }

    public function finalProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'final_product_id');
    }
}
