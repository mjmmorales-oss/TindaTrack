<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AiExperimentCaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ai_experiment_id' => $this->ai_experiment_id,
            'case_number' => (int) $this->case_number,
            'image_id' => $this->image_id,
            'ground_truth' => $this->ground_truth,
            'predicted' => $this->predicted,
            'is_correct' => (bool) $this->is_correct,
            'latency_ms' => (int) $this->latency_ms,
            'metrics' => $this->metrics,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
