<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Orders received from external systems through the Integration API.
     * order_id is UNIQUE so a retried request is never processed twice (idempotency).
     */
    public function up(): void
    {
        Schema::create('integration_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 50)->unique();
            $table->string('customer_id', 50);
            $table->string('source_system', 50)->default('TindaOrder');
            $table->string('status', 20); // accepted
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->json('items');        // processed line items
            $table->json('response');     // exact JSON returned to the caller
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_orders');
    }
};
