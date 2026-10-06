<?php

test('/api/ping is public and returns status, app name, and timestamp', function () {
    $response = $this->getJson('/api/ping');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'status',
            'app',
            'time',
        ])
        ->assertJson([
            'status' => 'ok',
            'app' => 'TindaTrack',
        ]);
});
