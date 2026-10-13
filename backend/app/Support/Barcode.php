<?php

namespace App\Support;

class Barcode
{
    /**
     * Trims and strips spaces/dashes. A 12-digit UPC-A becomes EAN-13 by prefixing '0'.
     */
    public static function normalize(string $barcode): string
    {
        $cleaned = preg_replace('/[\s-]+/', '', trim($barcode)) ?? '';

        if (preg_match('/^\d{12}$/', $cleaned)) {
            return '0'.$cleaned;
        }

        return $cleaned;
    }

    /**
     * Computes the GS1 Modulo-10 check digit for a string of numeric digits.
     */
    public static function computeCheckDigit(string $digitsWithoutCheck): int
    {
        $sum = 0;
        $length = strlen($digitsWithoutCheck);

        for ($i = 0; $i < $length; $i++) {
            $digit = (int) $digitsWithoutCheck[$length - 1 - $i];
            $weight = ($i % 2 === 0) ? 3 : 1;
            $sum += $digit * $weight;
        }

        return (10 - ($sum % 10)) % 10;
    }

    /**
     * Verifies the EAN-8, EAN-13, or UPC-A check digit.
     */
    public static function isValidGtin(string $barcode): bool
    {
        $normalized = self::normalize($barcode);

        if (! ctype_digit($normalized)) {
            return false;
        }

        $length = strlen($normalized);
        if (! in_array($length, [8, 12, 13, 14], true)) {
            return false;
        }

        $expected = self::computeCheckDigit(substr($normalized, 0, -1));
        $actual = (int) substr($normalized, -1);

        return $expected === $actual;
    }

    /**
     * True for codes starting with '20' through '29' (GS1 restricted-circulation range).
     */
    public static function isInternal(string $barcode): bool
    {
        $normalized = self::normalize($barcode);

        return (bool) preg_match('/^2[0-9]/', $normalized);
    }

    /**
     * True for a valid GTIN, OR an internal code, OR an alphanumeric code of 4 to 32 characters ([A-Za-z0-9-]).
     */
    public static function isAcceptable(string $barcode): bool
    {
        $trimmed = trim($barcode);
        if (strlen($trimmed) < 4 || strlen($trimmed) > 32) {
            return false;
        }

        $normalized = self::normalize($barcode);

        // If purely numeric
        if (ctype_digit($normalized)) {
            $len = strlen($normalized);
            if ($len < 4 || $len > 32) {
                return false;
            }

            if (in_array($len, [8, 13], true)) {
                if (self::isInternal($normalized)) {
                    return true;
                }

                return self::isValidGtin($normalized);
            }

            if (self::isInternal($normalized)) {
                return true;
            }

            return true;
        }

        // Custom alphanumeric code (must match [A-Za-z0-9-] between 4 and 32 chars)
        return (bool) preg_match('/^[A-Za-z0-9-]{4,32}$/', $trimmed);
    }

    /**
     * Builds a valid EAN-13 = "20" + 10-digit zero-padded sequence + check digit.
     */
    public static function makeInternal(int $sequence): string
    {
        $digits = '20'.sprintf('%010d', $sequence);
        $check = self::computeCheckDigit($digits);

        return $digits.$check;
    }
}
