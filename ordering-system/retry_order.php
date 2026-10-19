<?php
/**
 * Re-sends a PENDING/FAILED order with the SAME order_id.
 * Safe because System 2 is idempotent: it will never deduct stock twice for one order_id.
 */
require_once __DIR__ . '/includes/orders.php';
require_once __DIR__ . '/includes/layout.php';

$orderId = (string) ($_POST['order_id'] ?? '');
$order = $orderId !== '' ? find_order($orderId) : null;

if (! $order || ! in_array($order['status'], ['pending', 'failed'], true)) {
    flash('error', 'Only pending or failed orders can be retried.');
    header('Location: orders.php');
    exit;
}

$outcome = send_order_to_inventory($orderId);
flash($outcome['status'] === 'confirmed' ? 'success' : 'error', $outcome['message']);
header('Location: order.php?id=' . urlencode($orderId));
