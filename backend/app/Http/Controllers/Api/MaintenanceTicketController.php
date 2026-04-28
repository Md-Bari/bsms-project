<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceTicket;
use App\Models\MaintenanceTicketNote;
use App\Models\Notification;
use App\Models\TenantProfile;
use App\Models\User;
use App\Support\AiOps;
use App\Support\FrontendData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceTicketController extends Controller
{
    public function __construct(private readonly AiOps $ai) {}

    public function index(): JsonResponse
    {
        return response()->json(
            MaintenanceTicket::with(['tenantProfile.user', 'flat', 'notes'])->latest()->get()
                ->map(fn (MaintenanceTicket $ticket) => FrontendData::ticket($ticket))
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['tenant', 'admin'], true), 403);

        $data = $request->validate([
            'tenantId' => ['required', 'integer', 'exists:tenant_profiles,id'],
            'flatId' => ['required', 'integer', 'exists:flats,id'],
            'category' => ['nullable', 'in:electrical,plumbing,carpentry,cleaning,other'],
            'description' => ['required', 'string'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'autoClassify' => ['nullable', 'boolean'],
        ]);

        if ($request->user()->role === 'tenant') {
            $profile = TenantProfile::where('id', $data['tenantId'])->where('user_id', $request->user()->id)->firstOrFail();
            abort_unless($profile->flat_id === (int) $data['flatId'], 403);
        }

        $triage = $this->ai->triageMaintenance($data['description']);
        $autoClassify = $data['autoClassify'] ?? true;

        $category = $autoClassify ? $triage['category'] : ($data['category'] ?? $triage['category']);
        $priority = $autoClassify ? $triage['priority'] : ($data['priority'] ?? $triage['priority']);

        $ticket = MaintenanceTicket::create([
            'ticket_code' => 'TKT-'.str_pad((string) (MaintenanceTicket::count() + 1), 3, '0', STR_PAD_LEFT),
            'tenant_profile_id' => $data['tenantId'],
            'flat_id' => $data['flatId'],
            'category' => $category,
            'description' => $data['description'],
            'priority' => $priority,
            'status' => 'open',
        ]);

        MaintenanceTicketNote::create([
            'maintenance_ticket_id' => $ticket->id,
            'user_id' => null,
            'note' => 'AI first response: '.$triage['firstResponse'],
        ]);

        $ticket->load(['tenantProfile.user', 'flat', 'notes']);
        $this->notifyAdminsAboutTicket($ticket);

        return response()->json(FrontendData::ticket($ticket), 201);
    }

    public function show(MaintenanceTicket $ticket): JsonResponse
    {
        return response()->json(FrontendData::ticket($ticket->load(['tenantProfile.user', 'flat', 'notes'])));
    }

    public function update(Request $request, MaintenanceTicket $ticket): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'status' => ['sometimes', 'in:open,in_progress,resolved'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'description' => ['sometimes', 'string'],
            'category' => ['sometimes', 'in:electrical,plumbing,carpentry,cleaning,other'],
        ]);

        $ticket->update([
            'status' => $data['status'] ?? $ticket->status,
            'priority' => $data['priority'] ?? $ticket->priority,
            'description' => $data['description'] ?? $ticket->description,
            'category' => $data['category'] ?? $ticket->category,
            'resolved_at' => ($data['status'] ?? $ticket->status) === 'resolved' ? now() : null,
        ]);

        return response()->json(FrontendData::ticket($ticket->fresh(['tenantProfile.user', 'flat', 'notes'])));
    }

    public function destroy(Request $request, MaintenanceTicket $ticket): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);
        $ticket->delete();

        return response()->json(['message' => 'Ticket deleted']);
    }

    public function storeNote(Request $request, MaintenanceTicket $ticket): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'note' => ['required', 'string'],
        ]);

        MaintenanceTicketNote::create([
            'maintenance_ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'note' => $data['note'],
        ]);

        return response()->json(FrontendData::ticket($ticket->fresh(['tenantProfile.user', 'flat', 'notes'])));
    }

    private function notifyAdminsAboutTicket(MaintenanceTicket $ticket): void
    {
        $buildingId = $ticket->flat?->building_id ?? $ticket->tenantProfile?->user?->building_id;
        if (! $buildingId) {
            return;
        }

        $admins = User::query()
            ->where('role', 'admin')
            ->where('building_id', $buildingId)
            ->get();

        if ($admins->isEmpty()) {
            return;
        }

        $tenantName = $ticket->tenantProfile?->user?->name ?? 'Tenant';
        $flatNumber = $ticket->flat?->number ?? 'N/A';
        $message = sprintf(
            'New complaint %s from %s (Flat %s) - %s.',
            $ticket->ticket_code,
            $tenantName,
            $flatNumber,
            $ticket->category
        );
        $now = now();

        Notification::insert($admins->map(fn (User $admin) => [
            'user_id' => $admin->id,
            'title' => 'New maintenance complaint',
            'message' => $message,
            'type' => 'maintenance',
            'read' => false,
            'read_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all());
    }
}
