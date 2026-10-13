<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScannerEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scanner_session_id' => $this->scanner_session_id,
            'barcode' => $this->barcode,
            'status' => $this->status,
            'product_id' => $this->product_id,
            'quantity' => (int) $this->quantity,
            'payload' => $this->payload,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
