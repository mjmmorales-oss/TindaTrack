<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ai_scan_images', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->ulid('ai_scan_id')->nullable()->index();
            $table->string('mime_type', 50);
            $table->unsignedInteger('image_size');
            $table->binary('image_data');
            $table->timestamps();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE ai_scan_images MODIFY COLUMN image_data MEDIUMBLOB NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_scan_images');
    }
};
