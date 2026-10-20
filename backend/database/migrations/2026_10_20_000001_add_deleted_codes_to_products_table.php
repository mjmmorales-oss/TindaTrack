<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Soft-deleted products keep their barcode/SKU in deleted_* columns so the
     * unique indexes on barcode and sku are freed for a new product.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('sku')->nullable()->change();
            $table->string('deleted_barcode')->nullable()->after('barcode');
            $table->string('deleted_sku')->nullable()->after('deleted_barcode');

            $table->index('deleted_barcode');
        });

        // Free the codes of products that were already archived before this release.
        DB::table('products')
            ->whereNotNull('deleted_at')
            ->where(fn ($q) => $q->whereNotNull('barcode')->orWhereNotNull('sku'))
            ->update([
                'deleted_barcode' => DB::raw('barcode'),
                'deleted_sku' => DB::raw('sku'),
                'barcode' => null,
                'sku' => null,
            ]);
    }

    public function down(): void
    {
        // Put archived codes back where they do not collide with a live product.
        $archived = DB::table('products')->whereNotNull('deleted_at')->get(['id', 'deleted_barcode', 'deleted_sku']);
        foreach ($archived as $row) {
            $updates = [];
            if ($row->deleted_barcode && ! DB::table('products')->where('barcode', $row->deleted_barcode)->exists()) {
                $updates['barcode'] = $row->deleted_barcode;
            }
            $sku = $row->deleted_sku;
            if (! $sku || DB::table('products')->where('sku', $sku)->exists()) {
                $sku = 'ARCHIVED-'.$row->id;
            }
            $updates['sku'] = $sku;
            DB::table('products')->where('id', $row->id)->update($updates);
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['deleted_barcode']);
            $table->dropColumn(['deleted_barcode', 'deleted_sku']);
            $table->string('sku')->nullable(false)->change();
        });
    }
};
