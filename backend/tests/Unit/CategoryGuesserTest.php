<?php

use App\Models\Category;
use App\Support\CategoryGuesser;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    CategoryGuesser::clearCache();
});

test('guesses Koko Krunch cereal as Snacks', function () {
    $categoryId = CategoryGuesser::guess(['en:plant-based-foods-and-beverages'], 'Koko Krunch Mini 30g');
    $category = Category::find($categoryId);

    expect($category)->not->toBeNull();
    expect($category->name)->toBe('Snacks');
});

test('guesses Skyflakes crackers as Snacks', function () {
    $categoryId = CategoryGuesser::guess([], 'M.Y. San Skyflakes Crackers 250g');
    $category = Category::find($categoryId);

    expect($category)->not->toBeNull();
    expect($category->name)->toBe('Snacks');
});

test('guesses Bear Brand powdered milk as Coffee & Milk', function () {
    $categoryId = CategoryGuesser::guess(['en:dairy'], 'Bear Brand Fortified Powdered Milk Drink 33g');
    $category = Category::find($categoryId);

    expect($category)->not->toBeNull();
    expect($category->name)->toBe('Coffee & Milk');
});

test('guesses Lucky Me Pancit Canton as Instant Noodles', function () {
    $categoryId = CategoryGuesser::guess([], 'Lucky Me Pancit Canton Kalamansi 60g');
    $category = Category::find($categoryId);

    expect($category)->not->toBeNull();
    expect($category->name)->toBe('Instant Noodles');
});

test('guesses Safeguard soap as Personal Care', function () {
    $categoryId = CategoryGuesser::guess([], 'Safeguard Pure White Soap 130g');
    $category = Category::find($categoryId);

    expect($category)->not->toBeNull();
    expect($category->name)->toBe('Personal Care');
});

test('guesses Surf detergent as Household', function () {
    $categoryId = CategoryGuesser::guess([], 'Surf Blossom Fresh Detergent Powder 65g');
    $category = Category::find($categoryId);

    expect($category)->not->toBeNull();
    expect($category->name)->toBe('Household');
});

test('guesses from OFF tags when product name is generic', function () {
    $categoryId = CategoryGuesser::guess(['en:breakfast-cereals'], 'Generic Crunchy Rings');
    $category = Category::find($categoryId);

    expect($category)->not->toBeNull();
    expect($category->name)->toBe('Snacks');
});

test('returns null when product name and tags have no confident match', function () {
    $categoryId = CategoryGuesser::guess([], 'Unknown Non-Food Hardware Screw');
    expect($categoryId)->toBeNull();
});
