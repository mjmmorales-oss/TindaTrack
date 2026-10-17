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
     * Resets the category cache (useful for testing).
     */
    public static function clearCache(): void
    {
        self::$categoryCache = null;
    }

    /**
     * Guesses the matching category ID based on product name and category tags.
     * Prefers high-confidence matches on product name over broad OFF tags.
     * Returns null when nothing matches confidently.
     *
     * @param  array<int, string>  $categoriesTags
     */
    public static function guess(array $categoriesTags, string $productName = ''): ?int
    {
        $nameText = strtolower(trim($productName));

        // 1. Prefer matches on the product name over broad OFF tags
        if ($nameText !== '') {
            $nameCategory = self::matchName($nameText);
            if ($nameCategory !== null) {
                return self::getCategoryId($nameCategory);
            }
        }

        // 2. Match based on categories tags if name didn't confidently match
        if (! empty($categoriesTags)) {
            $tagsText = strtolower(implode(' ', $categoriesTags));
            $tagCategory = self::matchTags($tagsText);
            if ($tagCategory !== null) {
                return self::getCategoryId($tagCategory);
            }
        }

        return null;
    }

    /**
     * Checks product name against curated keyword and brand patterns.
     */
    protected static function matchName(string $name): ?string
    {
        // Cereals / Biscuits / Crackers / Cookies / Chips / Chocolate / Candy -> Snacks
        if (self::matches($name, [
            'koko krunch', 'coco crunch', 'cereal', 'cereals', 'breakfast cereal', 'corn flakes',
            'cornflakes', 'oats', 'granola', 'muesli', 'froot loops', 'frosties', 'cheerios',
            'skyflakes', 'fita', 'piattos', 'nova', 'chippy', 'oishi', 'roller coaster', 'chichirya',
            'biscuit', 'biscuits', 'cracker', 'crackers', 'cookie', 'cookies', 'chip', 'chips',
            'chocolate', 'chocolates', 'candy', 'candies', 'confectionery', 'wafer', 'wafers',
            'snack', 'snacks', 'peanut', 'peanuts', 'mani', 'cheetos', 'lays', 'doritos', 'pringles',
            'clover chips', 'nagaraya', 'ding dong', 'rebisco', 'hansel', 'oreo', 'chocnut',
        ])) {
            return 'Snacks';
        }

        // Instant Noodles
        if (self::matches($name, [
            'lucky me', 'pancit canton', 'instant noodle', 'instant noodles', 'noodle', 'noodles',
            'ramen', 'mami', 'cup noodle', 'cup noodles', 'yakisoba', 'payless', 'nissin', 'maggi noodle',
            'samyang', 'shin ramyun', 'indomie', 'mi goreng', 'bihon', 'sotanghon', 'spaghetti',
        ])) {
            return 'Instant Noodles';
        }

        // Coffee & Milk / 3-in-1 / powdered milk
        if (self::matches($name, [
            'bear brand', 'nescafe', 'great taste', 'kopiko', 'milo', '3-in-1', '3 in 1', '3in1',
            'coffee', 'kape', 'powdered milk', 'milk drink', 'milk powder', 'creamer', 'dairy',
            'condensed milk', 'evaporated milk', 'latte', 'cappuccino', 'espresso', 'chocomilk',
            'birch tree', 'alaska', 'nido', 'carnation', 'swiss miss', 'ovaltine',
        ])) {
            return 'Coffee & Milk';
        }

        // Drinks / Beverages / Juice drinks / Powdered drinks
        if (self::matches($name, [
            'coca-cola', 'coca cola', 'coke', 'pepsi', 'sprite', 'royal', 'mountain dew', 'mirinda',
            '7up', '7-up', 'rc cola', 'sting', 'cobra', 'red bull', 'monster energy', 'gatorade',
            'pocari', 'c2', 'tang', 'zesto', 'powdered drink', 'juice drink', 'juice', 'juices',
            'soft drink', 'soft drinks', 'softdrink', 'softdrinks', 'soda', 'sodas', 'energy drink',
            'bottled water', 'mineral water', 'iced tea', 'ice tea', 'beverage', 'beverages',
            'del monte juice', 'minute maid', 'smart c', 'san miguel beer', 'red horse',
        ])) {
            return 'Drinks';
        }

        // Canned Goods
        if (self::matches($name, [
            'sardine', 'sardines', 'tuna', 'corned beef', 'corned-beef', 'canned', 'spam', 'meat loaf',
            'meatloaf', 'liver spread', 'luncheon meat', 'vienna sausage', 'maling', 'san marino',
            'century tuna', 'mega sardine', '555', 'ligo', 'argentina', 'purefoods corned',
        ])) {
            return 'Canned Goods';
        }

        // Bread / Pandesal / Buns
        if (self::matches($name, [
            'pandesal', 'pan de sal', 'sliced bread', 'loaf bread', 'monay', 'ensaymada', 'bun',
            'buns', 'bread', 'breads', 'bakery', 'pastry', 'pastries', 'gardenia', 'marby',
        ])) {
            return 'Bread';
        }

        // Condiments
        if (self::matches($name, [
            'vinegar', 'suka', 'soy sauce', 'toyo', 'fish sauce', 'patis', 'catsup', 'ketchup',
            'seasoning', 'magic sarap', 'ajinomoto', 'knorr cube', 'sinigang mix', 'mayonnaise',
            'bagoong', 'silver swan', 'datu puti', 'maggi savor', 'mang tomas', 'ufc',
        ])) {
            return 'Condiments';
        }

        // Rice & Cooking / Cooking oil / Sugar / Salt
        if (self::matches($name, [
            'rice', 'bigas', 'sinandomeng', 'dinorado', 'jasmine rice', 'cooking oil', 'mantika',
            'vegetable oil', 'palm oil', 'canola oil', 'sugar', 'asukal', 'salt', 'asin',
            'flour', 'itlog', 'egg', 'eggs', 'minola', 'golden fiesta',
        ])) {
            return 'Rice & Cooking';
        }

        // Personal Care (Soap / Shampoo / Toothpaste)
        if (self::matches($name, [
            'soap', 'sabon', 'shampoo', 'toothpaste', 'toothbrush', 'conditioner', 'deodorant',
            'body wash', 'safeguard', 'palmolive', 'colgate', 'close up', 'close-up',
            'head & shoulders', 'head and shoulders', 'creamsilk', 'cream silk', 'rejoice',
            'sunsilk', 'pantene', 'rexona', 'axe', 'bioderm', 'protex', 'modess', 'whisper',
        ])) {
            return 'Personal Care';
        }

        // Household (Detergent / Dishwashing)
        if (self::matches($name, [
            'detergent', 'dishwashing', 'bleach', 'fabric softener', 'surf', 'ariel', 'tide',
            'breeze', 'pride', 'champion', 'downy', 'zonrox', 'joy dishwashing', 'joy',
            'axion', 'posporo', 'matches', 'candle', 'kandila',
        ])) {
            return 'Household';
        }

        return null;
    }

    /**
     * Checks OFF category tags.
     */
    protected static function matchTags(string $tags): ?string
    {
        // Cereals & Snacks
        if (self::matches($tags, [
            'breakfast-cereals', 'breakfast-cereal', 'cereals', 'cereal', 'oats', 'granola', 'muesli',
            'snacks', 'biscuits', 'crackers', 'cookies', 'chips', 'crisps',
            'chocolates', 'confectioneries', 'candies', 'wafers',
        ])) {
            return 'Snacks';
        }

        // Instant noodles
        if (self::matches($tags, ['instant-noodles', 'noodles', 'ramen', 'pastas'])) {
            return 'Instant Noodles';
        }

        // Coffee & Milk
        if (self::matches($tags, ['coffees', 'coffee', 'milks', 'milk', 'dairy', 'creamers'])) {
            return 'Coffee & Milk';
        }

        // Drinks
        if (self::matches($tags, [
            'beverages', 'drinks', 'sodas', 'carbonated-drinks', 'fruit-juices',
            'energy-drinks', 'waters', 'iced-teas',
        ])) {
            return 'Drinks';
        }

        // Canned goods
        if (self::matches($tags, ['canned-foods', 'canned-goods', 'canned-fishes', 'canned-meats', 'sardines', 'tunas'])) {
            return 'Canned Goods';
        }

        // Bread
        if (self::matches($tags, ['breads', 'bread', 'buns', 'bakery-products', 'pastries'])) {
            return 'Bread';
        }

        // Condiments
        if (self::matches($tags, ['condiments', 'sauces', 'vinegars', 'soy-sauces', 'spices', 'seasonings'])) {
            return 'Condiments';
        }

        // Rice & Cooking
        if (self::matches($tags, ['rices', 'rice', 'cooking-oils', 'vegetable-oils', 'sugars', 'salts'])) {
            return 'Rice & Cooking';
        }

        // Personal Care
        if (self::matches($tags, ['soaps', 'shampoos', 'dentifrices', 'toothpastes', 'body-care', 'hygiene'])) {
            return 'Personal Care';
        }

        // Household
        if (self::matches($tags, ['detergents', 'cleaning-products', 'laundry', 'dishwashing-products'])) {
            return 'Household';
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
