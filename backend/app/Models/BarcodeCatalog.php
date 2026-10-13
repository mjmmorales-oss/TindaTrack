<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BarcodeCatalog extends Model
{
    use HasFactory;

    protected $table = 'barcode_catalog';

    protected $primaryKey = 'barcode';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'barcode',
        'found',
        'source',
        'name',
        'brand',
        'size',
        'image_url',
        'categories',
        'fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'found' => 'boolean',
            'categories' => 'array',
            'fetched_at' => 'datetime',
        ];
    }
}
