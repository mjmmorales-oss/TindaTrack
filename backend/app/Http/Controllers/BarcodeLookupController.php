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
        // A barcode already stored on a product always resolves, even with a bad check digit.
        $storedProduct = strlen($barcode) <= 64
            ? Product::with('category')->where('barcode', Barcode::normalize($barcode))->first()
            : null;
        if ($storedProduct) {
            return response()->json([
                'data' => [
                    'barcode' => $storedProduct->barcode,
                    'local_product' => new ProductResource($storedProduct),
                    'catalog' => null,
                    'archived_product' => null,
                ],
            ]);
        }

        if (! Barcode::isAcceptable($barcode)) {
            $message = preg_match('#^https?://#i', trim($barcode)) || str_contains($barcode, '/')
                ? 'That is not a product barcode.'
                : 'Invalid barcode format.';

            return response()->json([
                'message' => $message,
                'code' => 'not_a_barcode',
                'errors' => [
                    'barcode' => [$message],
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
                    'archived_product' => null,
                ],
            ]);
        }

        // Owners get the full lookup result
        $result = $this->lookupService->lookup($barcode);

        // A deleted product with this barcode: offer to restore it instead of duplicating.
        $result['archived_product'] = null;
        if (empty($result['local_product'])) {
            $archived = Product::onlyTrashed()
                ->with('category')
                ->where('deleted_barcode', $result['barcode'])
                ->latest('deleted_at')
                ->first();
            $result['archived_product'] = $archived ? new ProductResource($archived) : null;
        }

        return response()->json([
            'data' => $result,
        ]);
    }
}
