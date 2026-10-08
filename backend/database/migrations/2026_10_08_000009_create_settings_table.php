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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('store_name')->default('Tindahan ni Aling Nena');
            $table->string('store_tagline')->nullable()->default('Mura at Sariwa Araw-araw');
            $table->string('phone', 30)->nullable()->default('0917-123-4567');
            $table->string('address', 500)->nullable()->default('Purok 3, Brgy. San Isidro');
            $table->string('receipt_header', 500)->nullable()->default('Tindahan ni Aling Nena');
            $table->string('receipt_footer', 500)->nullable()->default('Salamat po! Balik po kayo!');
            $table->unsignedInteger('default_reorder_level')->default(10);
            $table->unsignedInteger('low_stock_threshold')->default(5);
            $table->string('currency', 10)->default('PHP');
            $table->string('timezone', 50)->default('Asia/Manila');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
