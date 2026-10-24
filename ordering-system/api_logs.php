<?php
require_once __DIR__ . '/includes/orders.php';
require_once __DIR__ . '/includes/layout.php';

$logs = db()->query('SELECT * FROM api_logs ORDER BY id DESC LIMIT 50')->fetchAll();

render_header('Integration Log', 'api_logs.php');
?>
<div class="alert alert-success cust-only">This page is for developers. <a href="<?= e(view_url('developer')) ?>">Switch to Developer view</a> to see every API call.</div>
<h1 class="dev-only">Integration Log</h1>
<p class="muted dev-only">Every request System 1 sent to System 2, with the exact JSON exchanged (latest 50). Stored in <code>tindaorder.api_logs</code>.</p>
<?php if (! $logs): ?>
    <div class="card dev-only"><p>No API calls yet.</p></div>
<?php endif; ?>
<?php foreach ($logs as $l): ?>
    <details class="card log dev-only">
        <summary>
            <span class="method method-<?= e(strtolower($l['method'])) ?>"><?= e($l['method']) ?></span>
            <code><?= e(parse_url($l['endpoint'], PHP_URL_PATH) . (parse_url($l['endpoint'], PHP_URL_QUERY) ? '?' . parse_url($l['endpoint'], PHP_URL_QUERY) : '')) ?></code>
            <span class="http http-<?= e(substr((string) $l['http_status'], 0, 1)) ?>">HTTP <?= e($l['http_status']) ?></span>
            <span class="muted"><?= e($l['duration_ms']) ?> ms · <?= e($l['created_at']) ?><?= $l['order_id'] ? ' · ' . e($l['order_id']) : '' ?></span>
        </summary>
        <div class="exchange">
            <div><h3>Request body</h3><pre><?= e($l['request_body'] ?: '(none — GET request)') ?></pre></div>
            <div><h3>Response body</h3><pre><?= e($l['response_body']) ?></pre></div>
        </div>
    </details>
<?php endforeach; ?>
<?php render_footer();
