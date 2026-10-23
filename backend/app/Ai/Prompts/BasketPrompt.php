<?php

namespace App\Ai\Prompts;

class BasketPrompt
{
    public const VERSION = 'basket-v2';

    /**
     * Builds the text prompt given a catalog array.
     *
     * @param  array<int, array<string, mixed>>  $catalog
     */
    public static function build(array $catalog): string
    {
        // basket-v2: id|name|unit only (fewer prompt tokens). The category is added only to
        // tell apart products that share a name.
        $nameCounts = [];
        foreach ($catalog as $p) {
            $key = mb_strtolower(trim((string) ($p['name'] ?? '')));
            $nameCounts[$key] = ($nameCounts[$key] ?? 0) + 1;
        }

        $catalogLines = [];
        foreach ($catalog as $p) {
            $id = $p['id'] ?? '';
            $name = trim((string) ($p['name'] ?? ''));
            $unit = $p['unit'] ?? ($p['size'] ?? '');
            $line = "{$id}|{$name}|{$unit}";
            $category = $p['category'] ?? ($p['category_name'] ?? '');
            if ($category !== '' && ($nameCounts[mb_strtolower($name)] ?? 0) > 1) {
                $line .= " ({$category})";
            }
            $catalogLines[] = $line;
        }

        $catalogText = implode("\n", $catalogLines);

        return <<<PROMPT
You are a cashier assistant for a Philippine sari-sari store.
List every sellable item in this basket photo and count identical items (include partly visible ones).
Use ONLY a product_id from the catalog below; never invent ids.
If unsure or not in the catalog, put it in `unmatched` with a short label.
box_2d = [ymin, xmin, ymax, xmax], 0–1000, one per item group. confidence 0–1.

Catalog (id|name|unit):
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
