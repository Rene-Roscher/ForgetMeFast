<?php

use Illuminate\Foundation\DevCommands;

it('starts the app server, Vite and the scheduler with composer dev', function () {
    $names = array_column(DevCommands::commands(), 'name');
    sort($names);

    expect($names)->toBe(['scheduler', 'server', 'vite']);
});
