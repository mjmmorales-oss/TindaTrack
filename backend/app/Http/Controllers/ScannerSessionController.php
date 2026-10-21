<?php

namespace App\Http\Controllers;

use App\Http\Resources\ScannerEventResource;
use App\Models\ScannerEvent;
use App\Models\ScannerSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScannerSessionController extends Controller
{
    /**
     * Create a new scanner session for the authenticated user.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['nullable', 'string', 'in:pos,inventory'],
        ]);

        $mode = $validated['mode'] ?? 'pos';
        $user = $request->user();

        if ($mode === 'inventory' && ! $user->isOwner()) {
            return response()->json([
                'message' => 'Only store owners can start inventory scanner sessions.',
            ], 403);
        }

        // End user's previous active sessions in the same mode
        ScannerSession::where('user_id', $user->id)
            ->where('mode', $mode)
            ->whereNull('ended_at')
            ->update(['ended_at' => now()]);

        // Lazily prune old events (>24h) and expired sessions (>24h)
        ScannerEvent::where('created_at', '<', now()->subHours(24))->delete();
        ScannerSession::where('expires_at', '<', now()->subHours(24))->delete();

        $pairingCode = ScannerSession::generatePairingCode();

        $session = ScannerSession::create([
            'user_id' => $user->id,
            'mode' => $mode,
            'pairing_code' => $pairingCode,
            'pairing_expires_at' => now()->addMinutes(10),
            'expires_at' => now()->addHours(12),
        ]);

        return response()->json([
            'data' => [
                'id' => $session->id,
                'pairing_code' => $session->pairing_code,
                'pairing_expires_at' => $session->pairing_expires_at->toIso8601String(),
                'expires_at' => $session->expires_at->toIso8601String(),
                'mode' => $session->mode,
            ],
        ], 201);
    }

    /**
     * Get scanner session status (online, paired, last_seen_at).
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $session = ScannerSession::findOrFail($id);

        if ($session->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        return response()->json([
            'data' => [
                'id' => $session->id,
                'paired' => $session->isPaired(),
                'device_label' => $session->device_label,
                'last_seen_at' => $session->last_seen_at?->toIso8601String(),
                'online' => $session->isOnline(),
                // An expired session is over for the POS too (the phone already gets 401)
                'ended_at' => ($session->ended_at
                    ?? ($session->expires_at && $session->expires_at->isPast() ? $session->expires_at : null))
                    ?->toIso8601String(),
                'expired' => (bool) ($session->expires_at && $session->expires_at->isPast()),
                'mode' => $session->mode,
            ],
        ]);
    }

    /**
     * List events for the scanner session, optionally filtered by `after` ID.
     */
    public function events(Request $request, string $id): JsonResponse
    {
        $session = ScannerSession::findOrFail($id);

        if ($session->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        $query = ScannerEvent::where('scanner_session_id', $session->id);

        if ($request->has('after')) {
            $query->where('id', '>', (int) $request->query('after'));
        }

        $events = $query->orderBy('id', 'asc')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => ScannerEventResource::collection($events),
        ]);
    }

    /**
     * The POS finished reviewing the phone's AI basket (added, discarded or scan again):
     * lets the phone re-arm auto-capture.
     */
    public function basketDone(Request $request, string $id): JsonResponse
    {
        $session = ScannerSession::findOrFail($id);

        if ($session->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        $session->forceFill(['basket_pending_at' => null])->save();

        return response()->json(['data' => ['basket_pending' => false]]);
    }

    /**
     * End a scanner session.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $session = ScannerSession::findOrFail($id);

        if ($session->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        $session->update(['ended_at' => now()]);

        return response()->json([
            'message' => 'Scanner session ended successfully.',
        ]);
    }

    /**
     * List distinct unresolved unknown barcodes for the owner's store (last 14 days).
     */
    public function unknownBarcodes(Request $request): JsonResponse
    {
        $user = $request->user();

        $rows = ScannerEvent::whereHas('session', fn ($q) => $q->where('user_id', $user->id))
            ->where('status', 'unknown')
            ->whereNull('resolved_at')
            ->where('created_at', '>=', now()->subDays(14))
            ->select('barcode', DB::raw('count(*) as scan_count'), DB::raw('max(created_at) as last_seen_at'))
            ->groupBy('barcode')
            ->orderByDesc('last_seen_at')
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($r) => [
                'barcode' => $r->barcode,
                'scan_count' => (int) $r->scan_count,
                'last_seen_at' => $r->last_seen_at,
            ]),
        ]);
    }
}
