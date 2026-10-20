<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     */
    public function store(Request $request): JsonResponse
    {
        // Anyone could sign up as a second owner and see/change everything in the single store
        $ownerExists = User::withTrashed()->where('role', UserRole::Owner)->exists();
        if ($ownerExists && ! config('app.allow_owner_registration')) {
            return response()->json([
                'message' => 'Registration is closed. Ask the store owner to create a staff account for you.',
                'code' => 'registration_closed',
            ], 403);
        }

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->string('password')),
            'role' => UserRole::Owner,
            'is_active' => true,
        ]);

        event(new Registered($user));

        $token = $user->createToken('tindatrack-web')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }
}
