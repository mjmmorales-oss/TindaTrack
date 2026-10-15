<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'active');
        $search = $request->query('search');
        $today = today();

        $query = User::query()
            ->withCount(['sales as sales_count' => function ($q) {
                $q->where('status', 'completed');
            }])
            ->withSum(['sales as sales_total_today' => function ($q) use ($today) {
                $q->where('status', 'completed')
                    ->whereDate('created_at', $today);
            }], 'total_amount');

        if ($status === 'archived') {
            $query->onlyTrashed();
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        } else {
            // 'active' or default
            $query->where('is_active', true);
        }

        if ($search = trim((string) $search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->get();

        return response()->json([
            'data' => UserResource::collection($users),
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Enforce owner_protected: owner accounts cannot be created through these endpoints
        if ($request->input('role') === 'owner' || $request->input('role') === UserRole::Owner->value) {
            return response()->json([
                'message' => 'Owner accounts cannot be created through staff management.',
                'code' => 'owner_protected',
                'errors' => [
                    'role' => ['Owner accounts cannot be created through staff management.'],
                ],
            ], 422);
        }

        $generatePassword = $request->boolean('generate_password');

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->whereNull('deleted_at')],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['nullable', 'string', 'in:cashier'],
        ];

        if ($generatePassword) {
            $rules['password'] = ['nullable', 'string'];
        } else {
            $rules['password'] = ['required', 'string', Password::min(8)->letters()->numbers()];
        }

        $validated = $request->validate($rules);

        $temporaryPassword = null;
        if ($generatePassword || empty($validated['password'])) {
            $plainPassword = Str::password(12, true, true, false);
            $temporaryPassword = $plainPassword;
            $mustChangePassword = true;
        } else {
            $plainPassword = $validated['password'];
            $mustChangePassword = false;
        }

        $user = User::create([
            'name' => trim($validated['name']),
            'email' => trim($validated['email']),
            'phone' => ! empty($validated['phone']) ? trim($validated['phone']) : null,
            'password' => Hash::make($plainPassword),
            'role' => UserRole::Cashier,
            'is_active' => true,
            'must_change_password' => $mustChangePassword,
        ]);

        $response = [
            'data' => new UserResource($user),
            'message' => 'Staff member created successfully.',
        ];

        if ($temporaryPassword) {
            $response['temporary_password'] = $temporaryPassword;
        }

        return response()->json($response, 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($user->isOwner()) {
            return response()->json([
                'message' => 'Owner accounts cannot be edited through staff management.',
                'code' => 'owner_protected',
                'errors' => [
                    'user' => ['Owner accounts cannot be edited through staff management.'],
                ],
            ], 422);
        }

        if ($user->trashed()) {
            return response()->json([
                'message' => 'Archived staff accounts cannot be edited. Restore the account first.',
                'code' => 'user_archived',
                'errors' => [
                    'user' => ['Archived staff accounts cannot be edited. Restore the account first.'],
                ],
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id)->whereNull('deleted_at'),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $user->update([
            'name' => trim($validated['name']),
            'email' => trim($validated['email']),
            'phone' => isset($validated['phone']) ? trim($validated['phone']) : null,
        ]);

        return response()->json([
            'data' => new UserResource($user),
            'message' => 'Staff member updated successfully.',
        ]);
    }

    public function toggleActive(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();

        if ($user->id === $currentUser->id) {
            return response()->json([
                'message' => 'You cannot deactivate your own account.',
                'code' => 'self_action',
                'errors' => [
                    'user' => ['You cannot deactivate your own account.'],
                ],
            ], 422);
        }

        if ($user->isOwner()) {
            $activeOwnerCount = User::where('role', UserRole::Owner)->where('is_active', true)->whereNull('deleted_at')->count();
            if ($activeOwnerCount <= 1 && $user->is_active) {
                return response()->json([
                    'message' => 'Cannot deactivate the last active store owner.',
                    'code' => 'last_owner',
                    'errors' => [
                        'user' => ['Cannot deactivate the last active store owner.'],
                    ],
                ], 422);
            }

            return response()->json([
                'message' => 'Owner accounts cannot be deactivated through staff management.',
                'code' => 'owner_protected',
                'errors' => [
                    'user' => ['Owner accounts cannot be deactivated through staff management.'],
                ],
            ], 422);
        }

        if ($user->trashed()) {
            return response()->json([
                'message' => 'Archived staff accounts cannot be toggled. Restore the account first.',
                'code' => 'user_archived',
                'errors' => [
                    'user' => ['Archived staff accounts cannot be toggled. Restore the account first.'],
                ],
            ], 422);
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'data' => new UserResource($user),
            'message' => $user->is_active
                ? "Account for {$user->name} has been activated."
                : "Account for {$user->name} has been deactivated and all sessions revoked.",
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();

        if ($user->id === $currentUser->id) {
            return response()->json([
                'message' => 'You cannot reset your own password through this endpoint.',
                'code' => 'self_action',
                'errors' => [
                    'user' => ['You cannot reset your own password through this endpoint.'],
                ],
            ], 422);
        }

        if ($user->isOwner()) {
            return response()->json([
                'message' => 'Owner passwords cannot be reset through staff management.',
                'code' => 'owner_protected',
                'errors' => [
                    'user' => ['Owner passwords cannot be reset through staff management.'],
                ],
            ], 422);
        }

        if ($user->trashed()) {
            return response()->json([
                'message' => 'Archived staff accounts cannot have their password reset. Restore the account first.',
                'code' => 'user_archived',
                'errors' => [
                    'user' => ['Archived staff accounts cannot have their password reset. Restore the account first.'],
                ],
            ], 422);
        }

        $generate = $request->boolean('generate');
        $temporaryPassword = null;

        if ($generate || ! $request->filled('password')) {
            $plainPassword = Str::password(12, true, true, false);
            $temporaryPassword = $plainPassword;
        } else {
            $validated = $request->validate([
                'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
            ]);
            $plainPassword = $validated['password'];
        }

        $user->forceFill([
            'password' => Hash::make($plainPassword),
            'must_change_password' => true,
        ])->save();

        // Revoke all tokens
        $user->tokens()->delete();

        $response = [
            'data' => new UserResource($user),
            'message' => "Password for {$user->name} has been reset and all sessions revoked.",
        ];

        if ($temporaryPassword) {
            $response['temporary_password'] = $temporaryPassword;
        }

        return response()->json($response);
    }

    public function revokeSessions(Request $request, User $user): JsonResponse
    {
        $user->tokens()->delete();
        $user->scannerSessions()->whereNull('ended_at')->update(['ended_at' => now()]);

        return response()->json([
            'data' => new UserResource($user),
            'message' => "All active sessions for {$user->name} have been revoked.",
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();

        if ($user->id === $currentUser->id) {
            return response()->json([
                'message' => 'You cannot archive your own account.',
                'code' => 'self_action',
                'errors' => [
                    'user' => ['You cannot archive your own account.'],
                ],
            ], 422);
        }

        if ($user->isOwner()) {
            $activeOwnerCount = User::where('role', UserRole::Owner)->whereNull('deleted_at')->count();
            if ($activeOwnerCount <= 1) {
                return response()->json([
                    'message' => 'Cannot archive the last active store owner.',
                    'code' => 'last_owner',
                    'errors' => [
                        'user' => ['Cannot archive the last active store owner.'],
                    ],
                ], 422);
            }

            return response()->json([
                'message' => 'Owner accounts cannot be archived.',
                'code' => 'owner_protected',
                'errors' => [
                    'user' => ['Owner accounts cannot be archived.'],
                ],
            ], 422);
        }

        // Revoke tokens and end scanner sessions
        $user->tokens()->delete();
        $user->scannerSessions()->whereNull('ended_at')->update(['ended_at' => now()]);

        $user->delete();

        return response()->json([
            'data' => new UserResource($user),
            'message' => "Account for {$user->name} has been archived.",
        ]);
    }

    public function restore(Request $request, User $user): JsonResponse
    {
        if (! $user->trashed()) {
            return response()->json([
                'data' => new UserResource($user),
                'message' => 'Account is not archived.',
            ]);
        }

        $emailConflict = User::where('email', $user->email)->where('id', '!=', $user->id)->exists();
        if ($emailConflict) {
            return response()->json([
                'message' => 'The email is already in use by an active staff member.',
                'code' => 'email_taken',
                'errors' => [
                    'email' => ['The email is already in use by an active staff member.'],
                ],
            ], 422);
        }

        $user->restore();

        return response()->json([
            'data' => new UserResource($user),
            'message' => "Account for {$user->name} has been restored.",
        ]);
    }
}
