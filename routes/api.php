<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PurchaseRequestController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::get('/requests', [PurchaseRequestController::class, 'index']);
        Route::post('/requests', [PurchaseRequestController::class, 'store']);
        Route::get('/requests/{id}', [PurchaseRequestController::class, 'show']);
        Route::put('/requests/{id}', [PurchaseRequestController::class, 'update']);
        Route::post('/requests/{id}/submit', [PurchaseRequestController::class, 'submit']);
        Route::post('/requests/{id}/approve', [PurchaseRequestController::class, 'approve']);
        Route::post('/requests/{id}/reject', [PurchaseRequestController::class, 'reject']);
        Route::get('/requests/{id}/history', [PurchaseRequestController::class, 'history']);
    });
});
