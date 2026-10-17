<?php

namespace App\Console\Commands;

use App\Models\AiScanImage;
use Illuminate\Console\Command;

class AiPruneCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:prune {--days=30 : Retention window in days}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune stored AI scan images older than the retention window (default 30 days)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $query = AiScanImage::where('created_at', '<', $cutoff);
        $count = $query->count();

        if ($count === 0) {
            $this->info("No AI scan images older than {$days} days found.");

            return self::SUCCESS;
        }

        $query->delete();

        $this->info("Successfully pruned {$count} AI scan image(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
