<?php
/**
 * Handles "Place Order":
 *   1. Validate the form (System 1's own checks)
 *   2. Save the order in System 1's database as PENDING
 *   3. Send JSON to System 2 (POST /orders) and store the response
 *   4. Show the result
 */
require_once __DIR__ . '/includes/orders.php';
require_once __DIR__ . '/includes/layout.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

// 1. Validate
$customerId = (int) ($_POST['customer_id'] ?? 0);
$stmt = db()->prepare('SELECT * FROM customers WHERE id = ?');
$stmt->execute([$customerId]);
$customer = $stmt->fetch();

$lines = [];
foreach ((array) ($_POST['qty'] ?? []) as $productId => $qty) {
    if ($qty === '' || (int) $qty === 0) {
        continue;
    }
    if (! ctype_digit((string) $productId) || filter_var($qty, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
        flash('error', 'Quantities must be whole numbers of 1 or more.');
        header('Location: index.php');
        exit;
    }
    $lines[] = ['product_id' => (int) $productId, 'quantity' => (int) $qty];
}

if (! $customer) {
    flash('error', 'Please choose a valid customer.');
    header('Location: index.php');
    exit;
}
if (! $lines) {
    flash('error', 'Your order is empty. Enter a quantity for at least one product.');
    header('Location: index.php');
    exit;
}

// 2. Save as PENDING in System 1's own database
$pdo = db();
$pdo->beginTransaction();
$orderId = generate_order_id();
$pdo->prepare('INSERT INTO orders (order_id, customer_id, status, total_amount, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)')
    ->execute([$orderId, $customer['id'], 'pending', now_str(), now_str()]);
$orderPk = (int) $pdo->lastInsertId();
foreach ($lines as $line) {
    $pdo->prepare('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)')
        ->execute([$orderPk, $line['product_id'], $line['quantity']]);
}
$pdo->commit();

// 3. Integration call: POST /orders to System 2
$outcome = send_order_to_inventory($orderId);

// 4. Show the result
flash($outcome['status'] === 'confirmed' ? 'success' : 'error', $outcome['message']);
header('Location: order.php?id=' . urlencode($orderId));
