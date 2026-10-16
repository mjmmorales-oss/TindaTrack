<?php

namespace App\Ai\Prompts;

class BasketPrompt
{
    public const VERSION = 'basket-v1';

    /**
     * Builds the text prompt given a catalog array.
     *
     * @param  array<int, array<string, mixed>>  $catalog
     */
    public static function build(array $catalog): string
    {
        $catalogLines = [];
        foreach ($catalog as $p) {
            $id = $p['id'] ?? '';
            $name = $p['name'] ?? '';
            $size = $p['size'] ?? ($p['unit'] ?? '');
            $category = $p['category'] ?? ($p['category_name'] ?? '');
            $catalogLines[] = "{$id}|{$name}|{$size}|{$category}";
        }

        $catalogText = implode("\n", $catalogLines);

        return <<<PROMPT
You are a cashier assistant for a Philippine sari-sari store.
Identify every sellable item visible in this basket photo.
Count identical items carefully, including partially visible ones.
Match each item ONLY to a product_id from the provided catalog.
If unsure or not in the catalog, put it in `unmatched` with a short label.
Never invent product_ids.
Return `box_2d` as [ymin, xmin, ymax, xmax] normalized 0–1000 for each item group.
confidence is 0–1.

Store Catalog (Format: id|name|size|category):
{$catalogText}
PROMPT;
    }

    /**
     * Returns the Gemini JSON response schema.
     *
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'items' => [
                    'type' => 'ARRAY',
                    'items' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'product_id' => ['type' => 'INTEGER'],
                            'quantity' => ['type' => 'INTEGER'],
                            'confidence' => ['type' => 'NUMBER'],
                            'box_2d' => [
                                'type' => 'ARRAY',
                                'items' => ['type' => 'INTEGER'],
                            ],
                        ],
                        'required' => ['product_id', 'quantity', 'confidence', 'box_2d'],
                    ],
                ],
                'unmatched' => [
                    'type' => 'ARRAY',
                    'items' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'label' => ['type' => 'STRING'],
                            'quantity' => ['type' => 'INTEGER'],
                            'box_2d' => [
                                'type' => 'ARRAY',
                                'items' => ['type' => 'INTEGER'],
                            ],
                        ],
                        'required' => ['label', 'quantity', 'box_2d'],
                    ],
                ],
            ],
            'required' => ['items', 'unmatched'],
        ];
    }
}
