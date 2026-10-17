<?php

namespace App\Ai;

class VisionResult
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<int, array<string, mixed>>  $unmatched
     * @param  array<int, array<string, mixed>>  $products
     */
    public function __construct(
        public array $items = [],
        public array $unmatched = [],
        public mixed $raw = null,
        public string $model = '',
        public int $latencyMs = 0,
        public string $promptVersion = '',
        public array $products = []
    ) {}

    /**
     * Convert to an array representation.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'items' => $this->items,
            'unmatched' => $this->unmatched,
            'products' => $this->products,
            'raw' => $this->raw,
            'model' => $this->model,
            'latency_ms' => $this->latencyMs,
            'prompt_version' => $this->promptVersion,
        ];
    }
}
