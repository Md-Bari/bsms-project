<?php

namespace App\Support;

use App\Models\Flat;
use App\Models\MaintenanceTicket;
use App\Models\Payment;
use App\Models\Visitor;
use Carbon\Carbon;
use Illuminate\Support\Str;

class AiOps
{
    public function triageMaintenance(string $description): array
    {
        $text = Str::lower($description);

        $category = 'other';
        $priority = 'medium';
        $confidence = 0.62;

        if (preg_match('/(water|pipe|leak|sink|drain|tap|toilet|bathroom|plumb)/', $text)) {
            $category = 'plumbing';
            $confidence = 0.88;
        } elseif (preg_match('/(electric|socket|switch|power|light|fan|circuit|wire|ac )/', $text)) {
            $category = 'electrical';
            $confidence = 0.86;
        } elseif (preg_match('/(door|window|wood|cabinet|hinge|lock|furniture|carpent)/', $text)) {
            $category = 'carpentry';
            $confidence = 0.8;
        } elseif (preg_match('/(clean|garbage|trash|dust|odor|smell|dirty)/', $text)) {
            $category = 'cleaning';
            $confidence = 0.76;
        }

        if (preg_match('/(urgent|emergency|sparking|shock|flood|burst|fire|danger|unsafe)/', $text)) {
            $priority = 'high';
        } elseif (preg_match('/(minor|small|whenever|later|not urgent)/', $text)) {
            $priority = 'low';
        }

        $firstResponse = match ($priority) {
            'high' => 'We marked this as high priority and informed the maintenance team to attend urgently. Please avoid using the affected area until support arrives.',
            'low' => 'Thanks for reporting this. We logged your request and will schedule it in the next maintenance run.',
            default => 'Thanks for reporting this issue. We logged your request and assigned it to the maintenance team for follow-up.',
        };

        return [
            'category' => $category,
            'priority' => $priority,
            'confidence' => $confidence,
            'firstResponse' => $firstResponse,
        ];
    }

    public function announcementDraft(string $note, string $targetRole = 'all'): array
    {
        $clean = trim(preg_replace('/\s+/', ' ', $note));
        $firstLine = Str::limit($clean, 90, '');
        $title = Str::title(Str::limit($firstLine, 44, '...'));

        $audience = match ($targetRole) {
            'tenant' => 'tenants',
            'owner' => 'flat owners',
            'guard' => 'security guards',
            default => 'all residents',
        };

        $contentEnglish = "Dear {$audience},\n\n{$clean}\n\nPlease follow the guidance above and contact BSMS support if you need help.";
        $contentBangla = "প্রিয় {$audience},\n\n{$clean}\n\nউপরের নির্দেশনা অনুসরণ করুন এবং প্রয়োজনে BSMS সাপোর্টে যোগাযোগ করুন।";

        return [
            'title' => $title !== '' ? $title : 'Important Notice',
            'contentEnglish' => $contentEnglish,
            'contentBangla' => $contentBangla,
            'combined' => $contentEnglish."\n\n---\n\n".$contentBangla,
        ];
    }

    public function tenantAssistant(string $question, ?Flat $flat, array $stats): array
    {
        $q = Str::lower($question);
        $answer = 'I can help with payments, maintenance tickets, visitor entries, and announcements.';
        $actions = [];

        if (str_contains($q, 'pay') || str_contains($q, 'due') || str_contains($q, 'invoice')) {
            $answer = 'Open Payments to clear pending invoices first. Pay rent to the owner and service charges to admin.';
            $actions[] = ['label' => 'Open Payments', 'path' => '/tenant/payments'];
        } elseif (str_contains($q, 'maintenance') || str_contains($q, 'repair') || str_contains($q, 'broken')) {
            $answer = 'Submit a maintenance ticket with clear issue details. The team will prioritize it based on urgency.';
            $actions[] = ['label' => 'Create Ticket', 'path' => '/tenant/maintenance'];
        } elseif (str_contains($q, 'visitor') || str_contains($q, 'guest')) {
            $answer = 'Pre-register visitors to speed up gate entry. Include date and expected time for approval flow.';
            $actions[] = ['label' => 'Manage Visitors', 'path' => '/tenant/visitors'];
        }

        if ($flat) {
            $answer .= " Your assigned flat is {$flat->number}.";
        }

        return [
            'answer' => $answer,
            'actions' => $actions,
            'context' => $stats,
        ];
    }

    public function paymentReminder(Payment $payment, string $tone = 'professional'): array
    {
        $isOverdue = $payment->status === 'overdue';
        $subject = $isOverdue
            ? "Overdue Payment Reminder - {$payment->invoice_number}"
            : "Payment Reminder - {$payment->invoice_number}";

        $salutation = match ($tone) {
            'friendly' => 'Hi',
            'urgent' => 'Attention',
            default => 'Dear',
        };

        $message = "{$salutation} {$payment->tenantProfile?->user?->name}, your invoice {$payment->invoice_number} for Flat {$payment->flat?->number} "
            ."amounting to BDT ".number_format((float) $payment->amount, 2)
            ." is ".($isOverdue ? 'overdue' : 'pending')
            .". Please complete payment at your earliest convenience.";

        $recommendedSendAt = Carbon::parse($payment->due_date)->subDay()->setTime(18, 0)->toIso8601String();
        if ($isOverdue) {
            $recommendedSendAt = now()->addMinutes(10)->toIso8601String();
        }

        return [
            'subject' => $subject,
            'message' => $message,
            'tone' => $tone,
            'recommendedSendAt' => $recommendedSendAt,
        ];
    }

    public function reportInsights(array $metrics): array
    {
        $summary = 'Collections remain stable, while unresolved maintenance and overdue invoices are the biggest risk areas.';
        $highlights = [
            "Paid invoices: {$metrics['paidCount']}",
            "Overdue invoices: {$metrics['overdueCount']}",
            "Open tickets: {$metrics['openTickets']}",
            "Visitor volume: {$metrics['visitorCount']}",
        ];

        $actions = [
            'Send reminder batch to overdue tenants before next due cycle.',
            'Prioritize high-severity open tickets older than 48 hours.',
            'Review visitor spikes for guard staffing at peak times.',
        ];

        return [
            'summary' => $summary,
            'highlights' => $highlights,
            'actions' => $actions,
        ];
    }

    public function visitorAnomalies(iterable $visitors): array
    {
        $rows = collect($visitors);
        $late = $rows->filter(function ($visitor) {
            $time = $visitor->entry_time ?? $visitor->created_at ?? null;
            return $time ? Carbon::parse($time)->hour >= 22 : false;
        })->count();

        $repeatPhones = $rows
            ->groupBy('phone')
            ->filter(fn ($group) => $group->count() >= 3)
            ->map(fn ($group, $phone) => ['phone' => $phone, 'count' => $group->count()])
            ->values()
            ->all();

        $findings = [];
        if ($late > 0) {
            $findings[] = [
                'severity' => $late >= 5 ? 'high' : 'medium',
                'title' => 'Late-hour visitor spike',
                'details' => "{$late} visitor entries were logged after 10:00 PM.",
            ];
        }

        foreach ($repeatPhones as $item) {
            $findings[] = [
                'severity' => $item['count'] >= 5 ? 'high' : 'medium',
                'title' => 'Repeated visitor pattern',
                'details' => "Phone {$item['phone']} appears {$item['count']} times in recent logs.",
            ];
        }

        if ($findings === []) {
            $findings[] = [
                'severity' => 'low',
                'title' => 'No major anomalies',
                'details' => 'Visitor pattern looks normal for the selected range.',
            ];
        }

        return ['findings' => $findings];
    }

    public function improveEmailTemplate(string $kind, array $context): array
    {
        return match ($kind) {
            'announcement' => [
                'subject' => 'BSMS Notice: '.($context['title'] ?? 'Important Update'),
                'opening' => 'We hope you are doing well. Please see the important update below.',
                'cta' => 'Log in to BSMS for full details and follow-up actions.',
            ],
            'payment_received' => [
                'subject' => 'BSMS Confirmation: Payment Received',
                'opening' => 'A payment has been successfully recorded in your account.',
                'cta' => 'Open the Payments page in BSMS to review invoice details.',
            ],
            'ticket_update' => [
                'subject' => 'BSMS Maintenance Update',
                'opening' => 'Your maintenance ticket has a new status update.',
                'cta' => 'Check Maintenance in BSMS to track progress.',
            ],
            default => [
                'subject' => 'BSMS Notification',
                'opening' => 'There is an update for your BSMS account.',
                'cta' => 'Open BSMS to view details.',
            ],
        };
    }

    public function dashboardStatsForTenant(array $stats): array
    {
        return [
            'pendingPayments' => $stats['pendingPayments'] ?? 0,
            'openTickets' => $stats['openTickets'] ?? 0,
            'pendingVisitors' => $stats['pendingVisitors'] ?? 0,
            'unreadAnnouncements' => $stats['unreadAnnouncements'] ?? 0,
        ];
    }
}

