<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'name',
        'sku',
        'barcode',
        'unit',
        'price',
        'cost_price',
        'stock_quantity',
        'reorder_level',
        'is_active',
        'description',
        'image_url',
        'brand',
        'size',
        'source',
        'source_ref',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'cost_price' => 'float',
            'stock_quantity' => 'integer',
            'reorder_level' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function image(): HasOne
    {
        return $this->hasOne(ProductImage::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function embeddings(): HasMany
    {
        return $this->hasMany(ProductEmbedding::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function scannerEvents(): HasMany
    {
        return $this->hasMany(ScannerEvent::class);
    }
}
