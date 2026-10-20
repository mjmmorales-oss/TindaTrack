<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The Settings page always sent these three fields; the API validated and
     * then discarded them, so they reset after every save.
     */
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->string('owner_name')->nullable()->after('store_tagline');
            $table->boolean('show_cashier_name')->default(true)->after('receipt_footer');
            $table->unsignedTinyInteger('low_stock_threshold_percent')->default(20)->after('low_stock_threshold');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn(['owner_name', 'show_cashier_name', 'low_stock_threshold_percent']);
        });
    }
};
