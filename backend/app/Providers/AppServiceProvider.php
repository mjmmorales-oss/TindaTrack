<?php

namespace App\Providers;

use App\Ai\GeminiVisionProvider;
use App\Ai\MockVisionProvider;
use App\Ai\VisionProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(VisionProvider::class, function ($app) {
            $provider = config('ai.provider', 'mock');

            return match ($provider) {
                'gemini' => $app->make(GeminiVisionProvider::class),
                default => $app->make(MockVisionProvider::class),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }

        Model::shouldBeStrict(! app()->isProduction());

        JsonResource::withoutWrapping();

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
