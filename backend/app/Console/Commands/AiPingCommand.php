<?php

namespace App\Console\Commands;

use App\Ai\GeminiVisionProvider;
use App\Ai\MockVisionProvider;
use App\Ai\VisionProvider;
use Illuminate\Console\Command;

class AiPingCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:ping {--provider= : Explicitly specify provider to test (gemini, mock)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test connectivity and latency to the configured AI Vision provider';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $explicitProvider = $this->option('provider');
        if ($explicitProvider) {
            /** @var VisionProvider $provider */
            $provider = match ($explicitProvider) {
                'gemini' => app(GeminiVisionProvider::class),
                'mock' => app(MockVisionProvider::class),
                default => throw new \InvalidArgumentException("Unsupported provider [{$explicitProvider}]"),
            };
        } else {
            /** @var VisionProvider $provider */
            $provider = app(VisionProvider::class);
        }

        $this->info('Testing AI Vision connectivity...');

        $result = $provider->ping();

        $this->line('');
        $this->line("  <comment>Provider:</comment> {$result['provider']}");
        $this->line("  <comment>Model:</comment>    {$result['model']}");
        $this->line("  <comment>Latency:</comment>  {$result['latency_ms']} ms");

        if ($result['ok']) {
            $this->info("  Status:   SUCCESS - {$result['message']}");
            $this->line('');

            return self::SUCCESS;
        }

        $this->error("  Status:   FAILED - {$result['message']}");
        $this->line('');

        if (! empty($result['hint']) && $result['hint'] !== $result['message']) {
            $this->warn("  Recommendation: {$result['hint']}");
            $this->line('');
        }

        if ($result['provider'] === 'gemini' && empty(config('ai.gemini_api_key'))) {
            $this->warn('--- Setup Instructions ---');
            $this->line('1. Obtain an API key from Google AI Studio (free tier):');
            $this->line('   https://aistudio.google.com/app/apikey');
            $this->line('2. Add the key to backend/.env:');
            $this->line('   GEMINI_API_KEY=your_gemini_api_key_here');
            $this->line('3. Run php artisan ai:ping again to verify.');
            $this->line('--------------------------');
        }

        return self::FAILURE;
    }
}
