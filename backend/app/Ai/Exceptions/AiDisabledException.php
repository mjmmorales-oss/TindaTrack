<?php

namespace App\Ai\Exceptions;

class AiDisabledException extends AiException
{
    public function __construct(string $message = 'AI features are currently disabled in store settings.', ?\Throwable $previous = null)
    {
        parent::__construct($message, 'ai_disabled', 403, $previous);
    }
}
