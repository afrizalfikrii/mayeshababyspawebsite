<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (! $request->user() || $request->user()->role !== $role) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. You do not have the required role to access this resource.',
                'data'    => null,
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
