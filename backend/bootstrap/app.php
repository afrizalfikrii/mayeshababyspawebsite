<?php

use App\Http\Middleware\CheckRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust reverse proxies (Render / Cloudflare) for accurate client IP rate-limiting
        $middleware->trustProxies(at: '*');

        // Register role middleware alias
        $middleware->alias([
            'role' => CheckRole::class,
        ]);

        // Prepend CORS headers to ALL API requests
        // Using Laravel's built-in HandleCors (fruitcake/php-cors)
        $middleware->prependToGroup('api', \Illuminate\Http\Middleware\HandleCors::class);

        // Do not redirect unauthenticated API requests to a web login route
        $middleware->redirectGuestsTo(fn (Request $request) => null);

        // NOTE: statefulApi() is intentionally NOT called here.
        // We are using Bearer token authentication, NOT cookie-based SPA auth.
        // Calling statefulApi() would enable CSRF verification which breaks token-based auth.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Return JSON for all API 404 errors
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Resource not found.',
                    'data'    => null,
                ], 404);
            }
        });

        // Return JSON for unauthenticated API access
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated. Please login first.',
                    'data'    => null,
                ], 401);
            }
        });

        // Return Indonesian JSON message when rate limit (429) is exceeded
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*')) {
                $retryAfter = $e->getHeaders()['Retry-After'] ?? 60;
                return response()->json([
                    'success' => false,
                    'message' => "Terlalu banyak percobaan. Silakan tunggu {$retryAfter} detik sebelum mencoba kembali.",
                    'data'    => null,
                ], 429);
            }
        });
    })->create();
