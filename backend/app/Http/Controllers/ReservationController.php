<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReservationRequest;
use App\Http\Requests\UploadProofRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Models\Service;
use App\Models\Therapist;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReservationController extends Controller
{
    /**
     * List the authenticated customer's own reservations.
     */
    public function index(Request $request): JsonResponse
    {
        // Lazy Cancellation: Cancel any expired pending reservations in the database first
        Reservation::expired()->update(['status' => Reservation::STATUS_CANCELLED]);

        $reservations = Reservation::with(['service', 'therapist', 'review', 'baby'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Reservations retrieved successfully.',
            'data' => ReservationResource::collection($reservations),
        ]);
    }

    /**
     * Check slot availability for a given date and service.
     * Returns per-slot capacity info so the frontend can disable full slots.
     *
     * GET /api/slot-availability?date=YYYY-MM-DD&service_id=1
     */
    public function checkSlotAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
        ]);

        $date = $request->date;
        $service = Service::where('id', $request->service_id)->where('is_active', true)->firstOrFail();

        // Total active therapists = total capacity per time slot
        $totalCapacity = Therapist::where('is_active', true)->count();

        // Predefined time slots (Jam Kerja 08:30 - 16:30, Istirahat 12:00 - 13:00)
        $timeSlots = ['08:30', '09:30', '10:30', '11:30', '13:00', '14:00', '15:00', '16:00'];

        $slots = [];

        foreach ($timeSlots as $slotTime) {
            $startTime = Carbon::createFromFormat('H:i', $slotTime);
            $endTime = $startTime->copy()->addMinutes($service->duration_minutes);

            // Count how many active reservations overlap with this slot
            $booked = Reservation::where('reservation_date', $date)
                ->whereNotIn('status', [Reservation::STATUS_CANCELLED])
                ->where('start_time', '<', $endTime->format('H:i:s'))
                ->where('end_time', '>', $startTime->format('H:i:s'))
                ->count();

            $available = max(0, $totalCapacity - $booked);

            $slots[$slotTime] = [
                'available' => $available,
                'booked' => $booked,
                'is_full' => $available === 0,
            ];
        }

        return response()->json([
            'success' => true,
            'message' => 'Slot availability retrieved successfully.',
            'data' => [
                'date' => $date,
                'total_capacity' => $totalCapacity,
                'slots' => $slots,
            ],
        ]);
    }

    /**
     * Create a new reservation with capacity-based conflict checking and slot locking.
     *
     * New logic: A slot is FULL when ALL active therapists are already booked
     * at that time, not when just one therapist is busy. This properly handles
     * the 2-therapist capacity of the spa.
     */
    public function store(StoreReservationRequest $request): JsonResponse
    {
        try {
            return DB::transaction(function () use ($request): JsonResponse {
                // 1. Load the requested service
                $service = Service::where('id', $request->service_id)
                    ->where('is_active', true)
                    ->firstOrFail();

                // 2. Calculate start & end times
                $startTime = Carbon::createFromFormat('H:i', $request->start_time);
                $endTime = $startTime->copy()->addMinutes($service->duration_minutes);

                // 3. Capacity check: count active reservations overlapping this slot
                $totalActiveTherapists = Therapist::where('is_active', true)->count();

                if ($totalActiveTherapists === 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Maaf, tidak ada terapis yang tersedia saat ini. Silakan hubungi kami.',
                        'data' => null,
                    ], 409);
                }

                $overlappingReservations = Reservation::where('reservation_date', $request->reservation_date)
                    ->whereNotIn('status', [Reservation::STATUS_CANCELLED])
                    ->where('start_time', '<', $endTime->format('H:i:s'))
                    ->where('end_time', '>', $startTime->format('H:i:s'))
                    ->lockForUpdate()
                    ->get();

                $occupiedCount = $overlappingReservations->count();

                // 4. Slot is full if all therapists are already assigned
                if ($occupiedCount >= $totalActiveTherapists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Maaf, semua terapis kami sudah penuh di jam tersebut. Silakan pilih jam lain.',
                        'data' => null,
                    ], 409);
                }

                // 5. Therapist Assignment
                $assignedTherapistId = null;

                if ($request->therapist_id) {
                    // Check if the specifically-requested therapist is still free in this slot
                    $isTherapistBusy = $overlappingReservations
                        ->where('therapist_id', $request->therapist_id)
                        ->isNotEmpty();

                    if ($isTherapistBusy) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Terapis pilihan Anda tidak tersedia di jam tersebut. Silakan pilih "Bebas / Mana Saja" atau ganti jam.',
                            'data' => null,
                        ], 409);
                    }
                    $assignedTherapistId = $request->therapist_id;
                } else {
                    // Auto-assign: find first active therapist not yet assigned in this slot
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

                // 6. Resolve Baby profile
                $isMomTreatment = $service->category === 'mom_treatment';

                $babyName = null;
                $babyAge  = null;
                $notes    = $request->notes;

                if ($isMomTreatment) {
                    // Mom-only service: no baby data needed, skip entirely
                    $babyName = null;
                    $babyAge  = null;
                } elseif ($request->filled('baby_id')) {
                    $baby     = $request->user()->babies()->findOrFail($request->baby_id);
                    $babyName = $baby->name;
                    $babyAge  = (int) Carbon::parse($baby->birth_date)->diffInMonths(Carbon::parse($request->reservation_date));
                    $notes    = $request->notes ?? $baby->notes;
                } else {
                    // Manual input — must supply baby_name & baby_age
                    if (! $request->baby_name || ! $request->baby_age) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Data bayi wajib diisi (nama & usia) untuk layanan ini.',
                            'data'    => null,
                        ], 422);
                    }
                    $babyName = $request->baby_name;
                    $babyAge  = $request->baby_age;
                }

                // 7. Generate unique booking code: BSP-YYYYMMDD-XXXXX
                $bookingCode = $this->generateBookingCode($request->reservation_date);

                // 8. Create reservation — pending with 15-minute expiry
                $reservation = Reservation::create([
                    'booking_code'     => $bookingCode,
                    'user_id'          => $request->user()->id,
                    'service_id'       => $service->id,
                    'therapist_id'     => $assignedTherapistId,
                    'baby_id'          => $isMomTreatment ? null : $request->baby_id,
                    'reservation_date' => $request->reservation_date,
                    'start_time'       => $startTime->format('H:i:s'),
                    'end_time'         => $endTime->format('H:i:s'),
                    'total_price'      => $service->price,
                    'status'           => Reservation::STATUS_PENDING,
                    'expires_at'       => now()->addMinutes(15),
                    'baby_name'        => $babyName,
                    'baby_age'         => $babyAge,
                    'notes'            => $notes,
                    'delivery_address' => $request->delivery_address,
                ]);

                $reservation->load(['service', 'therapist', 'baby']);

                return response()->json([
                    'success' => true,
                    'message' => 'Reservasi berhasil dibuat! Silakan selesaikan pembayaran dalam 15 menit.',
                    'data' => new ReservationResource($reservation),
                ], 201);
            });
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan atau sedang tidak aktif.',
                'data' => null,
            ], 404);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat reservasi: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Upload QRIS payment proof image and set status to waiting_verification.
     */
    public function uploadProof(UploadProofRequest $request, Reservation $reservation): JsonResponse
    {
        try {
            // Ensure the reservation belongs to the authenticated user
            if ($reservation->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak diizinkan mengunggah bukti pembayaran untuk reservasi ini.',
                    'data' => null,
                ], 403);
            }

            // Only pending reservations can have proof uploaded
            if ($reservation->status !== Reservation::STATUS_PENDING) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bukti pembayaran hanya bisa diunggah untuk reservasi yang masih pending.',
                    'data' => null,
                ], 422);
            }

            // Delete old proof file if it exists
            if ($reservation->payment_proof_path) {
                Storage::disk('public')->delete($reservation->payment_proof_path);
            }

            // Store file under public/payment-proofs/
            $path = $request->file('payment_proof')
                ->store('payment-proofs', 'public');

            $reservation->update([
                'payment_proof_path' => $path,
                'status' => Reservation::STATUS_WAITING_VERIFICATION,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.',
                'data' => new ReservationResource($reservation->load(['service', 'therapist'])),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengunggah bukti pembayaran: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Customer reschedules their own active reservation to a new date and time.
     * POST /api/reservations/{reservation}/reschedule
     */
    public function reschedule(Request $request, Reservation $reservation): JsonResponse
    {
        // Ensure reservation belongs to current user
        if ($reservation->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak diizinkan mengubah jadwal reservasi ini.',
                'data' => null,
            ], 403);
        }

        // Only active reservations (pending, waiting_verification, or confirmed) can be rescheduled
        if (
            !in_array($reservation->status, [
                Reservation::STATUS_PENDING,
                Reservation::STATUS_WAITING_VERIFICATION,
                Reservation::STATUS_CONFIRMED,
            ])
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya reservasi aktif yang bisa diubah jadwalnya.',
                'data' => null,
            ], 422);
        }

        $request->validate([
            'reservation_date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            return DB::transaction(function () use ($request, $reservation): JsonResponse {
                $service = $reservation->service ?? $reservation->load('service')->service;
                $startTime = Carbon::createFromFormat('H:i', $request->start_time);
                $endTime = $startTime->copy()->addMinutes($service->duration_minutes);
                $newDate = $request->reservation_date;

                // Capacity check at new slot
                $totalActiveTherapists = Therapist::where('is_active', true)->count();

                $overlappingReservations = Reservation::where('reservation_date', $newDate)
                    ->whereNotIn('status', [Reservation::STATUS_CANCELLED])
                    ->where('id', '!=', $reservation->id)
                    ->where('start_time', '<', $endTime->format('H:i:s'))
                    ->where('end_time', '>', $startTime->format('H:i:s'))
                    ->lockForUpdate()
                    ->get();

                if ($overlappingReservations->count() >= $totalActiveTherapists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Maaf, semua terapis sudah penuh di jam tersebut. Silakan pilih waktu lain.',
                        'data' => null,
                    ], 409);
                }

                // Re-assign therapist for the new slot
                $busyTherapistIds = $overlappingReservations
                    ->pluck('therapist_id')
                    ->filter()
                    ->toArray();

                $availableTherapist = Therapist::where('is_active', true)
                    ->whereNotIn('id', $busyTherapistIds)
                    ->orderBy('id')
                    ->first();

                $assignedTherapistId = $availableTherapist?->id ?? $reservation->therapist_id;

                $newNotes = $request->notes
                    ? ($reservation->notes ? $reservation->notes . ' | [Rescheduled]: ' . $request->notes : '[Rescheduled]: ' . $request->notes)
                    : ($reservation->notes && str_contains($reservation->notes, '[Rescheduled]') ? $reservation->notes : ($reservation->notes ? $reservation->notes . ' | [Rescheduled]' : '[Rescheduled]'));

                $reservation->update([
                    'reservation_date' => $newDate,
                    'start_time' => $startTime->format('H:i:s'),
                    'end_time' => $endTime->format('H:i:s'),
                    'therapist_id' => $assignedTherapistId,
                    'notes' => $newNotes,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Jadwal sesi spa berhasil diubah ke ' . Carbon::parse($newDate)->translatedFormat('d F Y') . ' jam ' . $request->start_time . '!',
                    'data' => new ReservationResource($reservation->fresh()->load(['service', 'therapist', 'baby'])),
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengubah jadwal: ' . $e->getMessage(),
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
