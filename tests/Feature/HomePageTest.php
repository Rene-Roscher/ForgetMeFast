<?php

it('renders the Inertia home page', function () {
    $this->get('/')
        ->assertOk()
        ->assertSee('"component":"Home"', escape: false);
});
