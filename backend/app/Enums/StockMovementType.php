<?php

namespace App\Enums;

enum StockMovementType: string
{
    case Sale = 'sale';
    case Void = 'void';
    case Restock = 'restock';
    case Damage = 'damage';
    case Correction = 'correction';

    public function label(): string
    {
        return match ($this) {
            self::Sale => 'Sale',
            self::Void => 'Void',
            self::Restock => 'Restock',
            self::Damage => 'Damage',
            self::Correction => 'Correction',
        };
    }
}
