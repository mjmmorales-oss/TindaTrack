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
            'owner_name' => $this->owner_name,
            'phone' => $this->phone,
            'contact_number' => $this->phone,
            'address' => $this->address,
            'receipt_header' => $this->receipt_header,
            'receipt_footer' => $this->receipt_footer,
            'show_cashier_name' => (bool) ($this->show_cashier_name ?? true),
            'default_reorder_level' => (int) $this->default_reorder_level,
            'low_stock_threshold' => (int) $this->low_stock_threshold,
            'low_stock_threshold_percent' => (int) ($this->low_stock_threshold_percent ?? 20),
            'currency' => $this->currency,
            'timezone' => $this->timezone,
            'ai_enabled' => (bool) ($this->ai_enabled ?? true),
            'ai_save_scan_images' => (bool) ($this->ai_save_scan_images ?? false),
            'ai_research_mode' => (bool) ($this->ai_research_mode ?? false),
            'visual_search_enabled' => (bool) ($this->visual_search_enabled ?? true),
            'auto_capture_basket' => (bool) ($this->auto_capture_basket ?? true),
            'auto_capture_stockin' => (bool) ($this->auto_capture_stockin ?? true),
            'auto_capture_sensitivity' => (string) ($this->auto_capture_sensitivity ?? 'medium'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
