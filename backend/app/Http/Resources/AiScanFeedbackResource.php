<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AiScanFeedbackResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ai_scan_id' => $this->ai_scan_id,
            'line_type' => $this->line_type,
            'suggested_product_id' => $this->suggested_product_id,
            'suggested_quantity' => $this->suggested_quantity !== null ? (int) $this->suggested_quantity : null,
            'confidence' => $this->confidence !== null ? (float) $this->confidence : null,
            'final_product_id' => $this->final_product_id,
            'final_quantity' => $this->final_quantity !== null ? (int) $this->final_quantity : null,
            'action' => $this->action,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
