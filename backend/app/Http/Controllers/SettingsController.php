<?php

namespace App\Http\Controllers;

use App\Http\Resources\SettingResource;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function get(): JsonResponse
    {
        $setting = Setting::firstOrCreate(['id' => 1], [
            'store_name' => 'Tindahan ni Aling Nena',
            'store_tagline' => 'Mura at Sariwa Araw-araw',
            'phone' => '0917-123-4567',
            'address' => 'Purok 3, Brgy. San Isidro',
            'receipt_header' => 'Tindahan ni Aling Nena',
            'receipt_footer' => 'Salamat po! Balik po kayo!',
            'default_reorder_level' => 10,
            'low_stock_threshold' => 5,
            'currency' => 'PHP',
            'timezone' => 'Asia/Manila',
        ]);

        return response()->json([
            'data' => new SettingResource($setting),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_name' => ['sometimes', 'required', 'string', 'max:255'],
            'store_tagline' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'receipt_header' => ['nullable', 'string', 'max:500'],
            'receipt_footer' => ['nullable', 'string', 'max:500'],
            'default_reorder_level' => ['nullable', 'integer', 'min:1'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:1'],
            'currency' => ['nullable', 'string', 'max:10'],
            'timezone' => ['nullable', 'string', 'max:50'],
        ]);

        $setting = Setting::firstOrCreate(['id' => 1]);
        $setting->update($validated);

        return response()->json([
            'data' => new SettingResource($setting->fresh()),
            'message' => 'Matagumpay na na-update ang mga setting ng tindahan.',
        ]);
    }
}
