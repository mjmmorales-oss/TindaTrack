<?php

namespace App\Http\Middleware;

use App\Models\ScannerSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureValidScannerDevice
{
    /**
     * Handle an incoming request from a paired scanner device.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('X-Scanner-Token');

        if (! $token || ! is_string($token)) {
            return response()->json(['message' => 'Scanner session ended'], 401);
        }

        $tokenHash = hash('sha256', $token);

        $session = ScannerSession::where('device_token_hash', $tokenHash)
            ->whereNull('ended_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $session) {
            return response()->json(['message' => 'Scanner session ended'], 401);
        }

        // Update last_seen_at at most once per 30 seconds
        if (! $session->last_seen_at || $session->last_seen_at->lt(now()->subSeconds(30))) {
            $session->update(['last_seen_at' => now()]);
        }

        $request->attributes->set('scanner_session', $session);

        return $next($request);
    }
}
