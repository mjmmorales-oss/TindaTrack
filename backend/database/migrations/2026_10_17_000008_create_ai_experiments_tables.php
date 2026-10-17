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
        Schema::create('ai_experiments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 30)->default('basket'); // basket | visual | combined
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_experiment_cases', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('ai_experiment_id')->constrained('ai_experiments')->cascadeOnDelete();
            $table->unsignedInteger('case_number');
            $table->foreignUlid('image_id')->nullable()->constrained('ai_scan_images')->nullOnDelete();
            $table->json('ground_truth');
            $table->json('predicted')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->unsignedInteger('latency_ms')->default(0);
            $table->json('metrics')->nullable();
            $table->timestamps();

            $table->unique(['ai_experiment_id', 'case_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_experiment_cases');
        Schema::dropIfExists('ai_experiments');
    }
};
