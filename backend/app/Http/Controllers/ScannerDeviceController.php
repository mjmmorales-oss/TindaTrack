<?php

namespace App\Http\Controllers;

use App\Ai\AiService;
use App\Events\ScannerItemScanned;
use App\Models\Product;
use App\Models\ScannerEvent;
use App\Models\ScannerSession;
use App\Models\Setting;
use App\Services\ProductLookupService;
use App\Support\Barcode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ScannerDeviceController extends Controller
{
    /**
     * Pair a phone scanner with a session using a 9-char pairing code.
     */
    public function pair(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pairing_code' => ['required', 'string'],
            'device_label' => ['nullable', 'string', 'max:100'],
        ]);

        $raw = strtoupper(trim($validated['pairing_code']));
        $clean = str_replace(['-', ' '], '', $raw);
        $code = strlen($clean) === 8
            ? substr($clean, 0, 4).'-'.substr($clean, 4, 4)
            : $raw;

        $session = ScannerSession::where('pairing_code', $code)->first();

        if (! $session) {
            return response()->json([
                'reason' => 'not_found',
                'message' => 'Pairing code not found. Please verify the code from the POS.',
            ], 422);
        }

        if ($session->paired_at !== null || $session->device_token_hash !== null) {
            return response()->json([
                'reason' => 'used',
                'message' => 'This pairing code has already been used. Please request a new code from the POS.',
            ], 422);
        }

        if ($session->ended_at !== null || $session->pairing_expires_at->isPast()) {
            return response()->json([
                'reason' => 'expired',
                'message' => 'Pairing code has expired. Please request a new code from the POS.',
            ], 422);
        }

        $plainToken = Str::random(40);
        $tokenHash = hash('sha256', $plainToken);

        $session->update([
            'device_token_hash' => $tokenHash,
            'device_label' => $validated['device_label'] ?? 'Phone Scanner',
            'paired_at' => now(),
            'last_seen_at' => now(),
        ]);

        $storeName = Setting::first()?->store_name ?? 'TindaTrack';

        return response()->json([
            'data' => [
                'token' => $plainToken,
                'session' => [
                    'id' => $session->id,
                    'mode' => $session->mode,
                    'expires_at' => $session->expires_at->toIso8601String(),
                ],
                'store_name' => $storeName,
                'user_name' => $session->user->name,
            ],
        ]);
    }

    /**
     * Receive a scan from the paired device and dispatch to realtime channel.
     */
    public function scan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'barcode' => ['required', 'string'],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        /** @var ScannerSession $session */
        $session = $request->attributes->get('scanner_session');

        $barcode = Barcode::normalize($validated['barcode']);
        if (! Barcode::isAcceptable($barcode) && ! Product::where('barcode', $barcode)->exists()) {
            return response()->json([
                'message' => 'Invalid barcode format.',
            ], 422);
        }

        $quantity = max(1, (int) ($validated['quantity'] ?? 1));

        $product = Product::with('category')
            ->where('barcode', $barcode)
            ->where('is_active', true)
            ->first();

        if ($product) {
            $status = $product->stock_quantity >= 1 ? 'found' : 'out_of_stock';
            $payload = [
                'id' => $product->id,
                'name' => $product->name,
                'price' => (float) $product->price,
                'stock' => (int) $product->stock_quantity,
                'image_url' => $product->image_url,
            ];
        } else {
            $status = 'unknown';
            $payload = null;
        }

        $event = ScannerEvent::create([
            'scanner_session_id' => $session->id,
            'barcode' => $barcode,
            'status' => $status,
            'product_id' => $product?->id,
            'quantity' => $quantity,
            'payload' => $payload,
            'resolved_at' => null,
            'created_at' => now(),
        ]);

        // Attempt realtime broadcast, gracefully swallowing errors (e.g. offline/log driver)
        try {
            event(new ScannerItemScanned($event));
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed for scanner scan: '.$e->getMessage());
        }

        $responseData = [
            'event_id' => $event->id,
            'status' => $status,
            'product' => $payload,
        ];

        // In inventory mode, also return online lookup result when unknown
        if ($session->mode === 'inventory' && $status === 'unknown') {
            $lookup = app(ProductLookupService::class)->lookup($barcode);
            $responseData['catalog'] = $lookup['catalog'] ?? null;
        }

        return response()->json([
            'data' => $responseData,
        ], 201);
    }

    /**
     * Heartbeat from paired device to keep last_seen_at fresh.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        /** @var ScannerSession $session */
        $session = $request->attributes->get('scanner_session');

        $session->update(['last_seen_at' => now()]);

        return response()->json([
            'data' => [
                'ended' => false,
            ],
        ]);
    }

    /**
     * Receive a basket photo from the paired phone scanner and emit ai_basket event.
     */
    public function aiBasket(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file'],
        ]);

        /** @var ScannerSession $session */
        $session = $request->attributes->get('scanner_session');

        $aiService = app(AiService::class);
        if (! $aiService->isAiEnabled()) {
            return response()->json([
                'message' => 'AI features are disabled in store settings.',
                'code' => 'ai_disabled',
            ], 403);
        }

        $result = $aiService->processBasket(
            $request->file('image'),
            $session->user,
            $session->id
        );

        $event = ScannerEvent::create([
            'scanner_session_id' => $session->id,
            'barcode' => 'AI_BASKET',
            'status' => 'ai_basket',
            'product_id' => null,
            'quantity' => count($result['items']),
            'payload' => [
                'scan_id' => $result['scan_id'],
                'items_count' => count($result['items']),
                'unmatched_count' => count($result['unmatched']),
            ],
            'resolved_at' => null,
            'created_at' => now(),
        ]);

        try {
            event(new ScannerItemScanned($event));
        } catch (\Throwable $e) {
            Log::warning('Broadcast failed for scanner ai_basket: '.$e->getMessage());
        }

        return response()->json([
            'data' => [
                'event_id' => $event->id,
                'scan' => $result,
            ],
        ], 201);
    }
}
