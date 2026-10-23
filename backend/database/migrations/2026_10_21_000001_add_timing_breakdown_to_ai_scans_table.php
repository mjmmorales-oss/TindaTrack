<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Where a scan's time goes (v2.3): photo upload (measured by the browser and
     * reported with the feedback), the Gemini call, and our post-processing.
     * model_used is the model that actually answered (primary or fallback).
     */
    public function up(): void
    {
        Schema::table('ai_scans', function (Blueprint $table) {
            $table->unsignedInteger('upload_ms')->nullable()->after('latency_ms');
            $table->unsignedInteger('gemini_ms')->nullable()->after('upload_ms');
            $table->unsignedInteger('postprocess_ms')->nullable()->after('gemini_ms');
            $table->string('model_used')->nullable()->after('postprocess_ms');
        });
    }

    public function down(): void
    {
        Schema::table('ai_scans', function (Blueprint $table) {
            $table->dropColumn(['upload_ms', 'gemini_ms', 'postprocess_ms', 'model_used']);
        });
    }
};
