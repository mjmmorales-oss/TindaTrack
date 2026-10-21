<?php

use App\Ai\AiService;
use App\Ai\Prompts\BasketPrompt;
use App\Ai\VisionProvider;
use App\Ai\VisionResult;
use App\Http\Controllers\ScannerDeviceController;
use App\Models\AiScan;
use App\Models\Category;
use App\Models\Product;
use App\Models\ScannerEvent;
use App\Models\ScannerSession;
use App\Models\User;
use Illuminate\Http\UploadedFile;

/**
 * v2.3 S1/S3/S4: timing breakdown, slim catalog prompt, phone basket flow.
 */
function fakeVision(array $items = [], array $unmatched = []): VisionProvider
{
    return new class($items, $unmatched) implements VisionProvider
    {
        public array $lastCatalog = [];

        public function __construct(private array $items, private array $unmatched) {}

        public function analyzeBasket(string $imageBytes, string $mime, array $catalog): VisionResult
        {
            $this->lastCatalog = $catalog;

            return new VisionResult(items: $this->items, unmatched: $this->unmatched, raw: [], model: 'gemini-3.5-flash-lite', latencyMs: 1234, promptVersion: BasketPrompt::VERSION);
        }

        public function analyzeNewProducts(string $imageBytes, string $mime, array $categories): VisionResult
        {
            return new VisionResult(items: [], unmatched: [], raw: [], model: 'gemini-3.5-flash-lite', latencyMs: 999, promptVersion: 'products-v1', products: []);
        }

        public function ping(): array
        {
            return ['ok' => true];
        }
    };
}

beforeEach(function () {
    $this->owner = User::factory()->owner()->create();
    $this->ownerAuth = ['Authorization' => 'Bearer '.$this->owner->createToken('t')->plainTextToken];
    $this->product = Product::factory()->create(['category_id' => Category::factory()->create()->id, 'is_active' => true, 'stock_quantity' => 9]);
});

test('basket-v2 catalog lines are id|name|unit; category only for duplicate names', function () {
    $prompt = BasketPrompt::build([
        ['id' => 1, 'name' => 'Coke Mismo', 'unit' => 'bottle', 'category' => 'Drinks'],
        ['id' => 2, 'name' => 'Bear Brand', 'unit' => 'pack', 'category' => 'Coffee & Milk'],
        ['id' => 3, 'name' => 'Bear Brand', 'unit' => 'can', 'category' => 'Canned Goods'],
    ]);

    expect(BasketPrompt::VERSION)->toBe('basket-v2')
        ->and($prompt)->toContain("1|Coke Mismo|bottle\n")
        ->and($prompt)->not->toContain('Drinks')
        ->and($prompt)->toContain('2|Bear Brand|pack (Coffee & Milk)')
        ->and($prompt)->toContain('3|Bear Brand|can (Canned Goods)');
});

test('timing breakdown and model_used are saved; feedback adds upload_ms', function () {
    $this->app->instance(VisionProvider::class, fakeVision([
        ['product_id' => $this->product->id, 'quantity' => 2, 'confidence' => 0.9, 'box_2d' => [1, 1, 5, 5]],
    ]));

    $res = $this->withHeaders($this->ownerAuth)
        ->post('/api/ai/basket-scan', ['image' => UploadedFile::fake()->image('b.jpg', 64, 64)], ['Accept' => 'application/json'])
        ->assertOk();

    $scan = AiScan::findOrFail($res->json('data.scan_id'));
    expect($scan->gemini_ms)->toBe(1234)
        ->and($scan->postprocess_ms)->toBeInt()
        ->and($scan->model_used)->toBe('gemini-3.5-flash-lite')
        ->and($scan->prompt_version)->toBe('basket-v2')
        ->and($res->json('data.timings.gemini_ms'))->toBe(1234);

    $this->withHeaders($this->ownerAuth)->postJson("/api/ai/scans/{$scan->id}/feedback", [
        'upload_ms' => 850,
        'lines' => [['line_type' => 'item', 'action' => 'accepted', 'final_product_id' => $this->product->id, 'final_quantity' => 2]],
    ])->assertSuccessful();
    expect($scan->fresh()->upload_ms)->toBe(850);
});

test('large stores send a focused catalog (photo or recent sale), capped at 400', function () {
    config(['ai.catalog_focus_threshold' => 3]);
    $withPhoto = Product::factory()->create(['category_id' => $this->product->category_id, 'is_active' => true, 'image_url' => '/demo-products/coke.svg']);
    Product::factory()->count(3)->create(['category_id' => $this->product->category_id, 'is_active' => true, 'image_url' => null]);

    $vision = fakeVision();
    $this->app->instance(VisionProvider::class, $vision);
    app(AiService::class)->processBasket(UploadedFile::fake()->image('b.jpg', 64, 64), $this->owner);

    $ids = collect($vision->lastCatalog)->pluck('id');
    expect($ids)->toContain($withPhoto->id)
        ->and($ids->count())->toBeLessThan(Product::where('is_active', true)->count());
});

function pairedSession(User $owner): array
{
    $session = ScannerSession::create([
        'user_id' => $owner->id, 'mode' => 'pos', 'pairing_code' => 'PIPE-TEST',
        'pairing_expires_at' => now()->addMinutes(10), 'device_token_hash' => hash('sha256', 'dev-token'),
        'paired_at' => now(), 'last_seen_at' => now(), 'expires_at' => now()->addHours(8),
    ]);

    return [$session, ['X-Scanner-Token' => 'dev-token', 'Accept' => 'application/json']];
}

test('phone basket: sets basket_pending, carries a small preview, basket-done clears it', function () {
    [$session, $device] = pairedSession($this->owner);
    $this->app->instance(VisionProvider::class, fakeVision([
        ['product_id' => $this->product->id, 'quantity' => 1, 'confidence' => 0.9, 'box_2d' => [1, 1, 5, 5]],
    ]));
    $preview = 'data:image/jpeg;base64,'.base64_encode(str_repeat('x', 2000));

    $this->post('/api/scanner/ai-basket', [
        'image' => UploadedFile::fake()->image('b.jpg', 64, 64),
        'preview_data_url' => $preview,
    ], $device)->assertCreated();

    $event = ScannerEvent::where('scanner_session_id', $session->id)->firstOrFail();
    expect($event->payload['preview_data_url'])->toBe($preview)
        ->and($session->fresh()->basket_pending_at)->not->toBeNull();

    $this->postJson('/api/scanner/heartbeat', [], $device)->assertJsonPath('data.basket_pending', true);

    $this->withHeaders($this->ownerAuth)->postJson("/api/scanner-sessions/{$session->id}/basket-done")->assertOk();
    $this->postJson('/api/scanner/heartbeat', [], $device)->assertJsonPath('data.basket_pending', false);
});

test('an oversized preview is dropped but the event is kept', function () {
    $big = 'data:image/jpeg;base64,'.base64_encode(str_repeat('x', ScannerDeviceController::MAX_PREVIEW_BYTES + 1));

    expect(ScannerDeviceController::acceptablePreview($big))->toBeNull()
        ->and(ScannerDeviceController::acceptablePreview('javascript:alert(1)'))->toBeNull()
        ->and(ScannerDeviceController::acceptablePreview('data:image/png;base64,iVBORw0KGgo='))->not->toBeNull();
});

test('an empty phone result creates no POS event and leaves nothing pending', function () {
    [$session, $device] = pairedSession($this->owner);
    $this->app->instance(VisionProvider::class, fakeVision());

    $this->post('/api/scanner/ai-basket', ['image' => UploadedFile::fake()->image('b.jpg', 64, 64)], $device)
        ->assertCreated()
        ->assertJsonPath('data.empty', true)
        ->assertJsonPath('data.event_id', null);

    expect(ScannerEvent::where('scanner_session_id', $session->id)->count())->toBe(0)
        ->and($session->fresh()->basket_pending_at)->toBeNull();
});

test('basket-done requires the session owner', function () {
    [$session] = pairedSession($this->owner);
    $other = User::factory()->cashier()->create();

    $this->withHeader('Authorization', 'Bearer '.$other->createToken('t')->plainTextToken)
        ->postJson("/api/scanner-sessions/{$session->id}/basket-done")
        ->assertForbidden();
    $this->app['auth']->forgetGuards();
    $this->flushHeaders()->postJson("/api/scanner-sessions/{$session->id}/basket-done")->assertUnauthorized();
});
