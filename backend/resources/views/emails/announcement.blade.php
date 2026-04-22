<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BSMS Announcement</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
    <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
        <div style="background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#ffffff; padding:24px; border-radius:20px 20px 0 0;">
            <div style="font-size:13px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.9;">BSMS Portal</div>
            <h1 style="margin:12px 0 0; font-size:28px; line-height:1.2;">{{ $announcement->title }}</h1>
        </div>

        <div style="background:#ffffff; padding:24px; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 20px 20px;">
            <p style="margin:0 0 16px; font-size:16px;">Hello {{ $recipient->name }},</p>
            <p style="margin:0 0 20px; font-size:15px; line-height:1.7; white-space:pre-line;">{{ $announcement->content }}</p>

            <div style="background:#eef2ff; border:1px solid #c7d2fe; border-radius:14px; padding:16px; margin:24px 0;">
                <p style="margin:0 0 8px; font-size:13px; color:#4338ca;"><strong>Audience:</strong> {{ ucfirst($announcement->target_role) }}</p>
                <p style="margin:0 0 8px; font-size:13px; color:#4338ca;"><strong>Sent by:</strong> {{ $announcement->author->name }}</p>
                <p style="margin:0; font-size:13px; color:#4338ca;"><strong>Sent at:</strong> {{ $announcement->created_at?->format('d M Y h:i A') }}</p>
            </div>

            <p style="margin:0; font-size:14px; color:#475569;">
                You can also view this announcement from your BSMS dashboard.
            </p>
        </div>
    </div>
</body>
</html>
