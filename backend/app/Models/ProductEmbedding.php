<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductEmbedding extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'model',
        'source',
        'vector',
        'image_sha256',
    ];

    protected function casts(): array
    {
        return [
            'vector' => 'array',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
