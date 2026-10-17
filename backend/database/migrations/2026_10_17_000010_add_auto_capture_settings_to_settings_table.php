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
        Schema::table('settings', function (Blueprint $table) {
            $table->boolean('auto_capture_basket')->default(true)->after('visual_search_enabled');
            $table->boolean('auto_capture_stockin')->default(true)->after('auto_capture_basket');
            $table->string('auto_capture_sensitivity', 20)->default('medium')->after('auto_capture_stockin');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn([
                'auto_capture_basket',
                'auto_capture_stockin',
                'auto_capture_sensitivity',
            ]);
        });
    }
};
