<?php
date_default_timezone_set('Asia/Manila');

/**
 * Returns a shared PDO connection to System 1's own database.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $cfg = app_config()['db'];
        $pdo = new PDO($cfg['dsn'], $cfg['user'], $cfg['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    return $pdo;
}

function app_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/../config.php';
    }

    return $config;
}

function now_str(): string
{
    return date('Y-m-d H:i:s');
}
