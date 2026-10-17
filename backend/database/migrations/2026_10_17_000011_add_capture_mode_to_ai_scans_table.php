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
        Schema::table('ai_scans', function (Blueprint $table) {
            $table->string('capture_mode', 20)->nullable()->after('type'); // auto | manual | upload
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_scans', function (Blueprint $table) {
            $table->dropColumn('capture_mode');
        });
    }
};
