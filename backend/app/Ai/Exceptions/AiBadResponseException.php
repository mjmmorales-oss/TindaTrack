<?php

namespace App\Ai\Exceptions;

class AiBadResponseException extends AiException
{
    public function __construct(string $message = 'Unable to parse AI provider response.', ?\Throwable $previous = null)
    {
        parent::__construct($message, 'ai_bad_response', 502, $previous);
    }
}
