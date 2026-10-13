<?php

namespace App\Support;

use App\Models\Category;

class CategoryGuesser
{
    /**
     * Cache of category name to ID.
     *
     * @var array<string, int>|null
     */
    protected static ?array $categoryCache = null;

    /**
     * Guesses the matching category ID based on categories tags and product name.
     *
     * @param  array<int, string>  $categoriesTags
     */
    public static function guess(array $categoriesTags, string $productName = ''): ?int
    {
        $tagsText = strtolower(implode(' ', $categoriesTags));
        $nameText = strtolower($productName);
        $haystack = $tagsText.' '.$nameText;

        // Specific rules in order of priority:
        // 1. Drinks / Beverages
        if (self::matches($haystack, ['beverage', 'drink', 'soda', 'juice', 'water', 'tea', 'energy-drink', 'soft-drink', 'cola'])) {
            return self::getCategoryId('Drinks');
        }

        // 2. Coffee & Milk
        if (self::matches($haystack, ['coffee', 'kape', 'milk', 'dairy', 'powdered-milk', 'creamer', 'cocoa', 'latte', 'cappuccino'])) {
            return self::getCategoryId('Coffee & Milk');
        }

        // 3. Instant Noodles
        if (self::matches($haystack, ['instant-noodle', 'noodle', 'ramen', 'pancit', 'mami', 'pasta', 'cup-noodle'])) {
            return self::getCategoryId('Instant Noodles');
        }

        // 4. Canned Goods
        if (self::matches($haystack, ['canned', 'canned-good', 'sardine', 'tuna', 'corned-beef', 'corned beef', 'meat', 'spam', 'liver spread', 'luncheon'])) {
            return self::getCategoryId('Canned Goods');
        }

        // 5. Snacks
        if (self::matches($haystack, ['snack', 'chip', 'biscuit', 'cookie', 'chichirya', 'cracker', 'chocolate', 'candy', 'sweet', 'wafer', 'peanut', 'nut'])) {
            return self::getCategoryId('Snacks');
        }

        // 6. Bread
        if (self::matches($haystack, ['bread', 'bakery', 'pastry', 'bun', 'toast', 'pandesal', 'monay'])) {
            return self::getCategoryId('Bread');
        }

        // 7. Condiments
        if (self::matches($haystack, ['condiment', 'sauce', 'vinegar', 'soy sauce', 'toyo', 'suka', 'patis', 'catsup', 'ketchup', 'seasoning', 'mayonnaise', 'dip'])) {
            return self::getCategoryId('Condiments');
        }

        // 8. Rice & Cooking
        if (self::matches($haystack, ['rice', 'bigas', 'cooking oil', 'oil', 'mantika', 'sugar', 'flour', 'egg', 'grain'])) {
            return self::getCategoryId('Rice & Cooking');
        }

        // 9. Personal Care
        if (self::matches($haystack, ['soap', 'shampoo', 'toothpaste', 'conditioner', 'body wash', 'deodorant', 'personal care', 'sabon', 'hygiene', 'cosmetic', 'lotion'])) {
            return self::getCategoryId('Personal Care');
        }

        // 10. Household
        if (self::matches($haystack, ['household', 'detergent', 'bleach', 'dishwashing', 'cleaner', 'laundry', 'match', 'candle', 'fabric softener', 'disinfectant'])) {
            return self::getCategoryId('Household');
        }

        return null;
    }

    /**
     * Helper to test if any keyword appears in the haystack.
     *
     * @param  array<int, string>  $keywords
     */
    protected static function matches(string $haystack, array $keywords): bool
    {
        foreach ($keywords as $word) {
            if (str_contains($haystack, $word)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Resolves category ID by category name.
     */
    public static function getCategoryId(string $name): ?int
    {
        if (self::$categoryCache === null) {
            try {
                self::$categoryCache = Category::pluck('id', 'name')->all();
            } catch (\Throwable) {
                self::$categoryCache = [
                    'Drinks' => 1,
                    'Coffee & Milk' => 2,
                    'Instant Noodles' => 3,
                    'Canned Goods' => 4,
                    'Snacks' => 5,
                    'Bread' => 6,
                    'Condiments' => 7,
                    'Rice & Cooking' => 8,
                    'Personal Care' => 9,
                    'Household' => 10,
                ];
            }
        }

        return self::$categoryCache[$name] ?? null;
    }
}
