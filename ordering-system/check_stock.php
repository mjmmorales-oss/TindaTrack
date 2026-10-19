<?php
/**
 * Calls GET /products/{id}/stock twice: once as JSON, once as XML,
 * to show both data formats returned by System 2.
 */
require_once __DIR__ . '/includes/orders.php';
require_once __DIR__ . '/includes/layout.php';

$productId = (int) ($_GET['product_id'] ?? 0);
$json = inventory_client()->getStock($productId);
$xml = inventory_client()->getStock($productId, true);

// Deserialize the XML response too (proves System 1 can read both formats).
$parsedXml = null;
if ($xml['status'] === 200 && $xml['raw'] !== '') {
    $parsedXml = @simplexml_load_string($xml['raw']) ?: null;
}

render_header('Stock check', 'index.php');
?>
<p><a href="index.php">← Back to shop</a></p>
<h1>Stock check · Product <?= e($productId) ?></h1>

<?php if ($json['ok']): ?>
    <div class="card stock-summary">
        <div><span class="muted">Product ID</span><strong><?= e($json['data']['product_id']) ?></strong></div>
        <div><span class="muted">Product</span><strong><?= e($json['data']['product_name']) ?></strong></div>
        <div><span class="muted">Available quantity</span><strong><?= e($json['data']['available_quantity']) ?></strong></div>
        <div><span class="muted">Stock status</span><?= status_badge($json['data']['stock_status']) ?></div>
    </div>
<?php else: ?>
    <div class="alert alert-error"><?= e($json['data']['message'] ?? ('HTTP ' . $json['status'] . ' ' . ($json['error'] ?? ''))) ?></div>
<?php endif; ?>

<div class="exchange">
    <div class="card">
        <h2>JSON response</h2>
        <p class="mono">GET /products/<?= e($productId) ?>/stock · HTTP <?= e($json['status']) ?></p>
        <pre><?= e($json['data'] ? json_encode($json['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) : $json['raw']) ?></pre>
    </div>
    <div class="card">
        <h2>XML response</h2>
        <p class="mono">GET /products/<?= e($productId) ?>/stock?format=xml · HTTP <?= e($xml['status']) ?></p>
        <pre><?= e($xml['raw'] !== '' ? preg_replace('/></', ">\n<", $xml['raw']) : '(no response)') ?></pre>
        <?php if ($parsedXml): ?>
            <p class="muted">Parsed by System 1: AvailableQuantity = <strong><?= e((string) $parsedXml->AvailableQuantity) ?></strong>, StockStatus = <strong><?= e((string) $parsedXml->StockStatus) ?></strong></p>
        <?php endif; ?>
    </div>
</div>
<?php render_footer();
