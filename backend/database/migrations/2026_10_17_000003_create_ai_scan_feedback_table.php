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
        Schema::create('ai_scan_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('ai_scan_id')->constrained('ai_scans')->cascadeOnDelete();
            $table->string('line_type', 20); // item | unmatched | missed
            $table->foreignId('suggested_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->unsignedInteger('suggested_quantity')->nullable();
            $table->decimal('confidence', 4, 3)->nullable();
            $table->foreignId('final_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->unsignedInteger('final_quantity')->nullable();
            $table->string('action', 30); // accepted | qty_changed | product_changed | removed | added_manually
            $table->timestamps();

            $table->index(['ai_scan_id', 'line_type']);
            $table->index(['action', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_scan_feedback');
    }
};
