<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AnnouncementMail;
use App\Models\Announcement;
use App\Models\Notification;
use App\Models\User;
use App\Support\AiOps;
use App\Support\FrontendData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AnnouncementController extends Controller
{
    public function __construct(private readonly AiOps $ai) {}

    public function index(): JsonResponse
    {
        return response()->json(
            Announcement::with(['author', 'readers'])->latest()->get()
                ->map(fn (Announcement $announcement) => FrontendData::announcement($announcement))
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'targetRole' => ['required', 'in:all,tenant,owner,guard'],
        ]);

        $announcement = Announcement::create([
            'building_id' => $request->user()->building_id,
            'author_id' => $request->user()->id,
            'title' => $data['title'],
            'content' => $data['content'],
            'target_role' => $data['targetRole'],
        ])->load(['author', 'readers']);

        $recipients = User::query()
            ->where('building_id', $request->user()->building_id)
            ->when($data['targetRole'] !== 'all', fn ($query) => $query->where('role', $data['targetRole']))
            ->get();

        $notifications = $recipients->map(fn (User $recipient) => [
                'user_id' => $recipient->id,
                'title' => $announcement->title,
                'message' => $announcement->content,
                'type' => 'announcement',
                'read' => false,
                'read_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ])->all();

        if ($notifications !== []) {
            Notification::insert($notifications);
        }

        foreach ($recipients->filter(fn (User $recipient) => filled($recipient->email) && $recipient->email_notifications_enabled) as $recipient) {
            try {
                $emailTemplate = $this->ai->improveEmailTemplate('announcement', ['title' => $announcement->title]);
                Mail::to($recipient->email)->send(new AnnouncementMail(
                    $announcement,
                    $recipient,
                    $emailTemplate['subject'] ?? null,
                    $emailTemplate['opening'] ?? null,
                ));
            } catch (\Throwable $exception) {
                Log::error('Failed to send announcement email.', [
                    'announcement_id' => $announcement->id,
                    'recipient_id' => $recipient->id,
                    'recipient_email' => $recipient->email,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return response()->json(FrontendData::announcement($announcement), 201);
    }

    public function show(Announcement $announcement): JsonResponse
    {
        return response()->json(FrontendData::announcement($announcement->load(['author', 'readers'])));
    }

    public function markRead(Request $request, Announcement $announcement): JsonResponse
    {
        $announcement->readers()->syncWithoutDetaching([
            $request->user()->id => ['read_at' => now()],
        ]);

        return response()->json(FrontendData::announcement($announcement->fresh(['author', 'readers'])));
    }
}
