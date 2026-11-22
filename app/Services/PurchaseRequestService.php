<?php

namespace App\Services;

use App\Enums\HistoryAction;
use App\Enums\RequestPriority;
use App\Enums\RequestStatus;
use App\Exceptions\InvalidStateException;
use App\Models\ApprovalHistory;
use App\Models\PurchaseRequest;
use App\Models\RequestItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class PurchaseRequestService
{
    public function generateNextNumber(?int $year = null): string
    {
        $targetYear = $year ?? (int) Carbon::now()->format('Y');
        $prefix = "PR-{$targetYear}-";
        $latest = PurchaseRequest::query()
            ->where('number', 'like', "{$prefix}%")
            ->orderBy('number', 'desc')
            ->lockForUpdate()
            ->first();

        $nextSeq = 1;

        if ($latest !== null) {
            $parts = explode('-', $latest->number);
            if (isset($parts[2]) && is_numeric($parts[2])) {
                $nextSeq = (int) $parts[2] + 1;
            }
        }

        return sprintf('%s%04d', $prefix, $nextSeq);
    }

    public function calculateTotals(array $rawItems): array
    {
        $processedItems = [];
        $total = 0;

        foreach ($rawItems as $rawItem) {
            $qty = max(1, (int) $rawItem['qty']);
            $unitPrice = round(max(0, (float) $rawItem['unit_price']), 2);
            $subtotal = round($qty * $unitPrice, 2);

            $processedItems[] = [
                'name' => trim((string) $rawItem['name']),
                'uom' => ! empty($rawItem['uom']) ? trim((string) $rawItem['uom']) : 'Pcs',
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'subtotal' => $subtotal,
            ];

            $total += $subtotal;
        }

        return [
            'items' => $processedItems,
            'total' => round($total, 2),
        ];
    }

    /**
     * Create a new draft purchase request.
     *
     * @param  array{notes?: ?string, items: array<int, array{name: string, qty: int, unit_price: int}>}  $data
     */
    public function createDraft(User $user, array $data): PurchaseRequest
    {
        if (empty($data['items'])) {
            throw ValidationException::withMessages([
                'items' => 'Minimal 1 item valid diperlukan untuk membuat purchase request.',
            ]);
        }

        return DB::transaction(function () use ($user, $data): PurchaseRequest {
            $number = $this->generateNextNumber();
            $calculated = $this->calculateTotals($data['items']);

            $priority = isset($data['priority'])
                ? ($data['priority'] instanceof RequestPriority ? $data['priority'] : RequestPriority::tryFrom((string)$data['priority']) ?? RequestPriority::Medium)
                : RequestPriority::Medium;

            $pr = PurchaseRequest::query()->create([
                'number' => $number,
                'requester_id' => $user->id,
                'status' => RequestStatus::Draft,
                'priority' => $priority,
                'total_amount' => $calculated['total'],
                'version' => 1,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($calculated['items'] as $itemData) {
                $pr->items()->create($itemData);
            }

            $pr->history()->create([
                'action' => HistoryAction::Created,
                'from_status' => null,
                'to_status' => RequestStatus::Draft,
                'actor_id' => $user->id,
                'comment' => null,
                'created_at' => Carbon::now(),
            ]);

            return $pr->load(['requester', 'items', 'history.actor']);
        });
    }

    /**
     * Update an existing draft purchase request.
     *
     * @param  array{notes?: ?string, items: array<int, array{name: string, qty: int, unit_price: int}>}  $data
     */
    public function updateDraft(PurchaseRequest $request, User $user, array $data): PurchaseRequest
    {
        if ($request->requester_id !== $user->id) {
            throw new AccessDeniedHttpException('Anda tidak berhak mengedit request milik pengguna lain.');
        }

        if (! $request->isDraft()) {
            throw new InvalidStateException('Hanya request berstatus Draft yang dapat diedit.');
        }

        if (empty($data['items'])) {
            throw ValidationException::withMessages([
                'items' => 'Minimal 1 item valid diperlukan pada purchase request.',
            ]);
        }

        return DB::transaction(function () use ($request, $user, $data): PurchaseRequest {
            $lockedRequest = PurchaseRequest::query()
                ->where('id', $request->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedRequest->isDraft()) {
                throw new InvalidStateException('Hanya request berstatus Draft yang dapat diedit.');
            }

            $calculated = $this->calculateTotals($data['items']);

            $lockedRequest->items()->delete();
            foreach ($calculated['items'] as $itemData) {
                $lockedRequest->items()->create($itemData);
            }

            $updateData = [
                'total_amount' => $calculated['total'],
                'notes' => $data['notes'] ?? null,
                'version' => $lockedRequest->version + 1,
            ];

            if (isset($data['priority'])) {
                $updateData['priority'] = $data['priority'] instanceof RequestPriority
                    ? $data['priority']
                    : RequestPriority::tryFrom((string)$data['priority']) ?? RequestPriority::Medium;
            }

            $lockedRequest->update($updateData);

            $lockedRequest->history()->create([
                'action' => HistoryAction::Edited,
                'from_status' => RequestStatus::Draft,
                'to_status' => RequestStatus::Draft,
                'actor_id' => $user->id,
                'comment' => null,
                'created_at' => Carbon::now(),
            ]);

            return $lockedRequest->load(['requester', 'items', 'history.actor']);
        });
    }

    /**
     * Submit a draft purchase request.
     */
    public function submit(PurchaseRequest $request, User $user): PurchaseRequest
    {
        if ($request->requester_id !== $user->id) {
            throw new AccessDeniedHttpException('Anda hanya dapat men-submit request milik Anda sendiri.');
        }

        if (! $request->isDraft()) {
            throw new InvalidStateException('Hanya request berstatus Draft yang dapat disubmit.');
        }

        return DB::transaction(function () use ($request, $user): PurchaseRequest {
            $lockedRequest = PurchaseRequest::query()
                ->where('id', $request->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedRequest->isDraft()) {
                throw new InvalidStateException('Hanya request berstatus Draft yang dapat disubmit.');
            }

            if ($lockedRequest->items()->count() === 0) {
                throw ValidationException::withMessages([
                    'items' => 'Minimal 1 item valid diperlukan untuk mengajukan request.',
                ]);
            }

            $lockedRequest->update([
                'status' => RequestStatus::Submitted,
                'submitted_at' => Carbon::now(),
            ]);

            $lockedRequest->history()->create([
                'action' => HistoryAction::Submitted,
                'from_status' => RequestStatus::Draft,
                'to_status' => RequestStatus::Submitted,
                'actor_id' => $user->id,
                'comment' => null,
                'created_at' => Carbon::now(),
            ]);

            return $lockedRequest->load(['requester', 'items', 'history.actor']);
        });
    }

    /**
     * Approve a submitted purchase request.
     */
    public function approve(PurchaseRequest $request, User $user, ?string $comment = null): PurchaseRequest
    {
        if (! $user->isManager()) {
            throw new AccessDeniedHttpException('Hanya manajer yang berwenang menyetujui request.');
        }

        if ($request->requester_id === $user->id) {
            throw new AccessDeniedHttpException('Manajer tidak dapat menyetujui request miliknya sendiri.');
        }

        return DB::transaction(function () use ($request, $user, $comment): PurchaseRequest {
            $lockedRequest = PurchaseRequest::query()
                ->where('id', $request->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedRequest->isSubmitted()) {
                throw new InvalidStateException('Hanya request berstatus Submitted yang dapat disetujui.');
            }

            $lockedRequest->update([
                'status' => RequestStatus::Approved,
                'decided_at' => Carbon::now(),
            ]);

            $lockedRequest->history()->create([
                'action' => HistoryAction::Approved,
                'from_status' => RequestStatus::Submitted,
                'to_status' => RequestStatus::Approved,
                'actor_id' => $user->id,
                'comment' => $comment ? trim($comment) : null,
                'created_at' => Carbon::now(),
            ]);

            return $lockedRequest->load(['requester', 'items', 'history.actor']);
        });
    }

    /**
     * Reject a submitted purchase request.
     */
    public function reject(PurchaseRequest $request, User $user, string $comment): PurchaseRequest
    {
        if (! $user->isManager()) {
            throw new AccessDeniedHttpException('Hanya manajer yang berwenang menolak request.');
        }

        if ($request->requester_id === $user->id) {
            throw new AccessDeniedHttpException('Manajer tidak dapat menolak request miliknya sendiri.');
        }

        $trimmedComment = trim($comment);
        if ($trimmedComment === '') {
            throw ValidationException::withMessages([
                'comment' => 'Alasan penolakan wajib diisi.',
            ]);
        }

        return DB::transaction(function () use ($request, $user, $trimmedComment): PurchaseRequest {
            $lockedRequest = PurchaseRequest::query()
                ->where('id', $request->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedRequest->isSubmitted()) {
                throw new InvalidStateException('Hanya request berstatus Submitted yang dapat ditolak.');
            }

            $lockedRequest->update([
                'status' => RequestStatus::Rejected,
                'decided_at' => Carbon::now(),
            ]);

            $lockedRequest->history()->create([
                'action' => HistoryAction::Rejected,
                'from_status' => RequestStatus::Submitted,
                'to_status' => RequestStatus::Rejected,
                'actor_id' => $user->id,
                'comment' => $trimmedComment,
                'created_at' => Carbon::now(),
            ]);

            return $lockedRequest->load(['requester', 'items', 'history.actor']);
        });
    }
}
