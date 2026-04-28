<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\MaintenanceTicket;
use App\Models\Payment;
use App\Models\Visitor;
use App\Support\AiOps;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(private readonly AiOps $ai) {}

    public function maintenanceTriage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'description' => ['required', 'string', 'min:5'],
        ]);

        return response()->json($this->ai->triageMaintenance($data['description']));
    }

    public function announcementDraft(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'note' => ['required', 'string', 'min:5'],
            'targetRole' => ['nullable', 'in:all,tenant,owner,guard'],
        ]);

        return response()->json($this->ai->announcementDraft($data['note'], $data['targetRole'] ?? 'all'));
    }

    public function tenantAssistant(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'tenant', 403);

        $data = $request->validate([
            'question' => ['required', 'string', 'min:2', 'max:1000'],
            'stats' => ['nullable', 'array'],
        ]);

        $flat = $request->user()->tenantProfile?->flat;
        $stats = $this->ai->dashboardStatsForTenant($data['stats'] ?? []);

        return response()->json($this->ai->tenantAssistant($data['question'], $flat, $stats));
    }

    public function paymentReminder(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'paymentId' => ['required', 'integer', 'exists:payments,id'],
            'tone' => ['nullable', 'in:professional,friendly,urgent'],
        ]);

        $payment = Payment::with(['tenantProfile.user', 'flat'])->findOrFail($data['paymentId']);
        return response()->json($this->ai->paymentReminder($payment, $data['tone'] ?? 'professional'));
    }

    public function reportInsights(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'dateFrom' => ['nullable', 'date'],
            'dateTo' => ['nullable', 'date'],
        ]);

        $from = $data['dateFrom'] ?? now()->subMonth()->toDateString();
        $to = $data['dateTo'] ?? now()->toDateString();

        $metrics = [
            'paidCount' => Payment::whereBetween('paid_at', [$from, $to])->where('status', 'paid')->count(),
            'overdueCount' => Payment::where('status', 'overdue')->count(),
            'openTickets' => MaintenanceTicket::whereIn('status', ['open', 'in_progress'])->count(),
            'visitorCount' => Visitor::whereBetween('created_at', [$from, $to])->count(),
        ];

        return response()->json($this->ai->reportInsights($metrics));
    }

    public function visitorAnomalies(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['admin', 'guard'], true), 403);

        $data = $request->validate([
            'dateFrom' => ['nullable', 'date'],
            'dateTo' => ['nullable', 'date'],
        ]);

        $query = Visitor::query();
        if (! empty($data['dateFrom']) && ! empty($data['dateTo'])) {
            $query->whereBetween('created_at', [$data['dateFrom'], $data['dateTo']]);
        }

        return response()->json($this->ai->visitorAnomalies($query->latest()->limit(1000)->get()));
    }

    public function improveEmailTemplate(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'kind' => ['required', 'in:announcement,payment_received,ticket_update'],
            'context' => ['nullable', 'array'],
        ]);

        return response()->json($this->ai->improveEmailTemplate($data['kind'], $data['context'] ?? []));
    }
}

