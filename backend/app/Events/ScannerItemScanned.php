<?php

namespace App\Events;

use App\Http\Resources\ScannerEventResource;
use App\Models\ScannerEvent;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ScannerItemScanned implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ScannerEvent $event
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('scanner-session.'.$this->event->scanner_session_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'scanner.scanned';
    }

    public function broadcastWith(): array
    {
        return (new ScannerEventResource($this->event))->resolve();
    }
}
