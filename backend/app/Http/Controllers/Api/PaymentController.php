<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PaymentReceivedMail;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\TenantProfile;
use App\Models\User;
use App\Support\AiOps;
use App\Support\FrontendData;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class PaymentController extends Controller
{
    public function __construct(private readonly AiOps $ai) {}

    public function index(): JsonResponse
    {
        return response()->json(
            Payment::with(['tenantProfile.user', 'flat', 'owner'])->get()->map(fn (Payment $payment) => FrontendData::payment($payment))
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'tenantProfileId' => ['required', 'integer', 'exists:tenant_profiles,id'],
            'flatId' => ['required', 'integer', 'exists:flats,id'],
            'ownerId' => ['nullable', 'integer', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'type' => ['required', 'in:rent,service_charge,utility,maintenance_fee'],
            'status' => ['required', 'in:paid,unpaid,overdue'],
            'method' => ['nullable', 'in:bkash,nagad,card,cash'],
            'month' => ['required', 'string', 'max:7'],
            'dueDate' => ['required', 'date'],
            'invoiceNumber' => ['required', 'string', 'max:100', 'unique:payments,invoice_number'],
            'recipient' => ['required', 'in:owner,admin'],
        ]);

        $payment = Payment::create([
            'tenant_profile_id' => $data['tenantProfileId'],
            'flat_id' => $data['flatId'],
            'owner_id' => $data['ownerId'] ?? null,
            'amount' => $data['amount'],
            'type' => $data['type'],
            'status' => $data['status'],
            'method' => $data['method'] ?? null,
            'billing_month' => $data['month'],
            'due_date' => $data['dueDate'],
            'invoice_number' => $data['invoiceNumber'],
            'recipient' => $data['recipient'],
        ])->load(['tenantProfile.user', 'flat', 'owner']);

        return response()->json(FrontendData::payment($payment), 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return response()->json(FrontendData::payment($payment->load(['tenantProfile.user', 'flat', 'owner'])));
    }

    public function createTenantRentPayment(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'tenant', 403);

        $data = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
        ]);

        $profile = TenantProfile::with(['user', 'flat.owner'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        abort_unless($profile->flat, 422, 'No flat is assigned to your tenant account.');

        $existingPayment = Payment::with(['tenantProfile.user', 'flat', 'owner'])
            ->where('tenant_profile_id', $profile->id)
            ->where('type', 'rent')
            ->where('billing_month', $data['month'])
            ->first();

        if ($existingPayment) {
            return response()->json(FrontendData::payment($existingPayment));
        }

        $amount = $profile->monthly_rent ?: $profile->flat->monthly_rent;
        abort_if((float) $amount <= 0, 422, 'Monthly rent is not configured for your flat.');

        $payment = Payment::create([
            'tenant_profile_id' => $profile->id,
            'flat_id' => $profile->flat_id,
            'owner_id' => $profile->flat->owner_id,
            'amount' => $amount,
            'type' => 'rent',
            'status' => 'unpaid',
            'method' => null,
            'billing_month' => $data['month'],
            'due_date' => Carbon::createFromFormat('Y-m', $data['month'])->startOfMonth()->addDays(4),
            'invoice_number' => $this->rentInvoiceNumber($profile, $data['month']),
            'recipient' => 'owner',
        ])->load(['tenantProfile.user', 'flat', 'owner']);

        return response()->json(FrontendData::payment($payment), 201);
    }

    public function update(Request $request, Payment $payment): JsonResponse
    {
        abort(405);
    }

    public function destroy(Payment $payment): JsonResponse
    {
        abort(405);
    }

    public function updateStatus(Request $request, Payment $payment): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'tenant') {
            abort_unless($payment->tenantProfile?->user_id === $user->id, 403);
        } elseif ($user->role !== 'admin') {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', 'in:paid,unpaid,overdue'],
            'method' => ['nullable', 'in:bkash,nagad,card,cash'],
        ]);

        $wasPaid = $payment->status === 'paid';
        $payment->update([
            'status' => $data['status'],
            'method' => $data['method'] ?? $payment->method,
            'paid_at' => $data['status'] === 'paid' ? now() : null,
        ]);

        if (! $wasPaid && $data['status'] === 'paid') {
            $this->notifyPaymentReceived($payment->fresh(['tenantProfile.user', 'flat', 'owner']));
        }

        return response()->json(FrontendData::payment($payment->fresh(['tenantProfile.user', 'flat', 'owner'])));
    }

    public function createStripeCheckoutSession(Request $request, Payment $payment): JsonResponse
    {
        $user = $request->user();

        abort_unless($user->role === 'tenant' && $payment->tenantProfile?->user_id === $user->id, 403);
        abort_if($payment->status === 'paid', 422, 'This invoice is already paid.');

        $stripe = $this->stripe();
        $currency = strtolower((string) config('services.stripe.currency', 'bdt'));
        $destinationAccountId = $this->destinationAccountId($payment);
        $frontendUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $description = $payment->type === 'rent'
            ? "Rent for Flat {$payment->flat?->number}"
            : ucwords(str_replace('_', ' ', $payment->type))." for Flat {$payment->flat?->number}";

        $paymentIntentData = [
            'metadata' => $this->stripeMetadata($payment, $destinationAccountId),
        ];

        if ($destinationAccountId) {
            $paymentIntentData['transfer_data'] = [
                'destination' => $destinationAccountId,
            ];
        }

        try {
            $session = $stripe->checkout->sessions->create([
                'mode' => 'payment',
                'payment_method_types' => ['card'],
                'customer_email' => $user->email,
                'client_reference_id' => (string) $payment->id,
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => [
                        'currency' => $currency,
                        'unit_amount' => $this->stripeAmount($payment->amount, $currency),
                        'product_data' => [
                            'name' => $description,
                            'description' => "Invoice {$payment->invoice_number}",
                        ],
                    ],
                ]],
                'metadata' => $this->stripeMetadata($payment, $destinationAccountId),
                'payment_intent_data' => $paymentIntentData,
                'success_url' => "{$frontendUrl}/tenant/payments?stripe_session_id={CHECKOUT_SESSION_ID}&payment_id={$payment->id}",
                'cancel_url' => "{$frontendUrl}/tenant/payments?payment_cancelled=1&payment_id={$payment->id}",
            ]);
        } catch (ApiErrorException $exception) {
            report($exception);

            return response()->json([
                'message' => 'Stripe sandbox could not create a checkout session. Please check your Stripe test keys and connected account IDs.',
            ], 422);
        }

        $payment->update([
            'method' => 'card',
            'stripe_checkout_session_id' => $session->id,
            'stripe_destination_account_id' => $destinationAccountId,
        ]);

        return response()->json([
            'checkoutUrl' => $session->url,
            'sessionId' => $session->id,
            'payment' => FrontendData::payment($payment->fresh(['tenantProfile.user', 'flat', 'owner'])),
        ]);
    }

    public function confirmStripeCheckoutSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sessionId' => ['required', 'string'],
        ]);

        $payment = Payment::with(['tenantProfile.user', 'flat', 'owner'])
            ->where('stripe_checkout_session_id', $data['sessionId'])
            ->firstOrFail();

        $user = $request->user();
        if ($user->role === 'tenant') {
            abort_unless($payment->tenantProfile?->user_id === $user->id, 403);
        } elseif ($user->role !== 'admin') {
            abort(403);
        }

        if ($payment->status === 'paid') {
            return response()->json(FrontendData::payment($payment));
        }

        try {
            $session = $this->stripe()->checkout->sessions->retrieve($data['sessionId'], [
                'expand' => ['payment_intent'],
            ]);
        } catch (ApiErrorException $exception) {
            report($exception);

            return response()->json([
                'message' => 'Stripe sandbox could not verify this checkout session.',
            ], 422);
        }

        if ($session->payment_status !== 'paid') {
            return response()->json([
                'message' => 'Stripe payment has not completed yet.',
            ], 422);
        }

        $paymentIntent = $session->payment_intent;
        $payment->update([
            'status' => 'paid',
            'method' => 'card',
            'paid_at' => $payment->paid_at ?? now(),
            'stripe_payment_intent_id' => is_string($paymentIntent) ? $paymentIntent : $paymentIntent?->id,
        ]);

        $updatedPayment = $payment->fresh(['tenantProfile.user', 'flat', 'owner']);
        $this->notifyPaymentReceived($updatedPayment);

        return response()->json(FrontendData::payment($updatedPayment));
    }

    private function stripe(): StripeClient
    {
        $key = config('services.stripe.key');
        abort_unless($key, 500, 'Stripe sandbox secret key is not configured.');

        return new StripeClient((string) $key);
    }

    private function rentInvoiceNumber(TenantProfile $profile, string $month): string
    {
        do {
            $invoiceNumber = sprintf(
                'RENT-%s-T%s-%s',
                str_replace('-', '', $month),
                $profile->id,
                Str::upper(Str::random(5))
            );
        } while (Payment::where('invoice_number', $invoiceNumber)->exists());

        return $invoiceNumber;
    }

    private function destinationAccountId(Payment $payment): ?string
    {
        if ($payment->recipient === 'owner') {
            return $payment->owner?->stripe_account_id ?: config('services.stripe.default_owner_account_id');
        }

        return config('services.stripe.admin_account_id');
    }

    private function stripeMetadata(Payment $payment, ?string $destinationAccountId): array
    {
        return [
            'payment_id' => (string) $payment->id,
            'invoice_number' => $payment->invoice_number,
            'recipient' => $payment->recipient,
            'destination_account_id' => $destinationAccountId ?? 'platform',
            'tenant_profile_id' => (string) $payment->tenant_profile_id,
            'flat_id' => (string) $payment->flat_id,
            'owner_id' => $payment->owner_id ? (string) $payment->owner_id : '',
        ];
    }

    private function stripeAmount(float|string $amount, string $currency): int
    {
        $zeroDecimalCurrencies = [
            'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
        ];

        return (int) round((float) $amount * (in_array($currency, $zeroDecimalCurrencies, true) ? 1 : 100));
    }

    private function notifyPaymentReceived(Payment $payment): void
    {
        $payment->loadMissing(['tenantProfile.user', 'flat', 'owner']);
        $recipients = $this->paymentRecipients($payment);

        if ($recipients->isEmpty()) {
            return;
        }

        $title = 'Payment received';
        $message = sprintf(
            '%s paid BDT %s for %s (Invoice %s, Flat %s).',
            $payment->tenantProfile?->user?->name ?? 'Tenant',
            number_format((float) $payment->amount, 2),
            str_replace('_', ' ', $payment->type),
            $payment->invoice_number,
            $payment->flat?->number ?? 'N/A'
        );

        $now = now();
        Notification::insert($recipients->map(fn (User $recipient) => [
            'user_id' => $recipient->id,
            'title' => $title,
            'message' => $message,
            'type' => 'payment',
            'read' => false,
            'read_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all());

        foreach ($recipients->filter(fn (User $recipient) => filled($recipient->email) && $recipient->email_notifications_enabled) as $recipient) {
            try {
                $emailTemplate = $this->ai->improveEmailTemplate('payment_received', [
                    'invoiceNumber' => $payment->invoice_number,
                ]);
                Mail::to($recipient->email)->send(new PaymentReceivedMail(
                    $payment,
                    $recipient,
                    $emailTemplate['subject'] ?? null,
                    $emailTemplate['opening'] ?? null,
                ));
            } catch (\Throwable $exception) {
                Log::error('Failed to send payment received email.', [
                    'payment_id' => $payment->id,
                    'recipient_id' => $recipient->id,
                    'recipient_email' => $recipient->email,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }

    private function paymentRecipients(Payment $payment)
    {
        if ($payment->recipient === 'owner') {
            return collect([$payment->owner])->filter();
        }

        $buildingId = $payment->flat?->building_id ?? $payment->tenantProfile?->user?->building_id;
        if (! $buildingId) {
            return collect();
        }

        return User::query()
            ->where('role', 'admin')
            ->where('building_id', $buildingId)
            ->get();
    }
}
