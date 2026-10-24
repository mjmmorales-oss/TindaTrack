<?php
require_once __DIR__ . '/includes/orders.php';
require_once __DIR__ . '/includes/layout.php';

$flash = flash();
$customers = db()->query('SELECT * FROM customers ORDER BY customer_code')->fetchAll();

// Integration call #1: GET /products from System 2 (live catalog + stock).
$catalog = inventory_client()->getProducts();
$products = $catalog['ok'] ? ($catalog['data']['data'] ?? []) : [];

render_header('Shop', 'index.php');
?>
<section class="hero">
    <div>
        <h1>Order from Tindahan ni Aling Nena</h1>
        <p class="dev-only">Products and stock below are loaded <strong>live</strong> from the TindaTrack Inventory System through its REST API.</p>
        <p class="cust-only">Your neighborhood sari-sari store, now online. Choose what you need, place your order, and pick it up at the store.</p>
    </div>
    <div class="hero-meta">
        <?php if ($catalog['ok']): ?>
            <span class="pill pill-ok"><span class="dev-only">● Inventory API online</span><span class="cust-only">● Store open · live stock</span></span>
            <small class="dev-only">GET /products · HTTP <?= e($catalog['status']) ?> · <?= e($catalog['duration_ms']) ?> ms · <?= count($products) ?> products</small>
        <?php else: ?>
            <span class="pill pill-bad"><span class="dev-only">● Inventory API unreachable</span><span class="cust-only">● Store system offline</span></span>
            <small class="dev-only">HTTP <?= e($catalog['status']) ?> <?= e($catalog['error'] ?? '') ?></small>
        <?php endif; ?>
    </div>
</section>

<?php if ($flash): ?>
    <div class="alert alert-<?= e($flash['type']) ?>"><?= e($flash['message']) ?></div>
<?php endif; ?>

<?php if (! $catalog['ok']): ?>
    <div class="alert alert-error cust-only">
        <strong>The store's product list is not available right now.</strong> Please try again in a minute.
    </div>
    <div class="alert alert-error dev-only">
        <strong>Cannot load products from TindaTrack.</strong>
        <?= $catalog['status'] === 401 ? 'The API key was rejected (401). Make sure config.php matches INTEGRATION_API_KEY in TindaTrack.' : 'Start TindaTrack first (php artisan serve) and refresh this page.' ?>
    </div>
<?php endif; ?>

<form method="post" action="place_order.php" class="order-form">
    <div class="card customer-card">
        <label for="customer_id"><strong>Customer</strong></label>
        <select name="customer_id" id="customer_id" required>
            <?php foreach ($customers as $c): ?>
                <option value="<?= e($c['id']) ?>"><?= e($c['customer_code'] . ' — ' . $c['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <p class="hint dev-only">Enter a quantity for each product you want, then press <strong>Place Order</strong>. System 2 decides if there is enough stock.</p>
        <p class="hint cust-only">Type how many you want of each item, then press <strong>Place Order</strong>. We will confirm right away if it is in stock.</p>
        <button type="submit" class="btn btn-primary" <?= $catalog['ok'] ? '' : 'disabled' ?>>Place Order →</button>
    </div>

    <div class="grid">
        <?php foreach ($products as $p): ?>
            <div class="card product">
                <div class="cust-only"><?= product_tile($p['name']) ?></div>
                <div class="product-top">
                    <span class="muted dev-only">ID <?= e($p['product_id']) ?> · <?= e($p['sku']) ?></span>
                    <?= status_badge($p['stock_status']) ?>
                </div>
                <h3><?= e($p['name']) ?></h3>
                <div class="price"><?= peso($p['price']) ?> <small>/ <?= e($p['unit']) ?></small></div>
                <div class="muted"><span class="dev-only">Available: </span><span class="cust-only">In store: </span><strong><?= e($p['available_quantity']) ?></strong></div>
                <div class="product-actions">
                    <input type="number" name="qty[<?= e($p['product_id']) ?>]" min="0" step="1" value="0" aria-label="Quantity for <?= e($p['name']) ?>">
                    <a class="link dev-only" href="check_stock.php?product_id=<?= e($p['product_id']) ?>">Check stock</a>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</form>
<?php render_footer();
