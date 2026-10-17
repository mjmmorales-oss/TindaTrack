<?php

namespace App\Ai\Exceptions;

class AiTimeoutException extends AiException
{
    public function __construct(string $message = 'AI vision analysis timed out. Please try again or use barcode scanning.', ?\Throwable $previous = null)
    {
        parent::__construct($message, 'ai_timeout', 504, $previous);
    }
}
