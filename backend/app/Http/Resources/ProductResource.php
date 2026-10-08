<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isCashier = $user && $user->hasRole('cashier');

        $data = [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'unit' => $this->unit,
            'price' => (float) $this->price,
            'stock_quantity' => (int) $this->stock_quantity,
            'reorder_level' => (int) $this->reorder_level,
            'is_active' => (bool) $this->is_active,
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'category' => new CategoryResource($this->whenLoaded('category')),
        ];

        if (! $isCashier) {
            $data['cost_price'] = (float) $this->cost_price;
            $data['profit_margin'] = $this->price > 0 ? round((((float) $this->price - (float) $this->cost_price) / (float) $this->price) * 100, 1) : 0.0;
        }

        return $data;
    }
}
