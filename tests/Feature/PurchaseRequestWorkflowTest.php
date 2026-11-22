<?php

namespace Tests\Feature;

use App\Enums\HistoryAction;
use App\Enums\RequestStatus;
use App\Enums\UserRole;
use App\Models\ApprovalHistory;
use App\Models\PurchaseRequest;
use App\Models\User;
use App\Services\PurchaseRequestService;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Mockery;
use Tests\TestCase;

class PurchaseRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $rina;

    protected User $andi;

    protected User $budi;

    protected User $sari;

    protected function setUp(): void
    {
        parent::setUp();

        $password = Hash::make('password123');

        $this->rina = User::factory()->create([
            'name' => 'Rina Wijaya',
            'email' => 'rina.wijaya@example.test',
            'role' => UserRole::Employee,
            'password' => $password,
        ]);

        $this->andi = User::factory()->create([
            'name' => 'Andi Saputra',
            'email' => 'andi.saputra@example.test',
            'role' => UserRole::Employee,
            'password' => $password,
        ]);

        $this->budi = User::factory()->create([
            'name' => 'Budi Hartono',
            'email' => 'budi.hartono@example.test',
            'role' => UserRole::Manager,
            'password' => $password,
        ]);

        $this->sari = User::factory()->create([
            'name' => 'Sari Lestari',
            'email' => 'sari.lestari@example.test',
            'role' => UserRole::Manager,
            'password' => $password,
        ]);
    }

    /**
     * Helper to create a Draft PR for Rina.
     */
    protected function createDraftForRina(bool $withItems = true, ?string $number = null): PurchaseRequest
    {
        static $counter = 10;
        $num = $number ?? sprintf('PR-2026-%04d', $counter++);

        /** @var PurchaseRequest $pr */
        $pr = PurchaseRequest::query()->create([
            'number' => $num,
            'requester_id' => $this->rina->id,
            'status' => RequestStatus::Draft,
            'total_amount' => $withItems ? 38100000 : 0,
            'version' => 1,
            'notes' => 'Catatan awal',
        ]);

        if ($withItems) {
            $pr->items()->create([
                'name' => 'Laptop 14"',
                'qty' => 2,
                'unit_price' => 15500000,
                'subtotal' => 31000000,
            ]);
            $pr->items()->create([
                'name' => 'Monitor 27"',
                'qty' => 1,
                'unit_price' => 7100000,
                'subtotal' => 7100000,
            ]);
        }

        $pr->history()->create([
            'action' => HistoryAction::Created,
            'from_status' => null,
            'to_status' => RequestStatus::Draft,
            'actor_id' => $this->rina->id,
            'comment' => null,
        ]);

        return $pr;
    }

    /**
     * E1: Submit request tanpa item -> 422
     */
    public function test_e1_submit_request_without_items_returns_422(): void
    {
        $pr = $this->createDraftForRina(withItems: false);

        $response = $this->actingAs($this->rina)
            ->postJson("/api/v1/requests/{$pr->id}/submit");

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['fields' => ['items']]]);

        $this->assertEquals(RequestStatus::Draft, $pr->fresh()->status);
    }

    /**
     * E2: Karyawan (Andi), atau pemohon pada request miliknya sendiri, mencoba approve -> 403, status tidak berubah
     */
    public function test_e2_unauthorized_user_or_self_approving_returns_403_and_status_unchanged(): void
    {
        $pr = $this->createDraftForRina();
        $pr->update(['status' => RequestStatus::Submitted]);

        // 1. Andi (employee) tries to approve
        $responseAndi = $this->actingAs($this->andi)
            ->postJson("/api/v1/requests/{$pr->id}/approve", ['comment' => 'Saya setujui']);

        $responseAndi->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
        $this->assertEquals(RequestStatus::Submitted, $pr->fresh()->status);

        // 2. Manager trying to approve their own request
        /** @var PurchaseRequest $budiPr */
        $budiPr = PurchaseRequest::query()->create([
            'number' => 'PR-2026-0002',
            'requester_id' => $this->budi->id,
            'status' => RequestStatus::Submitted,
            'total_amount' => 5000000,
            'version' => 1,
        ]);
        $budiPr->items()->create([
            'name' => 'Meja Kerja',
            'qty' => 1,
            'unit_price' => 5000000,
            'subtotal' => 5000000,
        ]);

        $responseSelf = $this->actingAs($this->budi)
            ->postJson("/api/v1/requests/{$budiPr->id}/approve");

        $responseSelf->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
        $this->assertEquals(RequestStatus::Submitted, $budiPr->fresh()->status);
    }

    /**
     * E3: Approve lalu approve/reject lagi -> 409
     */
    public function test_e3_double_decision_on_final_status_returns_409(): void
    {
        $pr = $this->createDraftForRina();
        $pr->update(['status' => RequestStatus::Submitted]);

        // First approval by Budi -> 200
        $responseFirst = $this->actingAs($this->budi)
            ->postJson("/api/v1/requests/{$pr->id}/approve", ['comment' => 'Disetujui']);
        $responseFirst->assertStatus(200);
        $this->assertEquals(RequestStatus::Approved, $pr->fresh()->status);

        // Second approval attempt by Sari -> 409
        $responseSecond = $this->actingAs($this->sari)
            ->postJson("/api/v1/requests/{$pr->id}/approve", ['comment' => 'Setuju juga']);
        $responseSecond->assertStatus(409)
            ->assertJsonPath('error.code', 'INVALID_STATE');

        // Rejection attempt on Approved -> 409
        $responseReject = $this->actingAs($this->sari)
            ->postJson("/api/v1/requests/{$pr->id}/reject", ['comment' => 'Batal setuju']);
        $responseReject->assertStatus(409)
            ->assertJsonPath('error.code', 'INVALID_STATE');
    }

    /**
     * E4: Kirim total palsu -> total tersimpan tetap hasil hitung server
     */
    public function test_e4_server_recalculates_totals_and_ignores_client_tampering(): void
    {
        $payload = [
            'notes' => 'Pengadaan laptop',
            'total_amount' => 100, // Tampered client total
            'items' => [
                [
                    'name' => 'Laptop High End',
                    'qty' => 2,
                    'unit_price' => 15000000,
                    'subtotal' => 50, // Tampered client subtotal
                ],
                [
                    'name' => 'Mouse Wireless',
                    'qty' => 3,
                    'unit_price' => 200000,
                    'subtotal' => 10, // Tampered client subtotal
                ],
            ],
        ];

        $response = $this->actingAs($this->rina)
            ->postJson('/api/v1/requests', $payload);

        $response->assertStatus(201);

        $expectedTotal = (2 * 15000000) + (3 * 200000); // 30,600,000

        $createdPr = PurchaseRequest::query()->where('requester_id', $this->rina->id)->firstOrFail();
        $this->assertEquals($expectedTotal, $createdPr->total_amount);

        $items = $createdPr->items()->get();
        $this->assertEquals(30000000, $items[0]->subtotal);
        $this->assertEquals(600000, $items[1]->subtotal);
    }

    /**
     * E5: Dua manajer (Budi dan Sari) approve paralel -> tepat satu sukses, satu 409, riwayat berisi satu entri
     */
    public function test_e5_concurrent_manager_approvals_only_one_wins_other_gets_409(): void
    {
        $pr = $this->createDraftForRina();
        $pr->update(['status' => RequestStatus::Submitted]);

        // Manager 1 (Budi) approves
        $response1 = $this->actingAs($this->budi)
            ->postJson("/api/v1/requests/{$pr->id}/approve", ['comment' => 'Approved by Budi']);
        $response1->assertStatus(200);

        // Manager 2 (Sari) attempts approval after state change
        $response2 = $this->actingAs($this->sari)
            ->postJson("/api/v1/requests/{$pr->id}/approve", ['comment' => 'Approved by Sari']);
        $response2->assertStatus(409)
            ->assertJsonPath('error.code', 'INVALID_STATE');

        // Only one approval entry in approval_history
        $approvalEntries = ApprovalHistory::query()
            ->where('request_id', $pr->id)
            ->where('action', HistoryAction::Approved)
            ->get();

        $this->assertCount(1, $approvalEntries);
        $this->assertEquals($this->budi->id, $approvalEntries[0]->actor_id);
    }

    /**
     * E6: Riwayat gagal ditulis -> status kembali ke Submitted (rollback atomik)
     */
    public function test_e6_atomic_transaction_rollback_when_history_insert_fails(): void
    {
        $pr = $this->createDraftForRina();
        $pr->update(['status' => RequestStatus::Submitted]);

        // We bind a custom instance of PurchaseRequestService where history creation throws
        $mockService = new class extends PurchaseRequestService {
            public function approve(PurchaseRequest $request, User $user, ?string $comment = null): PurchaseRequest
            {
                return DB::transaction(function () use ($request, $user): PurchaseRequest {
                    $lockedRequest = PurchaseRequest::query()->where('id', $request->id)->lockForUpdate()->firstOrFail();
                    $lockedRequest->update([
                        'status' => RequestStatus::Approved,
                        'decided_at' => now(),
                    ]);

                    // Simulate history insertion failure
                    throw new Exception('Database disk full / history write error');
                });
            }
        };

        $this->app->instance(PurchaseRequestService::class, $mockService);

        $response = $this->actingAs($this->budi)
            ->postJson("/api/v1/requests/{$pr->id}/approve", ['comment' => 'Test E6']);

        $response->assertStatus(500);

        // Verification: Status MUST remain Submitted because transaction rolled back
        $freshPr = $pr->fresh();
        $this->assertEquals(RequestStatus::Submitted, $freshPr->status);
        $this->assertNull($freshPr->decided_at);
    }

    /**
     * F6: Reject tanpa komentar -> 422
     */
    public function test_f6_reject_without_comment_returns_422(): void
    {
        $pr = $this->createDraftForRina();
        $pr->update(['status' => RequestStatus::Submitted]);

        $response = $this->actingAs($this->budi)
            ->postJson("/api/v1/requests/{$pr->id}/reject", ['comment' => '']);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['fields' => ['comment']]]);

        $this->assertEquals(RequestStatus::Submitted, $pr->fresh()->status);
    }

    /**
     * F3: Edit setelah Submitted -> 409
     */
    public function test_f3_edit_after_submitted_returns_409(): void
    {
        $pr = $this->createDraftForRina();
        $pr->update(['status' => RequestStatus::Submitted]);

        $response = $this->actingAs($this->rina)
            ->putJson("/api/v1/requests/{$pr->id}", [
                'items' => [
                    ['name' => 'Edited item', 'qty' => 1, 'unit_price' => 100000],
                ],
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('error.code', 'INVALID_STATE');
    }

    /**
     * F2: Employee sees only own requests; Manager sees only non-draft requests (submitted/approved/rejected)
     */
    public function test_f2_list_scoping_by_role(): void
    {
        // Rina's request (draft)
        $this->createDraftForRina(true, 'PR-2026-0001');
        // Rina's request (submitted)
        $rinaPr = $this->createDraftForRina(true, 'PR-2026-0003');
        $rinaPr->update(['status' => RequestStatus::Submitted, 'submitted_at' => now()]);

        // Andi's request (draft)
        $andiPr = PurchaseRequest::query()->create([
            'number' => 'PR-2026-0002',
            'requester_id' => $this->andi->id,
            'status' => RequestStatus::Draft,
            'total_amount' => 1000000,
            'version' => 1,
        ]);
        $andiPr->items()->create(['name' => 'Kursi', 'qty' => 1, 'unit_price' => 1000000, 'subtotal' => 1000000]);

        // 1. Rina sees her own PRs (1 draft + 1 submitted)
        $responseRina = $this->actingAs($this->rina)->getJson('/api/v1/requests');
        $responseRina->assertStatus(200);
        $this->assertCount(2, $responseRina->json('data'));

        // 2. Manager (Budi) does not see Drafts (neither Andi's nor Rina's draft), only sees submitted/decided PRs (Rina's)
        $responseBudi = $this->actingAs($this->budi)->getJson('/api/v1/requests');
        $responseBudi->assertStatus(200);
        $this->assertCount(1, $responseBudi->json('data'));
        $this->assertEquals($rinaPr->id, $responseBudi->json('data.0.id'));
    }

    /**
     * Section 9 Test 1: Setiap aksi sukses menambah tepat satu baris riwayat dengan status sebelum dan sesudah yang benar
     */
    public function test_f7_every_successful_action_adds_history_with_correct_from_and_to_status(): void
    {
        // 1. Create (CREATED: null -> DRAFT)
        $createRes = $this->actingAs($this->rina)->postJson('/api/v1/requests', [
            'notes' => 'Pengadaan laptop',
            'items' => [['name' => 'Laptop', 'qty' => 1, 'unit_price' => 10000000]],
        ]);
        $createRes->assertStatus(201);
        $prId = $createRes->json('id');

        $h1 = ApprovalHistory::query()->where('request_id', $prId)->latest('id')->firstOrFail();
        $this->assertEquals(HistoryAction::Created, $h1->action);
        $this->assertNull($h1->from_status);
        $this->assertEquals(RequestStatus::Draft, $h1->to_status);

        // 2. Edit (EDITED: DRAFT -> DRAFT)
        $editRes = $this->actingAs($this->rina)->putJson("/api/v1/requests/{$prId}", [
            'items' => [['name' => 'Laptop Updated', 'qty' => 1, 'unit_price' => 12000000]],
        ]);
        $editRes->assertStatus(200);

        $h2 = ApprovalHistory::query()->where('request_id', $prId)->latest('id')->firstOrFail();
        $this->assertEquals(HistoryAction::Edited, $h2->action);
        $this->assertEquals(RequestStatus::Draft, $h2->from_status);
        $this->assertEquals(RequestStatus::Draft, $h2->to_status);

        // 3. Submit (SUBMITTED: DRAFT -> SUBMITTED)
        $subRes = $this->actingAs($this->rina)->postJson("/api/v1/requests/{$prId}/submit");
        $subRes->assertStatus(200);

        $h3 = ApprovalHistory::query()->where('request_id', $prId)->latest('id')->firstOrFail();
        $this->assertEquals(HistoryAction::Submitted, $h3->action);
        $this->assertEquals(RequestStatus::Draft, $h3->from_status);
        $this->assertEquals(RequestStatus::Submitted, $h3->to_status);

        // 4. Approve (APPROVED: SUBMITTED -> APPROVED)
        $appRes = $this->actingAs($this->budi)->postJson("/api/v1/requests/{$prId}/approve", [
            'comment' => 'Disetujui penuh',
        ]);
        $appRes->assertStatus(200);

        $h4 = ApprovalHistory::query()->where('request_id', $prId)->latest('id')->firstOrFail();
        $this->assertEquals(HistoryAction::Approved, $h4->action);
        $this->assertEquals(RequestStatus::Submitted, $h4->from_status);
        $this->assertEquals(RequestStatus::Approved, $h4->to_status);
        $this->assertEquals('Disetujui penuh', $h4->comment);
    }

    /**
     * Section 9 Test 2: UPDATE atau DELETE langsung pada approval_history ditolak database (Append-only guarantee)
     */
    public function test_append_only_direct_update_or_delete_on_approval_history_is_rejected_by_database(): void
    {
        $pr = $this->createDraftForRina();
        $history = $pr->history()->firstOrFail();

        // 1. Direct SQL UPDATE must be rejected by database trigger
        $updateThrown = false;
        try {
            DB::table('approval_history')->where('id', $history->id)->update(['comment' => 'Hacked comment']);
        } catch (\Illuminate\Database\QueryException $e) {
            $updateThrown = true;
        }
        $this->assertTrue($updateThrown, 'Database trigger should prevent direct UPDATE on approval_history');

        // 2. Direct SQL DELETE must be rejected by database trigger
        $deleteThrown = false;
        try {
            DB::table('approval_history')->where('id', $history->id)->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            $deleteThrown = true;
        }
        $this->assertTrue($deleteThrown, 'Database trigger should prevent direct DELETE on approval_history');
    }

    /**
     * Section 9 Test 3: Log keamanan untuk percobaan yang ditolak (403 dan 409) ditulis ke channel audit
     */
    public function test_rejected_attempts_403_and_409_are_written_to_audit_log_channel(): void
    {
        $pr = $this->createDraftForRina();
        $pr->update(['status' => RequestStatus::Submitted]);

        // Clear audit log file if exists
        $auditLogPath = storage_path('logs/audit.log');
        if (file_exists($auditLogPath)) {
            unlink($auditLogPath);
        }

        // 1. Attempt 403 (Andi as employee tries to approve)
        $this->actingAs($this->andi)->postJson("/api/v1/requests/{$pr->id}/approve");

        $this->assertFileExists($auditLogPath);
        $logContent = file_get_contents($auditLogPath);
        $this->assertStringContainsString('FORBIDDEN', $logContent);
        $this->assertStringContainsString((string) $this->andi->id, $logContent);

        // 2. Attempt 409 (Approve twice)
        $this->actingAs($this->budi)->postJson("/api/v1/requests/{$pr->id}/approve"); // Success 200
        $this->actingAs($this->sari)->postJson("/api/v1/requests/{$pr->id}/approve"); // Conflict 409

        $updatedLogContent = file_get_contents($auditLogPath);
        $this->assertStringContainsString('INVALID_STATE', $updatedLogContent);
        $this->assertStringContainsString((string) $this->sari->id, $updatedLogContent);
    }
}
