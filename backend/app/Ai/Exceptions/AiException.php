<?php

namespace App\Ai\Exceptions;

use RuntimeException;

class AiException extends RuntimeException
{
    public function __construct(
        string $message,
        protected string $errorCode = 'ai_provider_error',
        int $code = 422,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }
}
