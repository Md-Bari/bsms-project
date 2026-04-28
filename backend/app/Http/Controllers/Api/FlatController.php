<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Flat;
use App\Models\User;
use App\Support\FrontendData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FlatController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Flat::with(['owner', 'tenantProfile.user'])->get()->map(fn (Flat $flat) => FrontendData::flat($flat))
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'number' => ['required', 'string', 'max:50'],
            'floor' => ['required', 'integer', 'min:1'],
            'size' => ['nullable', 'string', 'max:50'],
            'ownerId' => ['nullable', 'integer', 'exists:users,id'],
            'ownerName' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:vacant,occupied,maintenance'],
            'monthlyRent' => ['required', 'numeric', 'min:0'],
        ]);

        $ownerId = $data['ownerId'] ?? null;
        if (! $ownerId && ! empty($data['ownerName'])) {
            $ownerId = User::where('name', $data['ownerName'])->where('role', 'owner')->value('id');
        }

        $flat = Flat::create([
            'building_id' => $request->user()->building_id,
            'owner_id' => $ownerId,
            'number' => $data['number'],
            'floor' => $data['floor'],
            'size_sqft' => $this->extractSize($data['size'] ?? null),
            'status' => $data['status'],
            'monthly_rent' => $data['monthlyRent'],
        ])->load(['owner', 'tenantProfile.user']);

        return response()->json(FrontendData::flat($flat), 201);
    }

    public function show(Flat $flat): JsonResponse
    {
        return response()->json(FrontendData::flat($flat->load(['owner', 'tenantProfile.user'])));
    }

    public function update(Request $request, Flat $flat): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $isOwner = $user->role === 'owner' && $flat->owner_id === $user->id;

        abort_unless($isAdmin || $isOwner, 403);

        $data = $request->validate([
            'number' => [$isAdmin ? 'sometimes' : 'prohibited', 'string', 'max:50'],
            'floor' => [$isAdmin ? 'sometimes' : 'prohibited', 'integer', 'min:1'],
            'size' => [$isAdmin ? 'nullable' : 'prohibited', 'string', 'max:50'],
            'ownerId' => [$isAdmin ? 'nullable' : 'prohibited', 'integer', 'exists:users,id'],
            'status' => ['sometimes', 'in:vacant,occupied,maintenance'],
            'monthlyRent' => [$isAdmin ? 'sometimes' : 'prohibited', 'numeric', 'min:0'],
        ]);

        if ($isOwner && isset($data['status'])) {
            abort_unless(in_array($data['status'], ['vacant', 'maintenance'], true), 403);
        }

        DB::transaction(function () use ($flat, $data): void {
            $nextStatus = $data['status'] ?? $flat->status;

            $flat->fill([
                'number' => $data['number'] ?? $flat->number,
                'floor' => $data['floor'] ?? $flat->floor,
                'size_sqft' => array_key_exists('size', $data) ? $this->extractSize($data['size']) : $flat->size_sqft,
                'owner_id' => $data['ownerId'] ?? $flat->owner_id,
                'status' => $nextStatus,
                'monthly_rent' => $data['monthlyRent'] ?? $flat->monthly_rent,
            ])->save();

            if (in_array($nextStatus, ['vacant', 'maintenance'], true)) {
                $flat->tenantProfile?->update([
                    'flat_id' => null,
                    'monthly_rent' => null,
                ]);
            }
        });

        return response()->json(FrontendData::flat($flat->fresh(['owner', 'tenantProfile.user'])));
    }

    public function destroy(Request $request, Flat $flat): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);
        $flat->delete();

        return response()->json(['message' => 'Flat deleted']);
    }

    private function extractSize(?string $size): ?float
    {
        if (! $size) {
            return null;
        }

        return (float) preg_replace('/[^0-9.]/', '', $size);
    }
}
