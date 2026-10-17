<?php

namespace App\Http\Controllers;

use App\Ai\AiService;
use App\Http\Resources\AiExperimentCaseResource;
use App\Http\Resources\AiExperimentResource;
use App\Models\AiExperiment;
use App\Models\AiScanImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AiExperimentController extends Controller
{
    public function __construct(
        protected AiService $aiService
    ) {}

    /**
     * Lists all AI research experiments.
     */
    public function index(Request $request): JsonResponse
    {
        $experiments = AiExperiment::withCount('cases')
            ->latest()
            ->get();

        return response()->json([
            'data' => AiExperimentResource::collection($experiments),
        ]);
    }

    /**
     * Creates a new research experiment.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'type' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $experiment = AiExperiment::create([
            'user_id' => $request->user()?->id,
            'name' => $validated['name'],
            'type' => $validated['type'] ?? 'basket_evaluation',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'data' => new AiExperimentResource($experiment),
            'message' => 'Experiment created successfully.',
        ], 201);
    }

    /**
     * Shows an experiment and all recorded test cases.
     */
    public function show(AiExperiment $experiment): JsonResponse
    {
        $experiment->load(['cases' => fn ($q) => $q->orderBy('case_number', 'asc')]);

        return response()->json([
            'data' => new AiExperimentResource($experiment),
        ]);
    }

    /**
     * Runs a test case against the AI model, evaluates against ground truth, and records results.
     */
    public function storeCase(Request $request, AiExperiment $experiment): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file'],
            'ground_truth' => ['required'],
        ]);

        $groundTruth = is_string($request->input('ground_truth'))
            ? json_decode($request->input('ground_truth'), true)
            : $request->input('ground_truth');

        if (! is_array($groundTruth)) {
            $groundTruth = [];
        }

        $imageFile = $request->file('image');
        $imageBytes = file_get_contents($imageFile->getRealPath());
        $mime = $imageFile->getMimeType() ?: 'image/jpeg';
        $sha = hash('sha256', $imageBytes);

        // Store image explicitly for research ground truth evaluation
        $scanImage = AiScanImage::create([
            'image_data' => $imageBytes,
            'mime_type' => $mime,
            'image_size' => strlen($imageBytes),
        ]);

        $start = microtime(true);
        $result = $this->aiService->processBasket($imageFile, $request->user());
        $latencyMs = (int) round((microtime(true) - $start) * 1000);

        $predictedItems = $result['items'] ?? [];

        // Evaluate predictions against ground truth
        $metrics = $this->evaluatePredictions($groundTruth, $predictedItems);

        $nextCaseNum = ($experiment->cases()->max('case_number') ?? 0) + 1;

        $case = $experiment->cases()->create([
            'case_number' => $nextCaseNum,
            'image_id' => $scanImage->id,
            'ground_truth' => $groundTruth,
            'predicted' => $predictedItems,
            'is_correct' => $metrics['is_exact_match'],
            'latency_ms' => $latencyMs,
            'metrics' => $metrics,
        ]);

        return response()->json([
            'data' => new AiExperimentCaseResource($case),
            'message' => 'Experiment case evaluated and recorded.',
        ], 201);
    }

    /**
     * Resets / clears all cases from an experiment.
     */
    public function reset(AiExperiment $experiment): JsonResponse
    {
        $experiment->cases()->delete();

        return response()->json([
            'message' => 'Experiment cases cleared successfully.',
        ]);
    }

    /**
     * Exports experiment cases as a research CSV.
     */
    public function exportCsv(AiExperiment $experiment): Response
    {
        $cases = $experiment->cases()->orderBy('case_number', 'asc')->get();

        $rows = [];
        $rows[] = ['case_number', 'is_correct', 'latency_ms', 'precision', 'recall', 'mae', 'ground_truth_count', 'predicted_count', 'created_at'];

        foreach ($cases as $c) {
            $m = $c->metrics ?? [];
            $rows[] = [
                $c->case_number,
                $c->is_correct ? 1 : 0,
                $c->latency_ms,
                round($m['precision'] ?? 0, 4),
                round($m['recall'] ?? 0, 4),
                round($m['mae'] ?? 0, 4),
                count($c->ground_truth ?? []),
                count($c->predicted ?? []),
                $c->created_at?->toIso8601String(),
            ];
        }

        $fp = fopen('php://temp', 'r+');
        foreach ($rows as $row) {
            fputcsv($fp, $row);
        }
        rewind($fp);
        $csv = stream_get_contents($fp);
        fclose($fp);

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="tindatrack-experiment-'.$experiment->id.'.csv"',
            'Cache-Control' => 'no-cache, private',
        ]);
    }

    /**
     * Evaluates predicted basket items against expected ground truth.
     *
     * @param  array<int, mixed>  $groundTruth
     * @param  array<int, mixed>  $predicted
     * @return array<string, mixed>
     */
    protected function evaluatePredictions(array $groundTruth, array $predicted): array
    {
        $gtMap = [];
        foreach ($groundTruth as $gt) {
            $pId = (int) ($gt['product_id'] ?? $gt['id'] ?? 0);
            $qty = (int) ($gt['quantity'] ?? 1);
            if ($pId > 0) {
                $gtMap[$pId] = ($gtMap[$pId] ?? 0) + $qty;
            }
        }

        $predMap = [];
        foreach ($predicted as $p) {
            $pId = (int) ($p['matched_product_id'] ?? $p['id'] ?? 0);
            $qty = (int) ($p['quantity'] ?? 1);
            if ($pId > 0) {
                $predMap[$pId] = ($predMap[$pId] ?? 0) + $qty;
            }
        }

        $truePositives = 0;
        $totalQtyError = 0;
        $allProductIds = array_unique(array_merge(array_keys($gtMap), array_keys($predMap)));

        foreach ($allProductIds as $pId) {
            $gtQty = $gtMap[$pId] ?? 0;
            $predQty = $predMap[$pId] ?? 0;

            if ($gtQty > 0 && $predQty > 0) {
                $truePositives += min($gtQty, $predQty);
            }
            $totalQtyError += abs($gtQty - $predQty);
        }

        $totalGtQty = array_sum($gtMap);
        $totalPredQty = array_sum($predMap);

        $precision = $totalPredQty > 0 ? ($truePositives / $totalPredQty) : 0;
        $recall = $totalGtQty > 0 ? ($truePositives / $totalGtQty) : 0;
        $mae = count($allProductIds) > 0 ? ($totalQtyError / count($allProductIds)) : 0;
        $isExactMatch = ($totalQtyError === 0 && count($allProductIds) > 0);

        return [
            'precision' => round($precision, 4),
            'recall' => round($recall, 4),
            'mae' => round($mae, 4),
            'is_exact_match' => $isExactMatch,
            'true_positives' => $truePositives,
            'ground_truth_total' => $totalGtQty,
            'predicted_total' => $totalPredQty,
        ];
    }
}
