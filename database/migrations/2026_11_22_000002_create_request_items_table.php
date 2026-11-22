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
        Schema::create('request_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('request_id')->constrained('purchase_requests')->cascadeOnDelete();
            $table->string('name', 200);
            $table->string('uom', 50)->default('Pcs');
            $table->unsignedInteger('qty');
            $table->decimal('unit_price', 18, 2);
            $table->decimal('subtotal', 18, 2);
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE request_items ADD CONSTRAINT check_qty_positive CHECK (qty > 0)');
            DB::statement('ALTER TABLE request_items ADD CONSTRAINT check_unit_price_positive CHECK (unit_price > 0)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_items');
    }
};
