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
        Schema::table('products', function (Blueprint $table) {
            $table->string('image_url', 2048)->nullable()->after('description');
            $table->string('brand')->nullable()->after('image_url');
            $table->string('size')->nullable()->after('brand');
            $table->string('source')->default('manual')->after('size');
            $table->string('source_ref')->nullable()->after('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['image_url', 'brand', 'size', 'source', 'source_ref']);
        });
    }
};
