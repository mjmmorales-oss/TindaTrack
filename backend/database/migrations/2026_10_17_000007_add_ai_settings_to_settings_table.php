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
            $table->boolean('ai_enabled')->default(true)->after('timezone');
            $table->boolean('ai_save_scan_images')->default(false)->after('ai_enabled');
            $table->boolean('ai_research_mode')->default(false)->after('ai_save_scan_images');
            $table->boolean('visual_search_enabled')->default(true)->after('ai_research_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn([
                'ai_enabled',
                'ai_save_scan_images',
                'ai_research_mode',
                'visual_search_enabled',
            ]);
        });
    }
};
