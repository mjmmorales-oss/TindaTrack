<?php

use App\Models\ScannerSession;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('scanner-session.{sessionId}', function (User $user, string $sessionId) {
    $session = ScannerSession::find($sessionId);

    return $session && $session->user_id === $user->id;
});
