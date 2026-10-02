<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use Illuminate\Console\Command;

class CancelExpiredReservations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reservations:cancel-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cancel all pending reservations that have passed their expiry time.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $affected = Reservation::expired()->update(['status' => Reservation::STATUS_CANCELLED]);

        $this->info("Cancelled {$affected} expired reservation(s).");

        return self::SUCCESS;
    }
}
