<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return [
        'name' => config('app.name', 'TindaTrack API'),
        'status' => 'ok',
    ];
});
