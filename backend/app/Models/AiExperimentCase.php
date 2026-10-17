<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiExperimentCase extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'ai_experiment_id',
        'case_number',
        'image_id',
        'ground_truth',
        'predicted',
        'is_correct',
        'latency_ms',
        'metrics',
    ];

    protected function casts(): array
    {
        return [
            'case_number' => 'integer',
            'ground_truth' => 'array',
            'predicted' => 'array',
            'is_correct' => 'boolean',
            'latency_ms' => 'integer',
            'metrics' => 'array',
        ];
    }

    public function experiment(): BelongsTo
    {
        return $this->belongsTo(AiExperiment::class, 'ai_experiment_id');
    }

    public function image(): BelongsTo
    {
        return $this->belongsTo(AiScanImage::class, 'image_id');
    }
}
