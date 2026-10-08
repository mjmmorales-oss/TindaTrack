<?php

namespace App\Enums;

enum PaymentType: string
{
    case Cash = 'cash';
    case Utang = 'utang';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Cash',
            self::Utang => 'Utang',
        };
    }
}
