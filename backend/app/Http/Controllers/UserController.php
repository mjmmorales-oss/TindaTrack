<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::orderBy('name')->get();

        return response()->json([
            'data' => UserResource::collection($users),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['nullable', 'string', 'in:cashier,owner'],
        ]);

        $password = ! empty($validated['password']) ? $validated['password'] : 'password123';
        $role = isset($validated['role']) ? UserRole::from($validated['role']) : UserRole::Cashier;

        $user = User::create([
            'name' => trim($validated['name']),
            'email' => trim($validated['email']),
            'password' => Hash::make($password),
            'role' => $role,
            'is_active' => true,
        ]);

        return response()->json([
            'data' => new UserResource($user),
        ], 201);
    }

    public function toggleActive(Request $request, User $user): JsonResponse
    {
        $currentUser = $request->user();

        if ($user->id === $currentUser->id) {
            throw ValidationException::withMessages([
                'user' => ['Hindi mo maaaring i-deactivate ang sarili mong account.'],
            ]);
        }

        // Cannot deactivate the last active owner
        if ($user->isOwner() && $user->is_active) {
            $activeOwnerCount = User::where('role', UserRole::Owner)->where('is_active', true)->count();
            if ($activeOwnerCount <= 1) {
                throw ValidationException::withMessages([
                    'user' => ['Hindi maaaring i-deactivate ang nag-iisang aktibong may-ari ng tindahan.'],
                ]);
            }
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        // If deactivated, revoke all personal access tokens immediately
        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'data' => new UserResource($user),
            'message' => $user->is_active
                ? "Na-activate na ang account ni {$user->name}."
                : "Na-deactivate na ang account ni {$user->name} at pinawalang-bisa ang kanyang mga sesyon.",
        ]);
    }
}
