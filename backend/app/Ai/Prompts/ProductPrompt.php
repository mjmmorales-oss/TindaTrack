<?php

namespace App\Ai\Prompts;

class ProductPrompt
{
    public const VERSION = 'products-v1';

    /**
     * Builds the text prompt given categories.
     *
     * @param  array<int, array<string, mixed>>  $categories
     */
    public static function build(array $categories): string
    {
        $catLines = [];
        foreach ($categories as $cat) {
            $id = $cat['id'] ?? '';
            $name = $cat['name'] ?? '';
            $catLines[] = "{$id}: {$name}";
        }

        $catsText = implode("\n", $catLines);

        return <<<PROMPT
You are an inventory assistant for a Philippine sari-sari store.
Identify up to 5 DISTINCT products in the image.
If more than 5 distinct products are visible in the photo, set `more_than_five` to true and return the first 5.
For each: name as printed, brand, size/net weight, a suggested category from the provided list (by id), estimated count of units visible, any barcode digits readable on the packaging, `box_2d`, and confidence.
Use Filipino product naming as printed; do not translate brand names.
Return `box_2d` as [ymin, xmin, ymax, xmax] normalized 0–1000.
confidence is 0–1.

Store Categories (Format: id: name):
{$catsText}
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
                'more_than_five' => [
                    'type' => 'BOOLEAN',
                ],
                'products' => [
                    'type' => 'ARRAY',
                    'items' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'name' => ['type' => 'STRING'],
                            'brand' => ['type' => 'STRING'],
                            'size' => ['type' => 'STRING'],
                            'category_id' => ['type' => 'INTEGER'],
                            'estimated_count' => ['type' => 'INTEGER'],
                            'barcode_text' => ['type' => 'STRING'],
                            'confidence' => ['type' => 'NUMBER'],
                            'box_2d' => [
                                'type' => 'ARRAY',
                                'items' => ['type' => 'INTEGER'],
                            ],
                        ],
                        'required' => ['name', 'brand', 'size', 'confidence', 'box_2d'],
                    ],
                ],
            ],
            'required' => ['products'],
        ];
    }
}
