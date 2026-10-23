<?php

namespace App\Http\Controllers;

use App\Http\Resources\SettingResource;
use App\Models\Product;
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
            'auto_capture_basket' => true,
            'auto_capture_stockin' => true,
            'auto_capture_sensitivity' => 'medium',
        ]);

        return response()->json([
            'data' => new SettingResource($setting),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        if ($request->has('contact_number') && ! $request->has('phone')) {
            $request->merge(['phone' => $request->input('contact_number')]);
        }

        $validated = $request->validate([
            'store_name' => ['sometimes', 'required', 'string', 'max:255'],
            'store_tagline' => ['nullable', 'string', 'max:255'],
            'owner_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'receipt_header' => ['nullable', 'string', 'max:500'],
            'receipt_footer' => ['nullable', 'string', 'max:500'],
            'show_cashier_name' => ['nullable', 'boolean'],
            // NOT NULL column: an emptied field must not reach the database as null
            'default_reorder_level' => ['sometimes', 'required', 'integer', 'min:1'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:1'],
            'low_stock_threshold_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'currency' => ['nullable', 'string', 'max:10'],
            'timezone' => ['nullable', 'string', 'max:50'],
            'ai_enabled' => ['nullable', 'boolean'],
            'ai_save_scan_images' => ['nullable', 'boolean'],
            'ai_research_mode' => ['nullable', 'boolean'],
            'visual_search_enabled' => ['nullable', 'boolean'],
            'auto_capture_basket' => ['nullable', 'boolean'],
            'auto_capture_stockin' => ['nullable', 'boolean'],
            'auto_capture_sensitivity' => ['nullable', 'string', 'in:low,medium,normal,high'],
        ]);

        if (isset($validated['auto_capture_sensitivity']) && $validated['auto_capture_sensitivity'] === 'normal') {
            $validated['auto_capture_sensitivity'] = 'medium';
        }

        if (isset($validated['contact_number']) && ! isset($validated['phone'])) {
            $validated['phone'] = $validated['contact_number'];
        }
        unset($validated['contact_number']);

        $setting = Setting::firstOrCreate(['id' => 1]);
        $setting->update($validated);

        return response()->json([
            'data' => new SettingResource($setting->fresh()),
            'message' => 'Store settings updated successfully.',
        ]);
    }

    public function restoreDemoImages(): JsonResponse
    {
        $path = database_path('data/products.json');
        if (! file_exists($path)) {
            return response()->json(['updated' => 0]);
        }

        $demoProducts = json_decode(file_get_contents($path), true) ?: [];
        $demoMap = [];
        foreach ($demoProducts as $dp) {
            if (! empty($dp['sku']) && ! empty($dp['image_url'])) {
                $demoMap[strtoupper(trim($dp['sku']))] = $dp['image_url'];
            }
        }

        $updated = 0;
        $products = Product::whereNull('image_url')->orWhere('image_url', '')->get();
        foreach ($products as $product) {
            $sku = strtoupper(trim($product->sku));
            if (isset($demoMap[$sku])) {
                $product->update(['image_url' => $demoMap[$sku]]);
                $updated++;
            }
        }

        return response()->json([
            'updated' => $updated,
            'message' => "Restored {$updated} demo product images.",
        ]);
    }
}
