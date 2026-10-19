<?php

namespace App\Http\Controllers\Integration;

use App\Actions\ProcessIntegrationOrderAction;
use App\Http\Controllers\Controller;
use App\Models\IntegrationOrder;
use App\Models\Product;
use App\Support\StockStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use SimpleXMLElement;

/**
 * Inventory Integration API (System 2 - TindaTrack).
 *
 * Consumed by System 1 (TindaOrder Online Ordering System) over REST.
 * Base URL: /api/integration/v1   Auth: X-API-Key header   Format: JSON (XML optional for stock)
 */
class InventoryIntegrationController extends Controller
{
    /**
     * GET /api/integration/v1/products
     * Product catalog with live stock, used by System 1 to build its online store.
     */
    public function products(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $products = Product::query()
            ->where('is_active', true)
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $products->map(fn (Product $p) => [
                'product_id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'unit' => $p->unit,
                'price' => (float) $p->price,
                'available_quantity' => (int) $p->stock_quantity,
                'stock_status' => StockStatus::for($p),
            ])->values(),
            'meta' => [
                'count' => $products->count(),
                'generated_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * GET /api/integration/v1/products/{productId}/stock[?format=xml]
     * Returns Product ID, Available Quantity and Stock Status.
     */
    public function stock(Request $request, string $productId): JsonResponse|Response
    {
        $product = ctype_digit($productId)
            ? Product::where('is_active', true)->find((int) $productId)
            : null;

        if (! $product) {
            return response()->json([
                'message' => "Product {$productId} was not found in the inventory.",
                'error' => 'product_not_found',
            ], 404);
        }

        $payload = [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'available_quantity' => (int) $product->stock_quantity,
            'reorder_level' => (int) $product->reorder_level,
            'stock_status' => StockStatus::for($product),
            'checked_at' => now()->toIso8601String(),
        ];

        if (strtolower((string) $request->query('format')) === 'xml') {
            return $this->xml($payload);
        }

        return response()->json($payload);
    }

    /**
     * POST /api/integration/v1/orders
     * Receives an order from System 1, validates it, checks and deducts stock.
     */
    public function storeOrder(Request $request, ProcessIntegrationOrderAction $action): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'regex:/^[A-Za-z0-9_-]{1,50}$/'],
            'customer_id' => ['required', 'regex:/^[A-Za-z0-9_-]{1,50}$/'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('products', 'id')->whereNull('deleted_at')->where('is_active', true),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000'],
        ], [
            'order_id.regex' => 'The order_id may only contain letters, numbers, dashes and underscores (max 50).',
            'customer_id.regex' => 'The customer_id may only contain letters, numbers, dashes and underscores (max 50).',
            'items.*.product_id.exists' => 'Product :input does not exist in the inventory or is inactive.',
            'items.*.product_id.distinct' => 'Each product may only appear once per order.',
            'items.*.quantity.min' => 'Quantity must be at least 1.',
        ]);

        $result = $action->execute($validated, (string) $request->header('X-Source-System', 'TindaOrder'));

        return response()->json($result['body'], $result['http_status']);
    }

    /**
     * GET /api/integration/v1/orders/{orderId}
     * Lets System 1 check what System 2 recorded for an order (e.g. after a timeout).
     */
    public function showOrder(string $orderId): JsonResponse
    {
        $order = IntegrationOrder::where('order_id', $orderId)->first();

        if (! $order) {
            return response()->json([
                'message' => "Order {$orderId} was not found in the inventory system.",
                'error' => 'order_not_found',
            ], 404);
        }

        return response()->json($order->response);
    }

    /**
     * Serializes a flat payload into XML: <StockResponse><ProductID>..</ProductID>...</StockResponse>
     */
    private function xml(array $payload): Response
    {
        $map = [
            'product_id' => 'ProductID',
            'product_name' => 'ProductName',
            'available_quantity' => 'AvailableQuantity',
            'reorder_level' => 'ReorderLevel',
            'stock_status' => 'StockStatus',
            'checked_at' => 'CheckedAt',
        ];

        $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><StockResponse/>');
        foreach ($map as $key => $tag) {
            $xml->addChild($tag, htmlspecialchars((string) $payload[$key], ENT_XML1));
        }

        return response($xml->asXML(), 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
