<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetOtpMail;
use App\Models\AuthToken;
use App\Models\Building;
use App\Models\Notification;
use App\Models\PasswordResetOtp;
use App\Models\User;
use App\Support\FrontendData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with('tenantProfile.flat')->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Invalid email or password'], 422);
        }

        [$plainTextToken, $token] = $this->issueToken($user, $request);

        return response()->json([
            'token' => $plainTextToken,
            'user' => FrontendData::user($user),
            'token_meta' => ['id' => $token->id],
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:admin,owner,tenant,guard'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $building = Building::query()->first() ?? Building::create([
                'name' => 'BSMS Central Building',
                'address' => 'Demo address',
                'plan_tier' => 'premium',
            ]);

            $user = User::create([
                'building_id' => $building->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'role' => $data['role'],
                'is_verified' => false,
                'password' => $data['password'],
            ]);

            Notification::create([
                'user_id' => $user->id,
                'title' => 'Welcome to BSMS',
                'message' => 'Your account has been created successfully.',
                'type' => 'general',
            ]);

            return $user->load('tenantProfile.flat');
        });

        return response()->json([
            'message' => 'Account created successfully.',
            'user' => FrontendData::user($user),
        ], 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => FrontendData::user($request->user()),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30'],
            'emailNotifications' => ['sometimes', 'boolean'],
        ]);

        $attributes = [
            'name' => $data['name'] ?? $user->name,
            'email' => $data['email'] ?? $user->email,
        ];

        if (array_key_exists('phone', $data)) {
            $attributes['phone'] = $data['phone'] ?: null;
        }

        // Keep profile updates working on databases that have not run the new migration yet.
        if (
            array_key_exists('emailNotifications', $data)
            && Schema::hasColumn('users', 'email_notifications_enabled')
        ) {
            $attributes['email_notifications_enabled'] = (bool) $data['emailNotifications'];
        }

        $user->update($attributes);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => FrontendData::user($user->fresh('tenantProfile.flat')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->bearerToken();

        if ($token) {
            AuthToken::where('token_hash', hash('sha256', $token))->delete();
        }

        return response()->json(['message' => 'Logged out']);
    }

    public function requestPasswordResetOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $data['email'])->first();
        $otp = (string) random_int(100000, 999999);

        PasswordResetOtp::updateOrCreate(
            ['email' => $data['email']],
            [
                'otp_hash' => hash('sha256', $otp),
                'reset_token_hash' => null,
                'attempts' => 0,
                'verified_at' => null,
                'expires_at' => now()->addMinutes(10),
            ]
        );

        if ($user && filled($user->email)) {
            Mail::to($user->email)->send(new PasswordResetOtpMail($user, $otp));
        }

        $response = [
            'message' => 'If the email exists, an OTP was sent.',
        ];

        if (config('app.debug')) {
            $response['debugOtp'] = $otp;
        }

        return response()->json($response);
    }

    public function verifyPasswordResetOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
        ]);

        $reset = PasswordResetOtp::where('email', $data['email'])->first();
        if (! $reset) {
            return response()->json(['message' => 'Invalid or expired OTP.'], 422);
        }

        if ($reset->expires_at->isPast()) {
            $reset->delete();
            return response()->json(['message' => 'OTP expired. Request a new one.'], 422);
        }

        if ($reset->attempts >= 5) {
            return response()->json(['message' => 'Too many attempts. Request a new OTP.'], 429);
        }

        if (! hash_equals($reset->otp_hash, hash('sha256', $data['otp']))) {
            $reset->increment('attempts');
            return response()->json(['message' => 'OTP did not match.'], 422);
        }

        $resetToken = Str::random(64);
        $reset->update([
            'verified_at' => now(),
            'reset_token_hash' => hash('sha256', $resetToken),
        ]);

        return response()->json([
            'message' => 'OTP verified successfully.',
            'resetToken' => $resetToken,
        ]);
    }

    public function resetPasswordWithOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'resetToken' => ['required', 'string', 'min:20'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $reset = PasswordResetOtp::where('email', $data['email'])->first();
        if (! $reset || ! $reset->verified_at || $reset->expires_at->isPast()) {
            return response()->json(['message' => 'Verification is missing or expired.'], 422);
        }

        if (! hash_equals((string) $reset->reset_token_hash, hash('sha256', $data['resetToken']))) {
            return response()->json(['message' => 'Invalid reset token.'], 422);
        }

        $user = User::where('email', $data['email'])->first();
        if (! $user) {
            return response()->json(['message' => 'Could not reset password for this user.'], 422);
        }

        $user->update([
            'password' => $data['password'],
        ]);

        AuthToken::where('user_id', $user->id)->delete();
        $reset->delete();

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    private function issueToken(User $user, Request $request): array
    {
        $plainTextToken = Str::random(64);

        $token = AuthToken::create([
            'user_id' => $user->id,
            'name' => 'web',
            'token_hash' => hash('sha256', $plainTextToken),
            'last_used_at' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
        ]);

        return [$plainTextToken, $token];
    }
}
