<?php

namespace Database\Factories;

use App\Models\AiScanImage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiScanImage>
 */
class AiScanImageFactory extends Factory
{
    protected $model = AiScanImage::class;

    public function definition(): array
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');

        return [
            'ai_scan_id' => null,
            'mime_type' => 'image/png',
            'image_size' => strlen($png),
            'image_data' => $png,
        ];
    }
}
