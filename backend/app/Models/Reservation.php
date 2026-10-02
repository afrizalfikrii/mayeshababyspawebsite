<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'booking_code',
        'user_id',
        'service_id',
        'reservation_date',
        'start_time',
        'end_time',
        'total_price',
        'payment_proof_path',
        'status',
        'expires_at',
        'baby_name',
        'baby_age',
        'notes',
        'delivery_address',
        'therapist_id',
        'baby_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'reservation_date' => 'date',
        'total_price'      => 'decimal:2',
        'expires_at'       => 'datetime',
        'baby_age'         => 'integer',
    ];

    /**
     * Reservation status constants.
     */
    const STATUS_PENDING              = 'pending';
    const STATUS_WAITING_VERIFICATION = 'waiting_verification';
    const STATUS_CONFIRMED            = 'confirmed';
    const STATUS_CANCELLED            = 'cancelled';
    const STATUS_COMPLETED            = 'completed';

    /**
     * The total number of therapists that can serve simultaneously.
     * Used for capacity-based slot locking.
     * This is a soft config — the real source of truth is the therapists table.
     */
    const CAPACITY_PER_SLOT = 2;

    /**
     * Get the user who made the reservation.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the service for this reservation.
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Get the therapist assigned to this reservation.
     */
    public function therapist(): BelongsTo
    {
        return $this->belongsTo(Therapist::class);
    }

    /**
     * Get the review left for this reservation.
     */
    public function review(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Review::class);
    }

    /**
     * Get the baby profile assigned to this reservation.
     */
    public function baby(): BelongsTo
    {
        return $this->belongsTo(Baby::class);
    }

    /**
     * Scope: only non-cancelled reservations.
     */
    public function scopeActive($query)
    {
        return $query->where('status', '!=', self::STATUS_CANCELLED);
    }

    /**
     * Scope: only pending and expired reservations.
     */
    public function scopeExpired($query)
    {
        return $query->where('status', self::STATUS_PENDING)
                     ->where('expires_at', '<', now());
    }
}
