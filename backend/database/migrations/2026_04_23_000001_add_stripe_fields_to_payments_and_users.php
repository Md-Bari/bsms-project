<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('stripe_account_id')->nullable()->after('is_verified');
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->string('stripe_checkout_session_id')->nullable()->unique()->after('recipient');
            $table->string('stripe_payment_intent_id')->nullable()->after('stripe_checkout_session_id');
            $table->string('stripe_destination_account_id')->nullable()->after('stripe_payment_intent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropColumn([
                'stripe_checkout_session_id',
                'stripe_payment_intent_id',
                'stripe_destination_account_id',
            ]);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('stripe_account_id');
        });
    }
};
