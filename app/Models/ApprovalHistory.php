<?php

namespace App\Models;

use App\Enums\HistoryAction;
use App\Enums\RequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalHistory extends Model
{
    use HasFactory;

    protected $table = 'approval_history';
    public $timestamps = false;
 
    protected $fillable = [
        'request_id',
        'action',
        'from_status',
        'to_status',
        'actor_id',
        'comment',
        'created_at',
    ];


    protected function casts(): array
    {
        return [
            'action' => HistoryAction::class,
            'from_status' => RequestStatus::class,
            'to_status' => RequestStatus::class,
            'created_at' => 'datetime',
        ];
    }

    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequest::class, 'request_id');
    }


    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
