<?php

namespace App\Http\Controllers\Api;

use App\Enums\RequestPriority;
use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ApprovePurchaseRequestRequest;
use App\Http\Requests\RejectPurchaseRequestRequest;
use App\Http\Requests\StorePurchaseRequestRequest;
use App\Http\Requests\UpdatePurchaseRequestRequest;
use App\Models\PurchaseRequest;
use App\Services\PurchaseRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PurchaseRequestController extends Controller
{

    public function __construct(
        public PurchaseRequestService $purchaseRequestService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = PurchaseRequest::query()->with(['requester', 'items', 'history.actor']);

        if ($user->isEmployee()) {
            $query->where('requester_id', $user->id);
        }

        if ($user->isManager()) {
            $query->where('status', '!=', RequestStatus::Draft);
        }

        if ($request->filled('approval')) {
            $approvalType = strtolower((string) $request->query('approval'));
            if ($approvalType === 'need_approval') {
                $query->where('status', RequestStatus::Submitted);
                if ($user->isManager()) {
                    $query->where('requester_id', '!=', $user->id);
                }
            } elseif ($approvalType === 'approved') {
                $query->where('status', RequestStatus::Approved);
            } elseif ($approvalType === 'rejected') {
                $query->where('status', RequestStatus::Rejected);
            }
        }

        if ($request->filled('status')) {
            $statusInput = strtoupper((string) $request->query('status'));
            $status = RequestStatus::tryFrom($statusInput);
            if ($status !== null) {
                $query->where('status', $status);
            }
        }

        if ($request->filled('priority')) {
            $priorityInput = strtoupper((string) $request->query('priority'));
            $priority = RequestPriority::tryFrom($priorityInput);
            if ($priority !== null) {
                $query->where('priority', $priority);
            }
        }

        $requests = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'data' => $requests,
        ], 200);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $pr = PurchaseRequest::query()
            ->with(['requester', 'items', 'history.actor'])
            ->find($id);

        if (! $pr) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        if ($user->isEmployee() && $pr->requester_id !== $user->id) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        if ($user->isManager() && $pr->isDraft()) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        return response()->json($pr, 200);
    }

    public function store(StorePurchaseRequestRequest $request): JsonResponse
    {
        Gate::authorize('create', PurchaseRequest::class);

        $created = $this->purchaseRequestService->createDraft(
            $request->user(),
            $request->validated()
        );

        return response()->json($created, 201);
    }

    public function update(UpdatePurchaseRequestRequest $request, int $id): JsonResponse
    {
        $user = $request->user();

      
        $pr = PurchaseRequest::query()->find($id);

        if (! $pr) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        Gate::authorize('update', $pr);

        $updated = $this->purchaseRequestService->updateDraft(
            $pr,
            $user,
            $request->validated()
        );

        return response()->json($updated, 200);
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

      
        $pr = PurchaseRequest::query()->find($id);

        if (! $pr) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        Gate::authorize('submit', $pr);

        $submitted = $this->purchaseRequestService->submit($pr, $user);

        return response()->json($submitted, 200);
    }

    public function approve(ApprovePurchaseRequestRequest $request, int $id): JsonResponse
    {
        $user = $request->user();

      
        $pr = PurchaseRequest::query()->find($id);

        if (! $pr) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        Gate::authorize('approve', $pr);

        $approved = $this->purchaseRequestService->approve(
            $pr,
            $user,
            $request->validated('comment')
        );

        return response()->json($approved, 200);
    }

    public function reject(RejectPurchaseRequestRequest $request, int $id): JsonResponse
    {
        $user = $request->user();

      
        $pr = PurchaseRequest::query()->find($id);

        if (! $pr) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        Gate::authorize('reject', $pr);

        $rejected = $this->purchaseRequestService->reject(
            $pr,
            $user,
            (string) $request->validated('comment')
        );

        return response()->json($rejected, 200);
    }

   
    public function history(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

      
        $pr = PurchaseRequest::query()->with('history.actor')->find($id);

        if (! $pr) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        if ($user->isEmployee() && $pr->requester_id !== $user->id) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        if ($user->isManager() && $pr->isDraft()) {
            throw new NotFoundHttpException('Request tidak ditemukan.');
        }

        return response()->json($pr->history, 200);
    }
}
