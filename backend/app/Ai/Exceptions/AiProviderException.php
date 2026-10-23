<?php

namespace App\Ai\Exceptions;

class AiProviderException extends AiException
{
    /**
     * @param  int|null  $upstreamStatus  The provider's own HTTP status (for ai:ping diagnostics only;
     *                                    the SPA always gets $statusCode)
     */
    public function __construct(
        string $message = 'AI provider request failed.',
        int $statusCode = 502,
        ?\Throwable $previous = null,
        public readonly ?int $upstreamStatus = null,
    ) {
        parent::__construct($message, 'ai_provider_error', $statusCode, $previous);
    }
}
