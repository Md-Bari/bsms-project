<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BSMS Password Reset OTP</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
    <div style="max-width:640px; margin:0 auto; padding:32px 16px;">
        <div style="background:linear-gradient(135deg, #4f46e5, #7c3aed); color:#ffffff; padding:24px; border-radius:20px 20px 0 0;">
            <div style="font-size:13px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.9;">BSMS Portal</div>
            <h1 style="margin:12px 0 0; font-size:28px; line-height:1.2;">Password Reset Verification</h1>
        </div>

        <div style="background:#ffffff; padding:24px; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 20px 20px;">
            <p style="margin:0 0 16px; font-size:16px;">Hello {{ $user->name }},</p>
            <p style="margin:0 0 20px; font-size:15px; line-height:1.7;">
                Use the OTP below to verify your email and continue resetting your password.
            </p>

            <div style="background:#eef2ff; border:1px solid #c7d2fe; border-radius:14px; padding:20px; margin:24px 0; text-align:center;">
                <p style="margin:0 0 8px; font-size:13px; color:#4338ca;"><strong>Your OTP</strong></p>
                <p style="margin:0; font-size:32px; letter-spacing:0.18em; font-weight:700; color:#312e81;">{{ $otp }}</p>
            </div>

            <p style="margin:0; font-size:14px; color:#475569;">
                This OTP expires in 10 minutes. If you did not request a password reset, ignore this email.
            </p>
        </div>
    </div>
</body>
</html>

