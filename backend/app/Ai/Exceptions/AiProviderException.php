<?php

namespace App\Ai\Exceptions;

class AiProviderException extends AiException
{
    public function __construct(string $message = 'AI provider request failed.', int $statusCode = 502, ?\Throwable $previous = null)
    {
        parent::__construct($message, 'ai_provider_error', $statusCode, $previous);
    }
}
