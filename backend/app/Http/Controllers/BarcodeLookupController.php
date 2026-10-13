<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductLookupService;
use App\Support\Barcode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BarcodeLookupController extends Controller
{
    public function __construct(
        protected ProductLookupService $lookupService
    ) {}

    /**
     * Look up a barcode locally or via Open Food Facts.
     */
    public function __invoke(Request $request, string $barcode): JsonResponse
    {
        if (! Barcode::isAcceptable($barcode)) {
            return response()->json([
                'message' => 'Hindi wastong barcode format.',
                'errors' => [
                    'barcode' => ['Hindi wastong barcode format.'],
                ],
            ], 422);
        }

        $user = $request->user();

        // Cashiers only query local inventory
        if ($user && $user->hasRole('cashier')) {
            $normalized = Barcode::normalize($barcode);
            $localProduct = Product::with('category')->where('barcode', $normalized)->first();

            return response()->json([
                'data' => [
                    'barcode' => $normalized,
                    'local_product' => $localProduct ? new ProductResource($localProduct) : null,
                    'catalog' => null,
                ],
            ]);
        }

        // Owners get the full lookup result
        $result = $this->lookupService->lookup($barcode);

        return response()->json([
            'data' => $result,
        ]);
    }
}
