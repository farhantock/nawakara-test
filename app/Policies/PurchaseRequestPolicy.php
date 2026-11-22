<?php

namespace App\Policies;

use App\Models\PurchaseRequest;
use App\Models\User;

class PurchaseRequestPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, PurchaseRequest $request): bool
    {
        if ($user->isManager()) {
            return ! $request->isDraft();
        }

        return $user->id === $request->requester_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isEmployee();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, PurchaseRequest $request): bool
    {
        return $user->id === $request->requester_id;
    }

    /**
     * Determine whether the user can submit the model.
     */
    public function submit(User $user, PurchaseRequest $request): bool
    {
        return $user->id === $request->requester_id;
    }

    /**
     * Determine whether the user can approve the model.
     */
    public function approve(User $user, PurchaseRequest $request): bool
    {
        return $user->isManager() && $user->id !== $request->requester_id;
    }

    /**
     * Determine whether the user can reject the model.
     */
    public function reject(User $user, PurchaseRequest $request): bool
    {
        return $user->isManager() && $user->id !== $request->requester_id;
    }
}
