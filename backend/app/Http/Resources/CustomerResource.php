<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'nickname' => $this->nickname,
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'credit_limit' => (float) $this->credit_limit,
            'credit_balance' => (float) $this->credit_balance,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            // Latest of: created, last sale, last utang payment (needs withMax/loadMax; else created_at)
            'last_activity' => collect([
                $this->created_at,
                $this->sales_max_created_at ?? null,
                $this->utang_payments_max_payment_date ?? null,
            ])->filter()->map(fn ($d) => Carbon::parse($d))->max()?->toIso8601String(),
        ];
    }
}
