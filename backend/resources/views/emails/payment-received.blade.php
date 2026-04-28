<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BSMS Payment Received</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
    <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
        <div style="background:linear-gradient(135deg, #0ea5e9, #2563eb); color:#ffffff; padding:24px; border-radius:20px 20px 0 0;">
            <div style="font-size:13px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.9;">BSMS Portal</div>
            <h1 style="margin:12px 0 0; font-size:28px; line-height:1.2;">Payment Received</h1>
        </div>

        <div style="background:#ffffff; padding:24px; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 20px 20px;">
            <p style="margin:0 0 16px; font-size:16px;">Hello {{ $recipient->name }},</p>
            @if(!empty($introLine))
                <p style="margin:0 0 20px; font-size:15px; line-height:1.7;">{{ $introLine }}</p>
            @else
                <p style="margin:0 0 20px; font-size:15px; line-height:1.7;">
                    A payment has been received from {{ $payment->tenantProfile?->user?->name ?? 'a tenant' }}.
                </p>
            @endif

            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:14px; padding:16px; margin:24px 0;">
                <p style="margin:0 0 8px; font-size:13px; color:#1d4ed8;"><strong>Invoice:</strong> {{ $payment->invoice_number }}</p>
                <p style="margin:0 0 8px; font-size:13px; color:#1d4ed8;"><strong>Type:</strong> {{ ucwords(str_replace('_', ' ', $payment->type)) }}</p>
                <p style="margin:0 0 8px; font-size:13px; color:#1d4ed8;"><strong>Flat:</strong> {{ $payment->flat?->number ?? 'N/A' }}</p>
                <p style="margin:0 0 8px; font-size:13px; color:#1d4ed8;"><strong>Billing Month:</strong> {{ $payment->billing_month }}</p>
                <p style="margin:0 0 8px; font-size:13px; color:#1d4ed8;"><strong>Amount:</strong> BDT {{ number_format((float) $payment->amount, 2) }}</p>
                <p style="margin:0; font-size:13px; color:#1d4ed8;"><strong>Paid At:</strong> {{ $payment->paid_at?->format('d M Y h:i A') }}</p>
            </div>

            <p style="margin:0; font-size:14px; color:#475569;">
                You can view this payment from your BSMS dashboard notifications and payments page.
            </p>
        </div>
    </div>
</body>
</html>
