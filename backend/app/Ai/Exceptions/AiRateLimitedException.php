<?php

namespace App\Ai\Exceptions;

class AiRateLimitedException extends AiException
{
    public function __construct(string $message = 'Too many AI scan requests. Please wait a moment before trying again.', ?\Throwable $previous = null)
    {
        parent::__construct($message, 'ai_rate_limited', 429, $previous);
    }
}
