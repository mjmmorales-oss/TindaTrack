<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AiScanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'scanner_session_id' => $this->scanner_session_id,
            'type' => $this->type,
            'provider' => $this->provider,
            'model' => $this->model,
            'prompt_version' => $this->prompt_version,
            'image_sha256' => $this->image_sha256,
            'has_image' => ! empty($this->image_id),
            'image_id' => $this->image_id,
            'latency_ms' => (int) $this->latency_ms,
            'status' => $this->status,
            'error_code' => $this->error_code,
            'catalog_size' => (int) $this->catalog_size,
            'catalog_truncated' => (bool) $this->catalog_truncated,
            'items' => $this->result['items'] ?? [],
            'unmatched' => $this->result['unmatched'] ?? [],
            'products' => $this->result['products'] ?? [],
            'result' => $this->result,
            'feedback' => AiScanFeedbackResource::collection($this->whenLoaded('feedback')),
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
