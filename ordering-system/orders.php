<?php
require_once __DIR__ . '/includes/orders.php';
require_once __DIR__ . '/includes/layout.php';

$flash = flash();
$orders = db()->query(
    'SELECT o.*, c.customer_code, c.name AS customer_name
       FROM orders o JOIN customers c ON c.id = o.customer_id
      ORDER BY o.id DESC'
)->fetchAll();

render_header('My Orders', 'orders.php');
?>
<?php if ($flash): ?>
    <div class="alert alert-<?= e($flash['type']) ?>"><?= e($flash['message']) ?></div>
<?php endif; ?>
<h1>Orders</h1>
<p class="muted dev-only">Stored in System 1's own database (<code>tindaorder.orders</code>). Status comes from System 2's response.</p>
<p class="muted cust-only">Tap an order to see its details.</p>
<div class="card">
    <?php if (! $orders): ?>
        <p>No orders yet. <a href="index.php">Place one →</a></p>
    <?php else: ?>
    <table>
        <thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th class="dev-only">HTTP</th><th>Total</th><th>Placed</th></tr></thead>
        <tbody>
        <?php foreach ($orders as $o): ?>
            <tr>
                <td><a href="order.php?id=<?= e(urlencode($o['order_id'])) ?>"><?= e($o['order_id']) ?></a></td>
                <td><?= e($o['customer_code'] . ' — ' . $o['customer_name']) ?></td>
                <td><?= status_badge($o['status']) ?></td>
                <td class="dev-only"><?= e($o['api_http_status'] ?? '—') ?></td>
                <td><?= peso($o['total_amount']) ?></td>
                <td><?= e($o['created_at']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
<?php render_footer();
