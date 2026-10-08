<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UtangPaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'sale_id' => $this->sale_id,
            'amount' => (float) $this->amount,
            'payment_date' => $this->payment_date?->toIso8601String(),
            'notes' => $this->notes,
            'recorded_by' => $this->recorded_by,
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'recorder' => new UserResource($this->whenLoaded('recorder')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
