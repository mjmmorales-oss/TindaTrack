<?php

namespace App\Http\Controllers;

use App\Actions\RecordPaymentAction;
use App\Http\Resources\UtangPaymentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UtangPaymentController extends Controller
{
    public function store(Request $request, RecordPaymentAction $action): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $payment = $action->execute(
            recorder: $request->user(),
            customerId: (int) $validated['customer_id'],
            amount: (float) $validated['amount'],
            paymentDate: $validated['payment_date'] ?? null,
            notes: $validated['notes'] ?? null
        );

        return response()->json([
            'data' => new UtangPaymentResource($payment),
            'message' => 'Matagumpay na naitala ang bayad ng utang.',
        ], 201);
    }
}
