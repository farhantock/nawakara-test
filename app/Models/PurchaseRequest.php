<?php

namespace App\Models;

use App\Enums\HistoryAction;
use App\Enums\RequestPriority;
use App\Enums\RequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseRequest extends Model
{
    use HasFactory;

    protected $appends = [
        'manager',
        'approver',
    ];
    protected $fillable = [
        'number',
        'requester_id',
        'status',
        'priority',
        'total_amount',
        'version',
        'notes',
        'submitted_at',
        'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => RequestStatus::class,
            'priority' => RequestPriority::class,
            'total_amount' => 'float',
            'version' => 'integer',
            'submitted_at' => 'datetime',
            'decided_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }


    public function items(): HasMany
    {
        return $this->hasMany(RequestItem::class, 'request_id');
    }


    public function history(): HasMany
    {
        return $this->hasMany(ApprovalHistory::class, 'request_id')->orderBy('id', 'asc');
    }

    public function getManagerAttribute(): ?User
    {
        return $this->getApproverAttribute();
    }

    public function getApproverAttribute(): ?User
    {
        if ($this->relationLoaded('history')) {
            $decided = $this->history->first(fn ($h) => in_array($h->action, [HistoryAction::Approved, HistoryAction::Rejected], true) || in_array($h->to_status, [RequestStatus::Approved, RequestStatus::Rejected], true));
            return $decided?->actor;
        }

        return $this->history()
            ->whereIn('action', [HistoryAction::Approved, HistoryAction::Rejected])
            ->latest('id')
            ->first()
            ?->actor;
    }

    public function isDraft(): bool
    {
        return $this->status === RequestStatus::Draft;
    }


    public function isSubmitted(): bool
    {
        return $this->status === RequestStatus::Submitted;
    }


    public function isApproved(): bool
    {
        return $this->status === RequestStatus::Approved;
    }

    public function isRejected(): bool
    {
        return $this->status === RequestStatus::Rejected;
    }

    public function isFinal(): bool
    {
        return $this->isApproved() || $this->isRejected();
    }
}
