<?php

use App\Exceptions\InvalidStateException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => $request->is('api/*') || $request->is('auth/*') || $request->is('demo-users') || $request->expectsJson(),
        );

        $exceptions->render(function (ValidationException $e, Request $request): ?JsonResponse {
            if (! $request->is('api/*') && ! $request->is('auth/*') && ! $request->is('demo-users') && ! $request->expectsJson()) {
                return null;
            }

            $flattenedFields = [];
            foreach ($e->errors() as $field => $messages) {
                $flattenedFields[$field] = $messages[0] ?? '';
            }

            return response()->json([
                'error' => [
                    'code' => 'VALIDATION_FAILED',
                    'message' => 'Validasi gagal',
                    'fields' => $flattenedFields,
                ],
            ], 422);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request): ?JsonResponse {
            if (! $request->is('api/*') && ! $request->is('auth/*') && ! $request->is('demo-users') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'Autentikasi diperlukan untuk mengakses resource ini.',
                ],
            ], 401);
        });

        $exceptions->render(function (AuthorizationException|AccessDeniedHttpException $e, Request $request): ?JsonResponse {
            if (! $request->is('api/*') && ! $request->is('auth/*') && ! $request->is('demo-users') && ! $request->expectsJson()) {
                return null;
            }

            // Section 9: Log keamanan audit trail untuk percobaan yang ditolak wewenang (403)
            $user = $request->user();
            Log::channel('audit')->warning('Aksi workflow ditolak karena wewenang', [
                'time' => now()->toIso8601String(),
                'user_id' => $user ? $user->id : null,
                'action' => $request->route() ? $request->route()->getActionMethod() : $request->method(),
                'request_id' => $request->route('id'),
                'error_code' => 'FORBIDDEN',
            ]);

            return response()->json([
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => $e->getMessage() ?: 'Anda tidak memiliki hak akses untuk tindakan ini.',
                ],
            ], 403);
        });

        $exceptions->render(function (NotFoundHttpException|ModelNotFoundException $e, Request $request): ?JsonResponse {
            if (! $request->is('api/*') && ! $request->is('auth/*') && ! $request->is('demo-users') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'NOT_FOUND',
                    'message' => 'Resource tidak ditemukan.',
                ],
            ], 404);
        });

        $exceptions->render(function (InvalidStateException|ConflictHttpException $e, Request $request): ?JsonResponse {
            if (! $request->is('api/*') && ! $request->is('auth/*') && ! $request->is('demo-users') && ! $request->expectsJson()) {
                return null;
            }

            // Section 9: Log keamanan audit trail untuk percobaan yang ditolak status (409)
            $user = $request->user();
            Log::channel('audit')->warning('Aksi workflow ditolak karena status tidak valid', [
                'time' => now()->toIso8601String(),
                'user_id' => $user ? $user->id : null,
                'action' => $request->route() ? $request->route()->getActionMethod() : $request->method(),
                'request_id' => $request->route('id'),
                'error_code' => 'INVALID_STATE',
            ]);

            return response()->json([
                'error' => [
                    'code' => 'INVALID_STATE',
                    'message' => $e->getMessage() ?: 'Transisi status tidak diizinkan.',
                ],
            ], 409);
        });

        $exceptions->render(function (HttpException $e, Request $request): ?JsonResponse {
            if (! $request->is('api/*') && ! $request->is('auth/*') && ! $request->is('demo-users') && ! $request->expectsJson()) {
                return null;
            }

            $code = match ($e->getStatusCode()) {
                401 => 'UNAUTHENTICATED',
                403 => 'FORBIDDEN',
                404 => 'NOT_FOUND',
                409 => 'INVALID_STATE',
                422 => 'VALIDATION_FAILED',
                default => 'HTTP_ERROR',
            };

            return response()->json([
                'error' => [
                    'code' => $code,
                    'message' => $e->getMessage() ?: 'Terjadi kesalahan permintaan.',
                ],
            ], $e->getStatusCode());
        });

        $exceptions->render(function (Throwable $e, Request $request): ?JsonResponse {
            if (! $request->is('api/*') && ! $request->is('auth/*') && ! $request->is('demo-users') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => 'INTERNAL_ERROR',
                    'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan internal pada server.',
                ],
            ], 500);
        });
    })->create();
