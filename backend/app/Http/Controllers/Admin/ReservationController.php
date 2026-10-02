<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminRescheduleRequest;
use App\Http\Requests\VerifyReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Models\Service;
use App\Models\Therapist;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReservationController extends Controller
{
    /**
     * List all reservations with filters (admin).
     */
    public function index(Request $request): JsonResponse
    {
        // Lazy Cancellation: Cancel any expired pending reservations in the database first
        Reservation::expired()->update(['status' => Reservation::STATUS_CANCELLED]);

        $query = Reservation::with(['user', 'service', 'therapist', 'baby'])->latest();

        // Optional filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Optional filter by date
        if ($request->filled('date')) {
            $query->where('reservation_date', $request->date);
        }

        $reservations = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'All reservations retrieved successfully.',
            'data' => ReservationResource::collection($reservations),
        ]);
    }

    /**
     * Get admin dashboard summary statistics.
     */
    public function stats(): JsonResponse
    {
        // Run lazy cancellation first so stats are accurate
        Reservation::expired()->update(['status' => Reservation::STATUS_CANCELLED]);

        $today = now()->toDateString();

        $todayBookings = Reservation::whereDate('reservation_date', $today)
            ->where('status', '!=', Reservation::STATUS_CANCELLED)
            ->count();

        $totalCustomers = \App\Models\User::where('role', 'customer')->count();

        $completedSessions = Reservation::where('status', Reservation::STATUS_COMPLETED)->count();

        $revenue = Reservation::whereIn('status', [Reservation::STATUS_CONFIRMED, Reservation::STATUS_COMPLETED])
            ->sum('total_price');

        return response()->json([
            'success' => true,
            'message' => 'Statistics retrieved successfully.',
            'data' => [
                'today_bookings' => $todayBookings,
                'total_customers' => $totalCustomers,
                'completed_sessions' => $completedSessions,
                'total_revenue' => (float) $revenue,
            ],
        ]);
    }

    /**
     * Verify or update reservation status (confirm, cancel, or complete).
     */
    public function verify(VerifyReservationRequest $request, Reservation $reservation): JsonResponse
    {
        try {
            $action = $request->action;

            if ($action === 'completed') {
                // Can only complete a confirmed reservation
                if ($reservation->status !== Reservation::STATUS_CONFIRMED) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Hanya reservasi yang sudah dikonfirmasi yang bisa diselesaikan.',
                        'data' => null,
                    ], 422);
                }
                $reservation->update(['status' => Reservation::STATUS_COMPLETED]);
            } elseif ($action === 'confirmed') {
                // Admin can manually confirm a pending/waiting reservation
                // (also used to bypass walk-in that was accidentally set to pending)
                if (
                    !in_array($reservation->status, [
                        Reservation::STATUS_WAITING_VERIFICATION,
                        Reservation::STATUS_PENDING,
                    ])
                ) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Hanya reservasi pending atau menunggu verifikasi yang bisa dikonfirmasi.',
                        'data' => null,
                    ], 422);
                }
                $reservation->update(['status' => Reservation::STATUS_CONFIRMED]);
            } else {
                // cancelled action
                if ($reservation->status === Reservation::STATUS_COMPLETED) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Reservasi yang sudah selesai tidak bisa dibatalkan.',
                        'data' => null,
                    ], 422);
                }
                $reservation->update(['status' => Reservation::STATUS_CANCELLED]);
            }

            return response()->json([
                'success' => true,
                'message' => "Status reservasi berhasil diperbarui menjadi {$reservation->status}.",
                'data' => new ReservationResource($reservation->load(['user', 'service', 'therapist', 'baby'])),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui status reservasi: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Reschedule an existing reservation to a new date and time.
     *
     * Flow:
     * 1. Customer contacts admin via WhatsApp to agree on a new schedule
     * 2. Admin inputs the new date/time in this form
     * 3. System checks capacity at the new slot (same enforcement as booking)
     * 4. If available, the reservation is updated with new date/time/therapist
     * 5. Status remains 'confirmed' — no need to re-verify payment
     *
     * POST /api/admin/reservations/{reservation}/reschedule
     */
    public function reschedule(AdminRescheduleRequest $request, Reservation $reservation): JsonResponse
    {
        // Only confirmed or pending reservations can be rescheduled
        if (
            !in_array($reservation->status, [
                Reservation::STATUS_CONFIRMED,
                Reservation::STATUS_PENDING,
                Reservation::STATUS_WAITING_VERIFICATION,
            ])
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya reservasi aktif (belum selesai/dibatalkan) yang bisa direschedule.',
                'data' => null,
            ], 422);
        }

        try {
            return DB::transaction(function () use ($request, $reservation): JsonResponse {
                // Load the service to recalculate end time
                $service = $reservation->service ?? $reservation->load('service')->service;
                $startTime = Carbon::createFromFormat('H:i', $request->start_time);
                $endTime = $startTime->copy()->addMinutes($service->duration_minutes);

                $newDate = $request->reservation_date;

                // Capacity check at the NEW slot (excluding this reservation itself)
                $totalActiveTherapists = Therapist::where('is_active', true)->count();

                $overlappingReservations = Reservation::where('reservation_date', $newDate)
                    ->whereNotIn('status', [Reservation::STATUS_CANCELLED])
                    ->where('id', '!=', $reservation->id)  // Exclude current reservation
                    ->where('start_time', '<', $endTime->format('H:i:s'))
                    ->where('end_time', '>', $startTime->format('H:i:s'))
                    ->lockForUpdate()
                    ->get();

                $occupiedCount = $overlappingReservations->count();

                if ($occupiedCount >= $totalActiveTherapists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Slot baru sudah penuh di tanggal ' . Carbon::parse($newDate)->format('d/m/Y') . ' jam ' . $request->start_time . '. Pilih waktu lain.',
                        'data' => null,
                    ], 409);
                }

                // Re-assign therapist for the new slot
                $assignedTherapistId = $reservation->therapist_id;

                // Check if the previously assigned therapist is still free at the new slot
                $isPreviousTherapistBusy = $overlappingReservations
                    ->where('therapist_id', $reservation->therapist_id)
                    ->isNotEmpty();

                if ($isPreviousTherapistBusy || !$assignedTherapistId) {
                    // Previous therapist is busy at new slot — auto-assign another
                    $busyTherapistIds = $overlappingReservations
                        ->pluck('therapist_id')
                        ->filter()
                        ->toArray();

                    $availableTherapist = Therapist::where('is_active', true)
                        ->whereNotIn('id', $busyTherapistIds)
                        ->orderBy('id')
                        ->first();

                    $assignedTherapistId = $availableTherapist?->id;
                }

                // Update the reservation
                $reservation->update([
                    'reservation_date' => $newDate,
                    'start_time' => $startTime->format('H:i:s'),
                    'end_time' => $endTime->format('H:i:s'),
                    'therapist_id' => $assignedTherapistId,
                    'status' => Reservation::STATUS_CONFIRMED,
                    'expires_at' => null,  // Remove expiry after reschedule
                    'notes' => $request->notes
                        ? ($reservation->notes ? $reservation->notes . ' | [Rescheduled]: ' . $request->notes : '[Rescheduled]: ' . $request->notes)
                        : ($reservation->notes && str_contains($reservation->notes, '[Rescheduled]') ? $reservation->notes : ($reservation->notes ? $reservation->notes . ' | [Rescheduled]' : '[Rescheduled]')),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Reservasi berhasil direschedule ke ' . Carbon::parse($newDate)->translatedFormat('d F Y') . ' jam ' . $request->start_time . '.',
                    'data' => new ReservationResource($reservation->fresh()->load(['user', 'service', 'therapist', 'baby'])),
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal melakukan reschedule: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Generate a unique booking code: BSP-YYYYMMDD-XXXXX
     */
    private function generateBookingCode(string $date): string
    {
        $dateStr = Carbon::parse($date)->format('Ymd');

        do {
            $code = 'BSP-' . $dateStr . '-' . strtoupper(Str::random(5));
        } while (Reservation::where('booking_code', $code)->exists());

        return $code;
    }
}
