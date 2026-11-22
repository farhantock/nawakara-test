<?php

namespace Database\Seeders;

use App\Enums\HistoryAction;
use App\Enums\RequestStatus;
use App\Enums\UserRole;
use App\Models\ApprovalHistory;
use App\Models\PurchaseRequest;
use App\Models\RequestItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with demo users and sample PR.
     */
    public function run(): void
    {
        $password = Hash::make(config('app.demo_password', 'password123'));

        // 1. Rina Wijaya (Employee / Requester)
        $rina = User::query()->updateOrCreate(
            ['email' => 'rina.wijaya@example.test'],
            [
                'name' => 'Rina Wijaya',
                'role' => UserRole::Employee,
                'password' => $password,
            ]
        );

        // 2. Andi Saputra (Employee / Non-owner)
        User::query()->updateOrCreate(
            ['email' => 'andi.saputra@example.test'],
            [
                'name' => 'Andi Saputra',
                'role' => UserRole::Employee,
                'password' => $password,
            ]
        );

        // 3. Budi Hartono (Manager)
        User::query()->updateOrCreate(
            ['email' => 'budi.hartono@example.test'],
            [
                'name' => 'Budi Hartono',
                'role' => UserRole::Manager,
                'password' => $password,
            ]
        );

        // 4. Sari Lestari (Manager)
        User::query()->updateOrCreate(
            ['email' => 'sari.lestari@example.test'],
            [
                'name' => 'Sari Lestari',
                'role' => UserRole::Manager,
                'password' => $password,
            ]
        );

        $sampleItems = [
            [
                'name' => 'Laptop 14"',
                'uom' => 'Unit',
                'qty' => 2,
                'unit_price' => 15500000,
                'subtotal' => 31000000,
            ],
            [
                'name' => 'USB-C docking station',
                'uom' => 'Unit',
                'qty' => 2,
                'unit_price' => 1850000,
                'subtotal' => 3700000,
            ],
            [
                'name' => 'Monitor 27"',
                'uom' => 'Unit',
                'qty' => 1,
                'unit_price' => 3400000,
                'subtotal' => 3400000,
            ],
        ];

        $totalAmount = array_sum(array_column($sampleItems, 'subtotal'));

        /** @var PurchaseRequest $pr */
        $pr = PurchaseRequest::query()->updateOrCreate(
            ['number' => 'PR-2026-0001'],
            [
                'requester_id' => $rina->id,
                'status' => RequestStatus::Draft,
                'priority' => \App\Enums\RequestPriority::Medium,
                'total_amount' => $totalAmount,
                'version' => 1,
                'notes' => 'Pengadaan perlengkapan kerja tim engineering.',
                'created_at' => Carbon::parse('2026-11-22 09:00:00'),
                'updated_at' => Carbon::parse('2026-11-22 09:00:00'),
            ]
        );

        $pr->items()->delete();
        foreach ($sampleItems as $item) {
            $pr->items()->create($item);
        }

        if (! $pr->history()->exists()) {
            $pr->history()->create([
                'action' => HistoryAction::Created,
                'from_status' => null,
                'to_status' => RequestStatus::Draft,
                'actor_id' => $rina->id,
                'comment' => null,
                'created_at' => Carbon::parse('2026-11-22 09:00:00'),
            ]);
        }
    }
}
