<?php

use App\Models\AiExperiment;
use App\Models\AiExperimentCase;
use App\Models\AiScan;
use App\Models\AiScanFeedback;
use App\Models\AiScanImage;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductEmbedding;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;

test('ai_scans and ai_scan_images models and relations function correctly', function () {
    $user = User::factory()->create();

    $scanImage = AiScanImage::factory()->create();

    $scan = AiScan::factory()->create([
        'user_id' => $user->id,
        'image_id' => $scanImage->id,
        'type' => 'basket',
        'status' => 'ok',
        'result' => ['items' => []],
    ]);

    $scanImage->update(['ai_scan_id' => $scan->id]);

    $feedback = AiScanFeedback::factory()->create([
        'ai_scan_id' => $scan->id,
        'action' => 'accepted',
    ]);

    expect($scan->image->id)->toBe($scanImage->id)
        ->and($scan->feedback)->toHaveCount(1)
        ->and($scan->user->id)->toBe($user->id)
        ->and($scanImage->scan->id)->toBe($scan->id);
});

test('product_embeddings relation with product works', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);

    $embedding = ProductEmbedding::factory()->create([
        'product_id' => $product->id,
        'model' => 'clip-vit-base',
        'vector' => [0.123, -0.456, 0.789],
    ]);

    expect($product->embeddings)->toHaveCount(1)
        ->and($product->embeddings->first()->vector)->toBe([0.123, -0.456, 0.789]);
});

test('ai_experiments and cases models work', function () {
    $user = User::factory()->create();
    $experiment = AiExperiment::factory()->create(['user_id' => $user->id]);

    $case = AiExperimentCase::factory()->create([
        'ai_experiment_id' => $experiment->id,
        'case_number' => 1,
        'ground_truth' => [['product_id' => 1, 'quantity' => 2]],
        'is_correct' => true,
    ]);

    expect($experiment->cases)->toHaveCount(1)
        ->and($experiment->cases->first()->is_correct)->toBeTrue();
});

test('settings model casts AI fields properly', function () {
    $setting = Setting::first() ?? Setting::factory()->create();
    $setting->update([
        'ai_enabled' => false,
        'ai_save_scan_images' => true,
        'ai_research_mode' => true,
        'visual_search_enabled' => false,
    ]);

    $fresh = $setting->fresh();
    expect($fresh->ai_enabled)->toBeFalse()
        ->and($fresh->ai_save_scan_images)->toBeTrue()
        ->and($fresh->ai_research_mode)->toBeTrue()
        ->and($fresh->visual_search_enabled)->toBeFalse();
});

test('sale and sale_item timing and add_method fields persist', function () {
    $sale = Sale::factory()->create([
        'cart_started_at' => now()->subSeconds(45),
        'cart_duration_ms' => 45000,
    ]);

    $item = SaleItem::factory()->create([
        'sale_id' => $sale->id,
        'add_method' => 'ai_basket',
    ]);

    expect($sale->cart_duration_ms)->toBe(45000)
        ->and($item->add_method)->toBe('ai_basket');
});

test('ai:prune command deletes scan images older than 30 days', function () {
    // Create an old image (35 days old)
    $oldImage = AiScanImage::factory()->create([
        'created_at' => now()->subDays(35),
    ]);

    // Create a fresh image (2 days old)
    $freshImage = AiScanImage::factory()->create([
        'created_at' => now()->subDays(2),
    ]);

    Artisan::call('ai:prune', ['--days' => 30]);

    expect(AiScanImage::find($oldImage->id))->toBeNull()
        ->and(AiScanImage::find($freshImage->id))->not()->toBeNull();
});
