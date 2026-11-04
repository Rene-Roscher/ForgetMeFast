<!DOCTYPE html>
<html lang="de">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csp-nonce" content="{{ request()->attributes->get('csp_nonce') }}">
        <title>ForgetMeFast</title>
        @vite(['resources/css/app.css', 'resources/js/app.ts'])
        <x-inertia::head />
    </head>
    <body>
        <x-inertia::app />
    </body>
</html>
