<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'store_name' => $this->store_name,
            'store_tagline' => $this->store_tagline,
            'phone' => $this->phone,
            'contact_number' => $this->phone,
            'address' => $this->address,
            'receipt_header' => $this->receipt_header,
            'receipt_footer' => $this->receipt_footer,
            'default_reorder_level' => (int) $this->default_reorder_level,
            'low_stock_threshold' => (int) $this->low_stock_threshold,
            'currency' => $this->currency,
            'timezone' => $this->timezone,
            'ai_enabled' => (bool) ($this->ai_enabled ?? true),
            'ai_save_scan_images' => (bool) ($this->ai_save_scan_images ?? false),
            'ai_research_mode' => (bool) ($this->ai_research_mode ?? false),
            'visual_search_enabled' => (bool) ($this->visual_search_enabled ?? true),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
