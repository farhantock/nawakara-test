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
        Schema::create('approval_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('request_id')->constrained('purchase_requests')->cascadeOnDelete();
            $table->string('action');
            $table->string('from_status')->nullable();
            $table->string('to_status');
            $table->foreignId('actor_id')->constrained('users')->cascadeOnDelete();
            $table->text('comment')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
            DB::unprepared("
                CREATE OR REPLACE FUNCTION prevent_approval_history_mutation()
                RETURNS TRIGGER AS $$
                BEGIN
                    RAISE EXCEPTION 'approval_history is append-only: UPDATE and DELETE are not allowed';
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER trigger_prevent_approval_history_mutation
                BEFORE UPDATE OR DELETE ON approval_history
                FOR EACH ROW
                EXECUTE FUNCTION prevent_approval_history_mutation();
            ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::unprepared('DROP TRIGGER IF EXISTS trigger_prevent_approval_history_mutation ON approval_history;');
            DB::unprepared('DROP FUNCTION IF EXISTS prevent_approval_history_mutation;');
        }

        Schema::dropIfExists('approval_history');
    }
};
