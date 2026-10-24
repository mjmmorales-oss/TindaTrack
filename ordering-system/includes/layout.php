<?php
function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function peso($amount): string
{
    return '₱' . number_format((float) $amount, 2);
}

/**
 * Two ways to look at the same System 1 pages:
 *  - customer  : what a shopper sees (clean shop, friendly messages)
 *  - developer : the same pages plus the integration evidence (JSON, HTTP codes, API log)
 * Chosen with ?view=customer|developer and remembered in a cookie. Default: developer.
 */
function current_view(): string
{
    static $view = null;
    if ($view !== null) {
        return $view;
    }
    $requested = $_GET['view'] ?? null;
    if (in_array($requested, ['customer', 'developer'], true)) {
        $view = $requested;
        if (! headers_sent()) {
            setcookie('to_view', $view, ['expires' => time() + 60 * 60 * 24 * 30, 'path' => '/', 'samesite' => 'Lax']);
        }
    } else {
        $view = in_array($_COOKIE['to_view'] ?? '', ['customer', 'developer'], true) ? $_COOKIE['to_view'] : 'developer';
    }

    return $view;
}

function is_customer_view(): bool
{
    return current_view() === 'customer';
}

/** Current page URL with ?view= switched, keeping the other query parameters. */
function view_url(string $view): string
{
    $params = array_merge($_GET, ['view' => $view]);

    return basename($_SERVER['SCRIPT_NAME'] ?? 'index.php') . '?' . http_build_query($params);
}

/** Two-letter tile used as a product picture in the customer view. */
function product_tile(string $name): string
{
    $words = preg_split('/\s+/', trim($name)) ?: [];
    $initials = strtoupper(mb_substr($words[0] ?? '?', 0, 1) . mb_substr($words[1] ?? '', 0, 1));
    $hue = crc32($name) % 360;

    return '<div class="thumb" style="--hue:' . $hue . '">' . e($initials) . '</div>';
}

function render_header(string $title, string $active = ''): void
{
    $view = current_view();
    $nav = [
        'index.php' => 'Shop',
        'orders.php' => 'My Orders',
        'api_logs.php' => 'Integration Log',
    ];
    $api = app_config()['inventory_api']['base_url'];
    ?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($title) ?> · TindaOrder</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body class="view-<?= e($view) ?>">
<header class="topbar">
    <div class="wrap topbar-inner">
        <a class="brand" href="index.php">
            <span class="brand-mark">TO</span>
            <span>
                <strong>TindaOrder</strong>
                <small>System 1 · Online Ordering System</small>
            </span>
        </a>
        <nav>
            <?php foreach ($nav as $href => $label): ?>
                <a href="<?= e($href) ?>" class="<?= $active === $href ? 'active' : '' ?><?= $href === 'api_logs.php' ? ' dev-only' : '' ?>"><?= e($label) ?></a>
            <?php endforeach; ?>
        </nav>
        <div class="view-switch" role="group" aria-label="Choose view">
            <a href="<?= e(view_url('customer')) ?>" class="<?= $view === 'customer' ? 'on' : '' ?>" aria-pressed="<?= $view === 'customer' ? 'true' : 'false' ?>">Customer view</a>
            <a href="<?= e(view_url('developer')) ?>" class="<?= $view === 'developer' ? 'on' : '' ?>" aria-pressed="<?= $view === 'developer' ? 'true' : 'false' ?>">Developer view</a>
        </div>
    </div>
</header>
<div class="integration-strip dev-only">
    <div class="wrap">Developer view · Connected to <strong>System 2 · TindaTrack Inventory API</strong> at <code><?= e($api) ?></code> · REST + JSON · X-API-Key</div>
</div>
<main class="wrap">
    <?php
}

function render_footer(): void
{
    ?>
</main>
<footer class="wrap footer">
    <span class="dev-only">TindaOrder — CIT 305 Systems Integration Project · Orders are stored in the <code>tindaorder</code> database; stock lives in TindaTrack.</span>
    <span class="cust-only">Tindahan ni Aling Nena · Order online, pick up at the store · Prices and stock are updated live.</span>
</footer>
</body>
</html>
    <?php
}

function flash(?string $type = null, ?string $message = null): ?array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    if ($type !== null) {
        $_SESSION['flash'] = ['type' => $type, 'message' => $message];

        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);

    return $f;
}
