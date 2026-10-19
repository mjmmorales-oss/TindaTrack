<?php
/**
 * InventoryApiClient - the integration component of System 1.
 *
 * Every call to System 2 (TindaTrack) goes through this class:
 *   1. Serialize the PHP array to JSON          (serialization)
 *   2. Send it over HTTP with the X-API-Key header (authentication)
 *   3. Decode the JSON response back to an array  (deserialization)
 *   4. Record the full request/response in api_logs (audit + demo evidence)
 */
class InventoryApiClient
{
    private string $baseUrl;
    private string $apiKey;
    private int $timeout;

    public function __construct(array $config)
    {
        $this->baseUrl = rtrim($config['base_url'], '/');
        $this->apiKey = $config['api_key'];
        $this->timeout = (int) $config['timeout_seconds'];
    }

    /** GET /products - catalog with live stock */
    public function getProducts(): array
    {
        return $this->request('GET', '/products');
    }

    /** GET /products/{id}/stock[?format=xml] - Product ID, Available Quantity, Stock Status */
    public function getStock(int $productId, bool $asXml = false): array
    {
        return $this->request('GET', "/products/{$productId}/stock" . ($asXml ? '?format=xml' : ''));
    }

    /** POST /orders - send an order to the inventory system */
    public function createOrder(array $payload): array
    {
        return $this->request('POST', '/orders', $payload, $payload['order_id'] ?? null);
    }

    /** GET /orders/{orderId} - what did the inventory system record for this order? */
    public function getOrder(string $orderId): array
    {
        return $this->request('GET', '/orders/' . rawurlencode($orderId), null, $orderId);
    }

    /**
     * @return array{ok: bool, status: int, data: ?array, raw: string, error: ?string, duration_ms: int}
     */
    private function request(string $method, string $path, ?array $body = null, ?string $orderId = null): array
    {
        $url = $this->baseUrl . $path;
        $requestJson = $body !== null ? json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) : null;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'X-API-Key: ' . $this->apiKey,
                'X-Source-System: TindaOrder',
            ],
        ]);
        if ($requestJson !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $requestJson);
        }

        $started = microtime(true);
        $raw = curl_exec($ch);
        $durationMs = (int) round((microtime(true) - $started) * 1000);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = $raw === false ? curl_error($ch) : null;
        // (No curl_close(): handles are freed automatically since PHP 8.0, and it is deprecated in PHP 8.5.)

        $raw = $raw === false ? '' : (string) $raw;
        $data = json_decode($raw, true);

        $result = [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status, // 0 = could not connect
            'data' => is_array($data) ? $data : null,
            'raw' => $raw,
            'error' => $curlError,
            'duration_ms' => $durationMs,
        ];

        $this->log($method, $url, $requestJson, $result, $orderId);

        return $result;
    }

    private function log(string $method, string $url, ?string $requestJson, array $result, ?string $orderId): void
    {
        try {
            $pretty = $result['data'] !== null
                ? json_encode($result['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
                : ($result['raw'] !== '' ? $result['raw'] : ('(no response) ' . $result['error']));

            db()->prepare(
                'INSERT INTO api_logs (order_id, method, endpoint, request_body, response_body, http_status, duration_ms, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                $orderId, $method, $url, $requestJson, $pretty, $result['status'], $result['duration_ms'], now_str(),
            ]);
        } catch (Throwable $e) {
            // Logging must never break the actual integration call.
        }
    }
}
