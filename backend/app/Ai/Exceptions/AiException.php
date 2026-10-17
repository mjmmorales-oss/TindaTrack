<?php

namespace App\Ai\Exceptions;

use Illuminate\Http\JsonResponse;
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

    public function render($request): JsonResponse
    {
        $status = $this->getCode();
        if ($status < 400 || $status > 599) {
            $status = 422;
        }

        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->errorCode,
        ], $status);
    }
}
