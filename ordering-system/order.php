<?php
require_once __DIR__ . '/includes/orders.php';
require_once __DIR__ . '/includes/layout.php';

$flash = flash();
$order = find_order((string) ($_GET['id'] ?? ''));

render_header('Order', 'orders.php');

if (! $order): ?>
    <div class="alert alert-error">Order not found.</div>
<?php render_footer(); exit; endif;

// Last request/response exchanged with System 2 for this order (from api_logs).
$log = db()->prepare("SELECT * FROM api_logs WHERE order_id = ? AND method = 'POST' ORDER BY id DESC LIMIT 1");
$log->execute([$order['order_id']]);
$exchange = $log->fetch();
?>
<?php if ($flash): ?>
    <div class="alert alert-<?= e($flash['type']) ?> dev-only"><?= e($flash['message']) ?></div>
<?php endif; ?>

<div class="page-head">
    <div>
        <h1><?= e($order['order_id']) ?> <?= status_badge($order['status']) ?></h1>
        <p class="muted">Customer <?= e($order['customer_code']) ?> — <?= e($order['customer_name']) ?> · Placed <?= e($order['created_at']) ?></p>
    </div>
    <?php if (in_array($order['status'], ['pending', 'failed'], true)): ?>
        <form method="post" action="retry_order.php">
            <input type="hidden" name="order_id" value="<?= e($order['order_id']) ?>">
            <button class="btn btn-primary">Retry sending to inventory</button>
        </form>
    <?php endif; ?>
</div>

<?php
$customerMessages = [
    'confirmed' => ['ok', 'Thank you! Your order is confirmed.', 'Your items are reserved. Pick them up at Tindahan ni Aling Nena and pay at the counter.'],
    'rejected' => ['bad', 'Sorry, we cannot fill this order.', 'Some items do not have enough stock right now. Nothing was reserved, so you can change the quantities and order again.'],
    'pending' => ['warn', 'We received your order.', 'The store system is busy right now, so your order is saved and waiting. Tap "Retry sending to inventory" in a moment.'],
    'failed' => ['bad', 'Your order could not be sent.', 'Please ask the store for help.'],
];
[$tone, $headline, $detail] = $customerMessages[$order['status']] ?? ['warn', 'Order saved.', ''];
?>
<div class="notice notice-<?= e($tone) ?> cust-only">
    <strong><?= e($headline) ?></strong>
    <span><?= e($detail) ?></span>
</div>

<div class="card">
    <h2><span class="dev-only">Result from System 2 (TindaTrack)</span><span class="cust-only">Your items</span></h2>
    <p class="dev-only"><?= e($order['api_message'] ?? '—') ?> <span class="muted">(HTTP <?= e($order['api_http_status'] ?? '—') ?>)</span></p>
    <table>
        <thead><tr><th class="dev-only">Product ID</th><th>Product</th><th>Qty ordered</th><th>Unit price</th><th class="dev-only">Available quantity</th><th><span class="dev-only">Stock status</span><span class="cust-only">Availability</span></th></tr></thead>
        <tbody>
        <?php foreach ($order['items'] as $i): ?>
            <tr>
                <td class="dev-only"><?= e($i['product_id']) ?></td>
                <td><?= e($i['product_name'] ?? (is_customer_view() ? 'Item #' . $i['product_id'] : '—')) ?></td>
                <td><?= e($i['quantity']) ?></td>
                <td><?= $i['unit_price'] !== null ? peso($i['unit_price']) : '—' ?></td>
                <td class="dev-only"><?= e($i['available_quantity'] ?? '—') ?></td>
                <td><?= $i['stock_status'] ? status_badge($i['stock_status']) : '—' ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php if ($order['status'] === 'confirmed'): ?>
        <p class="total">Total: <strong><?= peso($order['total_amount']) ?></strong></p>
    <?php endif; ?>
</div>

<?php if ($exchange): ?>
<div class="exchange dev-only">
    <div class="card">
        <h2>① Request sent by System 1</h2>
        <p class="mono"><?= e($exchange['method']) ?> <?= e($exchange['endpoint']) ?><br>Content-Type: application/json<br>X-API-Key: ••••••••</p>
        <pre><?= e($exchange['request_body']) ?></pre>
    </div>
    <div class="card">
        <h2>② Response from System 2</h2>
        <p class="mono">HTTP <?= e($exchange['http_status']) ?> · <?= e($exchange['duration_ms']) ?> ms</p>
        <pre><?= e($exchange['response_body']) ?></pre>
    </div>
</div>
<?php endif; ?>
<?php render_footer();
