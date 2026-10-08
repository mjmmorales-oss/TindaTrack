<?php

namespace App\Models;

use App\Enums\PaymentType;
use App\Enums\SaleStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_no',
        'user_id',
        'customer_id',
        'total_amount',
        'payment_type',
        'amount_paid',
        'change_amount',
        'status',
        'void_reason',
        'voided_by',
        'voided_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'float',
            'amount_paid' => 'float',
            'change_amount' => 'float',
            'payment_type' => PaymentType::class,
            'status' => SaleStatus::class,
            'voided_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function voidedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(UtangPayment::class);
    }
}
