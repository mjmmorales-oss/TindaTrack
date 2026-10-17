<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductEmbeddingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'model' => $this->model,
            'source' => $this->source,
            'vector' => $this->vector,
            'image_sha256' => $this->image_sha256,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
