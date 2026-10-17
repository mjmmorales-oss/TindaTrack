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
        Schema::create('ai_scans', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('scanner_session_id')->nullable()->constrained('scanner_sessions')->nullOnDelete();
            $table->string('type', 20); // basket | products
            $table->string('provider', 50);
            $table->string('model', 100);
            $table->string('prompt_version', 50);
            $table->string('image_sha256', 64)->index();
            $table->foreignUlid('image_id')->nullable()->constrained('ai_scan_images')->nullOnDelete();
            $table->unsignedInteger('latency_ms');
            $table->string('status', 20)->default('ok'); // ok | error
            $table->string('error_code', 50)->nullable();
            $table->json('raw_response')->nullable();
            $table->json('result')->nullable();
            $table->unsignedInteger('catalog_size')->default(0);
            $table->boolean('catalog_truncated')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['type', 'created_at']);
        });

        // Add foreign key constraint from ai_scan_images.ai_scan_id to ai_scans.id
        Schema::table('ai_scan_images', function (Blueprint $table) {
            $table->foreign('ai_scan_id')->references('id')->on('ai_scans')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_scan_images', function (Blueprint $table) {
            $table->dropForeign(['ai_scan_id']);
        });

        Schema::dropIfExists('ai_scans');
    }
};
