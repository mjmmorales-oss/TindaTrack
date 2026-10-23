<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Parses date filters sent by the SPA into the store's timezone (Asia/Manila).
 *
 * The browser sends ISO strings in UTC ("2026-10-20T16:00:00.000Z" is midnight
 * in Manila). Laravel compares DateTimes against `created_at` as plain
 * wall-clock strings in the app timezone, so an unconverted UTC value shifts
 * every range by 8 hours. Date-only values ("2026-10-21") mean the whole day.
 */
class DateInput
{
    public static function from(?string $value): ?CarbonInterface
    {
        return self::parse($value, endOfDay: false);
    }

    public static function to(?string $value): ?CarbonInterface
    {
        return self::parse($value, endOfDay: true);
    }

    /** A moment (e.g. a payment date) converted to the store timezone. */
    public static function moment(?string $value): ?CarbonInterface
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return CarbonImmutable::parse($value)->setTimezone(config('app.timezone'));
    }

    private static function parse(?string $value, bool $endOfDay): ?CarbonInterface
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $tz = config('app.timezone');
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($value))) {
            $day = CarbonImmutable::createFromFormat('Y-m-d', trim($value), $tz);

            return $endOfDay ? $day->endOfDay() : $day->startOfDay();
        }

        return CarbonImmutable::parse($value)->setTimezone($tz);
    }
}
