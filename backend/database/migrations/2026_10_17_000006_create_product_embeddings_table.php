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
        Schema::create('product_embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('model', 100);
            $table->string('source', 30)->default('product_image'); // product_image | reference_photo | correction
            $table->json('vector');
            $table->string('image_sha256', 64)->nullable()->index();
            $table->timestamps();

            $table->index(['product_id', 'model']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_embeddings');
    }
};
