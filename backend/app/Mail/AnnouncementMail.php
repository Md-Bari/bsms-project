<?php

namespace App\Mail;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AnnouncementMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Announcement $announcement,
        public User $recipient,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'BSMS Announcement: '.$this->announcement->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.announcement',
            with: [
                'announcement' => $this->announcement,
                'recipient' => $this->recipient,
            ],
        );
    }
}
