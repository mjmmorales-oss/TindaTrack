<?php
/**
 * TindaOrder (System 1 - Online Ordering System) configuration.
 *
 * TindaOrder has its OWN database ("tindaorder") and talks to
 * TindaTrack (System 2 - Inventory System) only through its REST API.
 */
return [
    'app_name' => 'TindaOrder',

    // System 1's own database (XAMPP MySQL). Separate from TindaTrack's "tindatrack" database.
    'db' => [
        'dsn' => getenv('TINDAORDER_DB_DSN') ?: 'mysql:host=127.0.0.1;port=3306;dbname=tindaorder;charset=utf8mb4',
        'user' => getenv('TINDAORDER_DB_USER') ?: 'root',
        'pass' => getenv('TINDAORDER_DB_PASS') !== false ? getenv('TINDAORDER_DB_PASS') : '',
    ],

    // Connection to System 2 (TindaTrack Inventory Integration API).
    'inventory_api' => [
        // Use 127.0.0.1 (not "localhost") - on Windows "localhost" may try IPv6 first and be slow.
        'base_url' => getenv('TINDATRACK_API_URL') ?: 'http://127.0.0.1:8000/api/integration/v1',
        // MUST be identical to INTEGRATION_API_KEY in TindaTrack's backend/.env
        'api_key' => getenv('TINDATRACK_API_KEY') ?: 'tt_live_cit305_demo_key_change_me',
        'timeout_seconds' => 10,
    ],
];
