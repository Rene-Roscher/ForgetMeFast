<?php

namespace App\Actions;

use Carbon\CarbonImmutable;

final readonly class OpenResult
{
    private function __construct(
        public string $status,
        public int $attemptsLeft = 0,
        public ?string $iv = null,
        public ?string $ciphertext = null,
        public int $viewsLeft = 0,
        public ?CarbonImmutable $expiresAt = null,
    ) {}

    public static function unavailable(): self
    {
        return new self('unavailable');
    }

    public static function invalid(int $attemptsLeft): self
    {
        return new self('invalid', attemptsLeft: $attemptsLeft);
    }

    public static function opened(string $iv, string $ciphertext, int $viewsLeft, CarbonImmutable $expiresAt): self
    {
        return new self('opened', iv: $iv, ciphertext: $ciphertext, viewsLeft: $viewsLeft, expiresAt: $expiresAt);
    }
}
