<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role?->value,
            'role_label' => $this->role?->label(),
            'is_active' => (bool) $this->is_active,
            'must_change_password' => (bool) $this->must_change_password,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'sales_count' => (int) ($this->sales_count ?? ($this->relationLoaded('sales') ? $this->sales->where('status.value', 'completed')->count() : $this->sales()->where('status', 'completed')->count())),
            'sales_total_today' => round((float) ($this->sales_total_today ?? ($this->relationLoaded('sales') ? $this->sales->where('status.value', 'completed')->where('created_at', '>=', today())->sum('total_amount') : $this->sales()->where('status', 'completed')->whereDate('created_at', today())->sum('total_amount'))), 2),
        ];
    }
}
