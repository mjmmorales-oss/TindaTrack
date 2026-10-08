<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sale_no' => $this->sale_no,
            'sale_number' => $this->sale_no,
            'user_id' => $this->user_id,
            'customer_id' => $this->customer_id,
            'total_amount' => (float) $this->total_amount,
            'subtotal' => (float) $this->total_amount,
            'total' => (float) $this->total_amount,
            'payment_type' => $this->payment_type?->value ?? (string) $this->payment_type,
            'payment_method' => $this->payment_type?->value ?? (string) $this->payment_type,
            'amount_paid' => (float) $this->amount_paid,
            'amount_tendered' => (float) $this->amount_paid,
            'change_amount' => (float) $this->change_amount,
            'change' => (float) $this->change_amount,
            'status' => $this->status?->value ?? (string) $this->status,
            'void_reason' => $this->void_reason,
            'voided_by' => $this->voided_by,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'items' => SaleItemResource::collection($this->whenLoaded('items')),
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'cashier' => new UserResource($this->whenLoaded('cashier')),
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
