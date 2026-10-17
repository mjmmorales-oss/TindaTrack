<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiScanImage extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'ai_scan_id',
        'mime_type',
        'image_size',
        'image_data',
    ];

    protected $hidden = [
        'image_data',
    ];

    protected function casts(): array
    {
        return [
            'image_size' => 'integer',
        ];
    }

    public function scan(): BelongsTo
    {
        return $this->belongsTo(AiScan::class, 'ai_scan_id');
    }
}
