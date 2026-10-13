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
        Schema::create('barcode_catalog', function (Blueprint $table) {
            $table->string('barcode', 32)->primary();
            $table->boolean('found')->default(false);
            $table->string('source')->nullable();
            $table->string('name')->nullable();
            $table->string('brand')->nullable();
            $table->string('size')->nullable();
            $table->string('image_url', 2048)->nullable();
            $table->json('categories')->nullable();
            $table->timestamp('fetched_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barcode_catalog');
    }
};
