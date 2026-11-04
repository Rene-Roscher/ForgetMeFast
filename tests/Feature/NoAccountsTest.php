<?php

use Illuminate\Support\Facades\Schema;

it('has no user, password reset or session tables', function (string $table) {
    expect(Schema::hasTable($table))->toBeFalse();
})->with(['users', 'password_reset_tokens', 'sessions']);

it('ships no user model', function () {
    expect(class_exists('App\\Models\\User'))->toBeFalse();
});
