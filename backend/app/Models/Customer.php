<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'nickname',
        'contact_number',
        'address',
        'credit_limit',
        'credit_balance',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'credit_limit' => 'float',
            'credit_balance' => 'float',
        ];
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function utangPayments(): HasMany
    {
        return $this->hasMany(UtangPayment::class);
    }
}
