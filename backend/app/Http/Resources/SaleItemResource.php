<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sale_id' => $this->sale_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'quantity' => (int) $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'unit_cost' => (float) $this->unit_cost,
            'subtotal' => (float) $this->subtotal,
            'product' => new ProductResource($this->whenLoaded('product')),
        ];
    }
}
