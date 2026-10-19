<?php
function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function peso($amount): string
{
    return '₱' . number_format((float) $amount, 2);
}

function render_header(string $title, string $active = ''): void
{
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
<body>
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
                <a href="<?= e($href) ?>" class="<?= $active === $href ? 'active' : '' ?>"><?= e($label) ?></a>
            <?php endforeach; ?>
        </nav>
    </div>
</header>
<div class="integration-strip">
    <div class="wrap">Connected to <strong>System 2 · TindaTrack Inventory API</strong> at <code><?= e($api) ?></code> · REST + JSON · X-API-Key</div>
</div>
<main class="wrap">
    <?php
}

function render_footer(): void
{
    ?>
</main>
<footer class="wrap footer">TindaOrder — CIT 305 Systems Integration Project · Orders are stored in the <code>tindaorder</code> database; stock lives in TindaTrack.</footer>
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
