<?php

use App\Models\Category;
use App\Models\Product;
use App\Support\SkuGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('resolveCategoryCode resolves standard categories correctly', function () {
    expect(SkuGenerator::resolveCategoryCode('Drinks'))->toBe('DRK');
    expect(SkuGenerator::resolveCategoryCode('Coffee & Milk'))->toBe('COF');
    expect(SkuGenerator::resolveCategoryCode('Coffee and Milk'))->toBe('COF');
    expect(SkuGenerator::resolveCategoryCode('Instant Noodles'))->toBe('NOO');
    expect(SkuGenerator::resolveCategoryCode('Canned Goods'))->toBe('CAN');
    expect(SkuGenerator::resolveCategoryCode('Snacks'))->toBe('SNA');
    expect(SkuGenerator::resolveCategoryCode('Bread'))->toBe('BRD');
    expect(SkuGenerator::resolveCategoryCode('Condiments'))->toBe('CND');
    expect(SkuGenerator::resolveCategoryCode('Rice & Cooking'))->toBe('RCE');
    expect(SkuGenerator::resolveCategoryCode('Personal Care'))->toBe('PER');
    expect(SkuGenerator::resolveCategoryCode('Household'))->toBe('HOU');
});

test('resolveCategoryCode supports aliases NDL, PRC, HSH', function () {
    expect(SkuGenerator::resolveCategoryCode('NDL'))->toBe('NOO');
    expect(SkuGenerator::resolveCategoryCode('PRC'))->toBe('PER');
    expect(SkuGenerator::resolveCategoryCode('HSH'))->toBe('HOU');
});

test('resolveCategoryCode falls back to first 3 letters of slug for unmapped categories and GEN for null', function () {
    expect(SkuGenerator::resolveCategoryCode(null))->toBe('GEN');
    expect(SkuGenerator::resolveCategoryCode(''))->toBe('GEN');
    expect(SkuGenerator::resolveCategoryCode('Frozen Goods'))->toBe('FRO');
    expect(SkuGenerator::resolveCategoryCode('School Supplies'))->toBe('SCH');
});

test('resolveCategoryCode extracts code from Category model', function () {
    $category = new Category([
        'name' => 'Custom Category',
        'code' => 'XYZ',
    ]);
    expect(SkuGenerator::resolveCategoryCode($category))->toBe('XYZ');
});

test('generate creates formatted TT-CAT-NNN and increments sequentially', function () {
    $category = Category::factory()->create(['name' => 'Snacks', 'code' => 'SNA']);

    $sku1 = SkuGenerator::generate($category);
    expect($sku1)->toBe('TT-SNA-001');

    Product::factory()->create([
        'category_id' => $category->id,
        'sku' => $sku1,
    ]);

    $sku2 = SkuGenerator::generate($category);
    expect($sku2)->toBe('TT-SNA-002');
});
