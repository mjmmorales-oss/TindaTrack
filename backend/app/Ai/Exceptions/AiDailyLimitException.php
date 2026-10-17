<?php

namespace App\Ai\Exceptions;

class AiDailyLimitException extends AiException
{
    public function __construct(string $message = 'Daily store AI quota reached. Standard barcode scanning remains available.', ?\Throwable $previous = null)
    {
        parent::__construct($message, 'ai_daily_limit', 429, $previous);
    }
}
