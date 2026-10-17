<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;

class SkuGenerator
{
    /**
     * Map of known categories to 3-letter SKU codes matching seeded data.
     */
    protected const CATEGORY_MAP = [
        'drinks' => 'DRK',
        'coffee & milk' => 'COF',
        'coffee and milk' => 'COF',
        'instant noodles' => 'NOO',
        'canned goods' => 'CAN',
        'snacks' => 'SNA',
        'bread' => 'BRD',
        'condiments' => 'CND',
        'rice & cooking' => 'RCE',
        'rice and cooking' => 'RCE',
        'personal care' => 'PER',
        'household' => 'HOU',
    ];

    /**
     * Alternative alias codes accepted (e.g. NDL, PRC, HSH).
     */
    protected const CODE_ALIASES = [
        'NDL' => 'NOO',
        'PRC' => 'PER',
        'HSH' => 'HOU',
    ];

    /**
     * Resolves the 3-letter category code.
     */
    public static function resolveCategoryCode(Category|int|string|null $category = null): string
    {
        if ($category === null) {
            return 'GEN';
        }

        if ($category instanceof Category) {
            if (! empty($category->code)) {
                return strtoupper(substr(trim($category->code), 0, 3));
            }
            $category = $category->name;
        } elseif (is_numeric($category)) {
            $cat = Category::find((int) $category);
            if ($cat) {
                if (! empty($cat->code)) {
                    return strtoupper(substr(trim($cat->code), 0, 3));
                }
                $category = $cat->name;
            } else {
                return 'GEN';
            }
        }

        $str = trim((string) $category);
        if ($str === '') {
            return 'GEN';
        }

        // If it's already an uppercase 3-letter code or known alias
        $upperStr = strtoupper($str);
        if (isset(self::CODE_ALIASES[$upperStr])) {
            return self::CODE_ALIASES[$upperStr];
        }

        if (strlen($upperStr) === 3 && ctype_alpha($upperStr)) {
            // Check if it's directly one of the known codes
            if (in_array($upperStr, self::CATEGORY_MAP, true)) {
                return $upperStr;
            }
        }

        // Look up by normalized name
        $lower = strtolower($str);
        if (isset(self::CATEGORY_MAP[$lower])) {
            return self::CATEGORY_MAP[$lower];
        }

        // Look up by slug
        $slug = Str::slug($str);
        if (isset(self::CATEGORY_MAP[$slug])) {
            return self::CATEGORY_MAP[$slug];
        }

        // For a category not in the map: the first 3 letters of its slug, uppercased.
        $cleanSlug = preg_replace('/[^A-Za-z0-9]/', '', $slug) ?? '';
        if (strlen($cleanSlug) >= 3) {
            return strtoupper(substr($cleanSlug, 0, 3));
        }

        return Str::padRight(strtoupper($cleanSlug), 3, 'X');
    }

    /**
     * Generates a unique SKU formatted as TT-{CAT}-{NNN}.
     */
    public static function generate(Category|int|string|null $category = null, int $offset = 0): string
    {
        $code = self::resolveCategoryCode($category);
        $prefix = 'TT-'.$code;

        // Find highest existing numeric suffix for this prefix
        $existing = Product::where('sku', 'like', $prefix.'-%')->pluck('sku');

        $maxNumber = 0;
        foreach ($existing as $sku) {
            if (preg_match('/^'.preg_quote($prefix, '/').'-(\d+)$/i', $sku, $matches)) {
                $num = (int) $matches[1];
                if ($num > $maxNumber) {
                    $maxNumber = $num;
                }
            }
        }

        $nextNumber = $maxNumber + 1 + $offset;
        $candidate = sprintf('%s-%03d', $prefix, $nextNumber);

        // Guard against collisions in case of gaps or concurrently reserved numbers
        while (Product::where('sku', $candidate)->exists()) {
            $nextNumber++;
            $candidate = sprintf('%s-%03d', $prefix, $nextNumber);
        }

        return $candidate;
    }

    /**
     * Executes product creation within a retry loop on unique SKU constraint collision.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function create(array $attributes, int $maxRetries = 5): Product
    {
        $explicitSku = ! empty($attributes['sku']) ? trim($attributes['sku']) : null;
        $categoryId = $attributes['category_id'] ?? null;

        for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
            try {
                $data = $attributes;
                $data['sku'] = $explicitSku ?: self::generate($categoryId, $attempt);

                return Product::create($data);
            } catch (QueryException $e) {
                // If collision on SKU and retries remain, try next sequence
                if ($explicitSku === null && $attempt < $maxRetries - 1 && self::isDuplicateSkuException($e)) {
                    continue;
                }
                throw $e;
            }
        }

        throw new \RuntimeException('Failed to generate a unique SKU after '.$maxRetries.' attempts.');
    }

    /**
     * Detects if QueryException is caused by a duplicate entry for the sku column.
     */
    public static function isDuplicateSkuException(QueryException $e): bool
    {
        $code = (string) $e->getCode();
        $msg = strtolower($e->getMessage());

        return ($code === '23000' || $code === '1062') && str_contains($msg, 'sku');
    }
}
