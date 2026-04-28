<?php

namespace App\Support;

use App\Models\Announcement;
use App\Models\Flat;
use App\Models\MaintenanceTicket;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\TenantProfile;
use App\Models\User;
use App\Models\Visitor;
use Carbon\Carbon;

class FrontendData
{
    public static function user(User $user): array
    {
        $tenantProfile = $user->tenantProfile;

        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'flatId' => optional(optional($tenantProfile)->flat)->id ? (string) $tenantProfile->flat->id : null,
            'flatNumber' => $tenantProfile?->flat?->number,
            'nid' => $tenantProfile?->national_id,
            'emergencyContact' => $tenantProfile?->emergency_contact,
            'moveInDate' => $tenantProfile?->move_in_date?->format('Y-m-d'),
            'status' => $tenantProfile ? ($tenantProfile->is_active ? 'active' : 'inactive') : null,
            'isVerified' => $user->is_verified,
            'emailNotifications' => $user->email_notifications_enabled,
            'createdAt' => $user->created_at?->toISOString(),
        ];
    }

    public static function flat(Flat $flat): array
    {
        $tenantProfile = $flat->tenantProfile;

        return [
            'id' => (string) $flat->id,
            'number' => $flat->number,
            'floor' => $flat->floor,
            'size' => $flat->size_sqft ? rtrim(rtrim((string) $flat->size_sqft, '0'), '.').' sqft' : '',
            'ownerId' => $flat->owner_id ? (string) $flat->owner_id : null,
            'ownerName' => $flat->owner?->name,
            'ownerEmail' => $flat->owner?->email,
            'ownerPhone' => $flat->owner?->phone,
            'tenantId' => $tenantProfile?->user_id ? (string) $tenantProfile->user_id : null,
            'tenantName' => $tenantProfile?->user?->name,
            'status' => $flat->status,
            'monthlyRent' => (float) $flat->monthly_rent,
            'createdAt' => $flat->created_at?->toISOString(),
        ];
    }

    public static function tenant(TenantProfile $profile): array
    {
        return [
            'id' => (string) $profile->id,
            'userId' => (string) $profile->user_id,
            'name' => $profile->user?->name,
            'email' => $profile->user?->email,
            'phone' => $profile->user?->phone,
            'nid' => $profile->national_id,
            'flatId' => $profile->flat_id ? (string) $profile->flat_id : null,
            'flatNumber' => $profile->flat?->number,
            'emergencyContact' => $profile->emergency_contact,
            'moveInDate' => $profile->move_in_date?->format('Y-m-d'),
            'status' => $profile->is_active ? 'active' : 'inactive',
        ];
    }

    public static function payment(Payment $payment): array
    {
        $profile = $payment->tenantProfile;

        return [
            'id' => (string) $payment->id,
            'tenantId' => (string) $profile->id,
            'tenantName' => $profile->user?->name,
            'flatId' => (string) $payment->flat_id,
            'flatNumber' => $payment->flat?->number,
            'ownerId' => $payment->owner_id ? (string) $payment->owner_id : null,
            'ownerName' => $payment->owner?->name,
            'amount' => (float) $payment->amount,
            'type' => $payment->type,
            'status' => $payment->status,
            'method' => $payment->method,
            'month' => $payment->billing_month,
            'dueDate' => $payment->due_date?->format('Y-m-d'),
            'paidDate' => $payment->paid_at?->toISOString(),
            'invoiceNumber' => $payment->invoice_number,
            'recipient' => $payment->recipient,
        ];
    }

    public static function ticket(MaintenanceTicket $ticket): array
    {
        return [
            'id' => (string) $ticket->id,
            'ticketId' => $ticket->ticket_code,
            'tenantId' => (string) $ticket->tenant_profile_id,
            'tenantName' => $ticket->tenantProfile?->user?->name,
            'flatId' => (string) $ticket->flat_id,
            'flatNumber' => $ticket->flat?->number,
            'category' => $ticket->category,
            'description' => $ticket->description,
            'status' => $ticket->status,
            'priority' => $ticket->priority,
            'notes' => $ticket->notes->pluck('note')->values()->all(),
            'createdAt' => $ticket->created_at?->toISOString(),
            'updatedAt' => $ticket->updated_at?->toISOString(),
        ];
    }

    public static function visitor(Visitor $visitor): array
    {
        $entryTime = $visitor->entry_time;
        $exitTime = $visitor->exit_time;
        $duration = null;

        if ($entryTime && $exitTime) {
            $duration = Carbon::parse($entryTime)->diffForHumans(Carbon::parse($exitTime), true, true);
        }

        return [
            'id' => (string) $visitor->id,
            'name' => $visitor->name,
            'phone' => $visitor->phone,
            'nid' => $visitor->national_id,
            'flatId' => (string) $visitor->flat_id,
            'flatNumber' => $visitor->flat?->number,
            'tenantId' => $visitor->tenantProfile?->user_id ? (string) $visitor->tenantProfile->user_id : null,
            'tenantName' => $visitor->tenantProfile?->user?->name,
            'purpose' => $visitor->purpose,
            'type' => $visitor->type,
            'status' => $visitor->status,
            'visitDate' => $visitor->visit_date?->format('Y-m-d'),
            'expectedTime' => $visitor->expected_time ? Carbon::parse($visitor->expected_time)->format('H:i') : null,
            'entryTime' => $entryTime ? Carbon::parse($entryTime)->format('H:i') : null,
            'exitTime' => $exitTime ? Carbon::parse($exitTime)->format('H:i') : null,
            'duration' => $duration,
            'loggedBy' => $visitor->guard_id ? (string) $visitor->guard_id : null,
        ];
    }

    public static function announcement(Announcement $announcement): array
    {
        return [
            'id' => (string) $announcement->id,
            'title' => $announcement->title,
            'content' => $announcement->content,
            'authorId' => (string) $announcement->author_id,
            'authorName' => $announcement->author?->name,
            'targetRole' => $announcement->target_role,
            'createdAt' => $announcement->created_at?->toISOString(),
            'readBy' => $announcement->readers->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
        ];
    }

    public static function notification(Notification $notification): array
    {
        return [
            'id' => (string) $notification->id,
            'userId' => (string) $notification->user_id,
            'title' => $notification->title,
            'message' => $notification->message,
            'type' => $notification->type,
            'read' => $notification->read,
            'createdAt' => $notification->created_at?->toISOString(),
        ];
    }
}
