<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScannerSession extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'user_id',
        'mode',
        'pairing_code',
        'pairing_expires_at',
        'device_token_hash',
        'device_label',
        'paired_at',
        'last_seen_at',
        'ended_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'pairing_expires_at' => 'datetime',
            'paired_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'ended_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(ScannerEvent::class);
    }

    public function isOnline(): bool
    {
        return $this->last_seen_at !== null && $this->last_seen_at->gt(now()->subSeconds(20));
    }

    public function isPaired(): bool
    {
        return $this->paired_at !== null && $this->device_token_hash !== null;
    }

    public function isEnded(): bool
    {
        return $this->ended_at !== null || $this->expires_at->isPast();
    }
}
