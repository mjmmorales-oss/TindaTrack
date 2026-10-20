<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Indexes for list filters that had none: the Archived products filter
     * (deleted_at), the stock-movement date range, and report/summary queries
     * that filter sales by status and then by date.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index('deleted_at');
        });
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index('created_at');
        });
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropIndex(['deleted_at']));
        Schema::table('stock_movements', fn (Blueprint $table) => $table->dropIndex(['created_at']));
        Schema::table('sales', fn (Blueprint $table) => $table->dropIndex(['status', 'created_at']));
    }
};
