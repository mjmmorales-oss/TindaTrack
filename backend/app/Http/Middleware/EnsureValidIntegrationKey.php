<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates external systems (e.g. the TindaOrder Online Ordering System)
 * that call the Inventory Integration API.
 *
 * The caller must send the shared secret in the "X-API-Key" header.
 * The expected value comes from INTEGRATION_API_KEY in backend/.env.
 */
class EnsureValidIntegrationKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.integration.api_key', '');
        $provided = $request->header('X-API-Key');

        // Reject when the server has no key configured, or the key is missing / wrong.
        // hash_equals() compares in constant time to avoid timing attacks.
        if ($expected === '' || ! is_string($provided) || ! hash_equals($expected, $provided)) {
            return response()->json([
                'message' => 'Unauthorized. Missing or invalid API key.',
                'error' => 'invalid_api_key',
            ], 401);
        }

        return $next($request);
    }
}
