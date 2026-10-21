<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Set when the paired phone sends an AI basket, cleared when the POS finishes
     * the review (Add to Cart / Discard / Scan again). The phone pauses auto-capture
     * while it is set, so it can't overwrite the cashier's open review.
     */
    public function up(): void
    {
        Schema::table('scanner_sessions', function (Blueprint $table) {
            $table->timestamp('basket_pending_at')->nullable()->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('scanner_sessions', function (Blueprint $table) {
            $table->dropColumn('basket_pending_at');
        });
    }
};
