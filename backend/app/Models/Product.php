<?php

namespace App\Models;

use App\Support\SkuGenerator;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

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

    /**
     * Soft-deletes the product and frees its barcode and SKU for reuse.
     * The old codes are kept in deleted_barcode / deleted_sku for history and restore.
     */
    public function archive(): void
    {
        DB::transaction(function () {
            $this->forceFill([
                'deleted_barcode' => $this->barcode ?? $this->deleted_barcode,
                'deleted_sku' => $this->sku ?? $this->deleted_sku,
                'barcode' => null,
                'sku' => null,
            ])->save();

            $this->delete();
        });
    }

    /**
     * Restores an archived product and gives back its barcode and SKU when they
     * are still free. A taken barcode stays empty; a taken SKU is regenerated.
     *
     * @return array{barcode_restored: bool, sku_restored: bool}
     */
    public function restoreFromArchive(): array
    {
        return DB::transaction(function () {
            $barcode = $this->deleted_barcode;
            $barcodeFree = $barcode !== null && ! static::where('barcode', $barcode)->exists();

            $sku = $this->deleted_sku;
            $skuFree = $sku !== null && ! static::where('sku', $sku)->exists();

            $this->restore();
            $this->forceFill([
                'barcode' => $barcodeFree ? $barcode : null,
                'sku' => $skuFree ? $sku : SkuGenerator::generate($this->category_id),
                'deleted_barcode' => null,
                'deleted_sku' => null,
            ])->save();

            return ['barcode_restored' => $barcodeFree, 'sku_restored' => $skuFree];
        });
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
