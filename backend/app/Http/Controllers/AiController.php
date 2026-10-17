<?php

namespace App\Http\Controllers;

use App\Ai\AiMetricsService;
use App\Ai\AiService;
use App\Ai\Exceptions\AiDisabledException;
use App\Http\Resources\AiScanResource;
use App\Models\AiScan;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AiController extends Controller
{
    public function __construct(
        protected AiService $aiService,
        protected AiMetricsService $metricsService
    ) {}

    /**
     * Operational status of AI features, provider, and remaining quotas.
     */
    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->aiService->getStatus($request->user()),
        ]);
    }

    /**
     * Analyzes basket photo, matching items against active catalog.
     */
    public function basketScan(Request $request): JsonResponse
    {
        $this->ensureAiEnabled();

        $request->validate([
            'image' => ['required', 'file'],
        ]);

        $result = $this->aiService->processBasket(
            $request->file('image'),
            $request->user()
        );

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Analyzes new intake product photo for bulk add.
     */
    public function productScan(Request $request): JsonResponse
    {
        $this->ensureAiEnabled();

        $request->validate([
            'image' => ['required', 'file'],
        ]);

        $result = $this->aiService->processNewProducts(
            $request->file('image'),
            $request->user()
        );

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Records cashier/owner feedback on AI scan suggestions.
     */
    public function feedback(Request $request, AiScan $scan): JsonResponse
    {
        $this->ensureAiEnabled();

        // Cashiers can only submit feedback for scans they initiated
        $user = $request->user();
        if ($user && $user->role?->value !== 'owner' && $scan->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized action.'], 403);
        }

        $validated = $request->validate([
            'lines' => ['required', 'array'],
            'lines.*.line_type' => ['required', 'in:item,unmatched,missed'],
            'lines.*.suggested_product_id' => ['nullable', 'integer'],
            'lines.*.suggested_quantity' => ['nullable', 'integer', 'min:0'],
            'lines.*.confidence' => ['nullable', 'numeric'],
            'lines.*.final_product_id' => ['nullable', 'integer'],
            'lines.*.final_quantity' => ['nullable', 'integer', 'min:0'],
            'lines.*.action' => ['required', 'in:accepted,qty_changed,product_changed,removed,added_manually'],
        ]);

        // Idempotent: delete prior feedback for this scan
        $scan->feedback()->delete();

        foreach ($validated['lines'] as $line) {
            $scan->feedback()->create([
                'line_type' => $line['line_type'],
                'suggested_product_id' => $line['suggested_product_id'] ?? null,
                'suggested_quantity' => $line['suggested_quantity'] ?? null,
                'confidence' => $line['confidence'] ?? null,
                'final_product_id' => $line['final_product_id'] ?? null,
                'final_quantity' => $line['final_quantity'] ?? null,
                'action' => $line['action'],
            ]);
        }

        return response()->json([
            'message' => 'Feedback recorded successfully.',
        ]);
    }

    /**
     * Paginated list of AI scans with filters.
     */
    public function indexScans(Request $request): JsonResponse
    {
        $query = AiScan::with(['user', 'feedback'])->latest();

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', Carbon::parse($request->query('from'))->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', Carbon::parse($request->query('to'))->endOfDay());
        }

        $perPage = min(100, max(5, (int) $request->query('per_page', 15)));
        $scans = $query->paginate($perPage);

        return response()->json([
            'data' => AiScanResource::collection($scans),
            'meta' => [
                'current_page' => $scans->currentPage(),
                'last_page' => $scans->lastPage(),
                'per_page' => $scans->perPage(),
                'total' => $scans->total(),
            ],
        ]);
    }

    /**
     * Streams saved scan image bytes.
     */
    public function showImage(Request $request, AiScan $scan): Response
    {
        $image = $scan->image;
        if (! $image || empty($image->image_data)) {
            return response()->json(['message' => 'Image not found or was not saved.'], 404);
        }

        return response($image->image_data, 200, [
            'Content-Type' => $image->mime_type,
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /**
     * Aggregated research metrics for the AI Lab.
     */
    public function metrics(Request $request): JsonResponse
    {
        $from = $request->query('from');
        $to = $request->query('to');
        $type = $request->query('type');

        $metrics = $this->metricsService->computeMetrics($from, $to, $type);

        return response()->json([
            'data' => $metrics,
        ]);
    }

    /**
     * Exports scans, feedback, and checkout timing data as CSV.
     */
    public function exportCsv(Request $request): Response
    {
        $from = $request->query('from');
        $to = $request->query('to');

        $csv = $this->metricsService->exportCsv($from, $to);

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="tindatrack-ai-metrics.csv"',
            'Cache-Control' => 'no-cache, private',
        ]);
    }

    /**
     * Ensures AI features are enabled store-wide.
     */
    protected function ensureAiEnabled(): void
    {
        if (! $this->aiService->isAiEnabled()) {
            throw new AiDisabledException('AI features are disabled in store settings.');
        }
    }
}
