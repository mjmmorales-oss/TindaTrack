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
            self::Sale => 'Benta (Sale)',
            self::Void => 'Kanselado (Void)',
            self::Restock => 'Dagdag Paninda (Restock)',
            self::Damage => 'Sira / Bawas (Damage)',
            self::Correction => 'Pagwawasto (Correction)',
        };
    }
}
