<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// Auth shortcuts for reviewer convenience if directly requested
Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});

// Single-page application entry point
Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '^(?!api).*$');
