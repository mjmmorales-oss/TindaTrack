<?php
/**
 * Order logic for System 1 (TindaOrder).
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/InventoryApiClient.php';

function inventory_client(): InventoryApiClient
{
    return new InventoryApiClient(app_config()['inventory_api']);
}

/** ORD-YYYYMMDD-#### (sequential per day) */
function generate_order_id(): string
{
    $prefix = 'ORD-' . date('Ymd') . '-';
    $stmt = db()->prepare('SELECT COUNT(*) FROM orders WHERE order_id LIKE ?');
    $stmt->execute([$prefix . '%']);

    return $prefix . str_pad((string) ((int) $stmt->fetchColumn() + 1), 4, '0', STR_PAD_LEFT);
}

function find_order(string $orderId): ?array
{
    $stmt = db()->prepare(
        'SELECT o.*, c.customer_code, c.name AS customer_name, c.email AS customer_email
           FROM orders o JOIN customers c ON c.id = o.customer_id
          WHERE o.order_id = ?'
    );
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (! $order) {
        return null;
    }
    $items = db()->prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id');
    $items->execute([$order['id']]);
    $order['items'] = $items->fetchAll();

    return $order;
}

/**
 * Builds the JSON payload that System 1 sends to System 2.
 * Exactly the fields required by the project: Order ID, Customer ID, Product ID, Quantity.
 */
function build_order_payload(array $order): array
{
    return [
        'order_id' => $order['order_id'],
        'customer_id' => $order['customer_code'],
        'items' => array_map(fn ($i) => [
            'product_id' => (int) $i['product_id'],
            'quantity' => (int) $i['quantity'],
        ], $order['items']),
    ];
}

/**
 * Sends a saved order to System 2 and stores the outcome.
 * Safe to call again for "Retry": System 2 is idempotent on order_id.
 */
function send_order_to_inventory(string $orderId): array
{
    $order = find_order($orderId);
    $payload = build_order_payload($order);
    $result = inventory_client()->createOrder($payload);
    $body = $result['data'] ?? [];

    // Map the HTTP status from System 2 to System 1's order status.
    switch (true) {
        case $result['status'] === 201:
        case $result['status'] === 200 && ($body['status'] ?? '') === 'accepted':
            $status = 'confirmed';
            $message = $body['message'] ?? 'Order accepted by inventory.';
            break;
        case $result['status'] === 409:
            $status = 'rejected';
            $message = $body['message'] ?? 'Insufficient stock.';
            break;
        case $result['status'] === 422:
            $status = 'rejected';
            $message = 'Invalid order data: ' . implode(' ', array_map(
                fn ($errs) => implode(' ', (array) $errs),
                $body['errors'] ?? [['Validation failed.']]
            ));
            break;
        case $result['status'] === 401:
            $status = 'failed';
            $message = 'Inventory system rejected our API key (401). Check config.php.';
            break;
        case $result['status'] === 0:
            $status = 'pending';
            $message = 'Could not reach the TindaTrack Inventory API (' . ($result['error'] ?: 'connection failed')
                . '). The order is saved as PENDING - click "Retry sending" once the inventory system is online.';
            break;
        default:
            $status = 'failed';
            $message = 'Unexpected response from inventory (HTTP ' . $result['status'] . ').';
    }

    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE orders SET status = ?, api_http_status = ?, api_message = ?, total_amount = ?, updated_at = ? WHERE id = ?')
        ->execute([
            $status,
            $result['status'],
            $message,
            $body['total_amount'] ?? $order['total_amount'],
            now_str(),
            $order['id'],
        ]);

    // Copy what System 2 returned for each product (Product ID, Available Quantity, Stock Status).
    foreach ($body['items'] ?? [] as $line) {
        $pdo->prepare(
            'UPDATE order_items SET product_name = ?, unit_price = COALESCE(?, unit_price),
                    available_quantity = ?, stock_status = ?
              WHERE order_id = ? AND product_id = ?'
        )->execute([
            $line['product_name'] ?? null,
            $line['unit_price'] ?? null,
            $line['available_quantity'] ?? null,
            $line['stock_status'] ?? null,
            $order['id'],
            $line['product_id'],
        ]);
    }
    $pdo->commit();

    return ['status' => $status, 'message' => $message, 'http_status' => $result['status']];
}

function status_badge(string $status): string
{
    $labels = [
        'confirmed' => 'Confirmed',
        'rejected' => 'Rejected',
        'pending' => 'Pending',
        'failed' => 'Failed',
        'in_stock' => 'In stock',
        'low_stock' => 'Low stock',
        'out_of_stock' => 'Out of stock',
        'insufficient_stock' => 'Insufficient stock',
    ];

    return '<span class="badge badge-' . htmlspecialchars($status) . '">'
        . htmlspecialchars($labels[$status] ?? $status) . '</span>';
}
