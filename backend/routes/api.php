<?php

use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AppDataController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FlatController;
use App\Http\Controllers\Api\MaintenanceTicketController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VisitorController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password/request-otp', [AuthController::class, 'requestPasswordResetOtp']);
Route::post('/forgot-password/verify-otp', [AuthController::class, 'verifyPasswordResetOtp']);
Route::post('/forgot-password/reset', [AuthController::class, 'resetPasswordWithOtp']);

Route::middleware('auth.token')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/bootstrap', [AppDataController::class, 'index']);

    Route::apiResource('flats', FlatController::class)->except(['create', 'edit']);
    Route::apiResource('tenants', TenantController::class)->except(['create', 'edit']);
    Route::apiResource('users', UserController::class)->except(['create', 'edit', 'show']);
    Route::apiResource('payments', PaymentController::class)->only(['index', 'store']);
    Route::post('/payments/rent-payment', [PaymentController::class, 'createTenantRentPayment']);
    Route::post('/payments/stripe/confirm', [PaymentController::class, 'confirmStripeCheckoutSession']);
    Route::post('/payments/{payment}/stripe-checkout', [PaymentController::class, 'createStripeCheckoutSession']);
    Route::patch('/payments/{payment}/status', [PaymentController::class, 'updateStatus']);

    Route::apiResource('tickets', MaintenanceTicketController::class)->except(['create', 'edit']);
    Route::post('/tickets/{ticket}/notes', [MaintenanceTicketController::class, 'storeNote']);

    Route::apiResource('visitors', VisitorController::class)->except(['create', 'edit']);
    Route::patch('/visitors/{visitor}/arrive', [VisitorController::class, 'markArrived']);
    Route::patch('/visitors/{visitor}/exit', [VisitorController::class, 'markExited']);

    Route::apiResource('announcements', AnnouncementController::class)->except(['create', 'edit', 'update', 'destroy']);
    Route::post('/announcements/{announcement}/read', [AnnouncementController::class, 'markRead']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    Route::post('/ai/maintenance/triage', [AiController::class, 'maintenanceTriage']);
    Route::post('/ai/announcements/draft', [AiController::class, 'announcementDraft']);
    Route::post('/ai/tenant/assistant', [AiController::class, 'tenantAssistant']);
    Route::post('/ai/payments/reminder', [AiController::class, 'paymentReminder']);
    Route::post('/ai/reports/insights', [AiController::class, 'reportInsights']);
    Route::post('/ai/visitors/anomalies', [AiController::class, 'visitorAnomalies']);
    Route::post('/ai/emails/improve', [AiController::class, 'improveEmailTemplate']);
});
