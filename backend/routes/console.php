<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks — Baby Spa
|--------------------------------------------------------------------------
|
| This command runs every minute to automatically cancel any pending
| reservations where the 15-minute payment window has expired.
|
*/
Schedule::command('reservations:cancel-expired')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();
