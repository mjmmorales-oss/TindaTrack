<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiScan extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'user_id',
        'scanner_session_id',
        'type',
        'provider',
        'model',
        'prompt_version',
        'image_sha256',
        'image_id',
        'latency_ms',
        'status',
        'error_code',
        'raw_response',
        'result',
        'catalog_size',
        'catalog_truncated',
    ];

    protected function casts(): array
    {
        return [
            'latency_ms' => 'integer',
            'catalog_size' => 'integer',
            'catalog_truncated' => 'boolean',
            'raw_response' => 'array',
            'result' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scannerSession(): BelongsTo
    {
        return $this->belongsTo(ScannerSession::class);
    }

    public function image(): BelongsTo
    {
        return $this->belongsTo(AiScanImage::class, 'image_id');
    }

    public function feedback(): HasMany
    {
        return $this->hasMany(AiScanFeedback::class);
    }
}
