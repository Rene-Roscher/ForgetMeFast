<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Strenges base64url ohne Padding (RFC 4648 §5) mit fester oder erlaubter Byte-Länge, kanonisch. */
final class Base64Url implements ValidationRule
{
    /** @param  list<int>  $byteLengths erlaubte Längen des dekodierten Werts */
    public function __construct(private readonly array $byteLengths) {}

    public static function bytes(int ...$lengths): self
    {
        return new self(array_values($lengths));
    }

    public static function decode(mixed $value): ?string
    {
        if (! is_string($value) || $value === '' || preg_match('/\A[A-Za-z0-9_-]+\z/', $value) !== 1 || strlen($value) % 4 === 1) {
            return null;
        }
        $raw = base64_decode(strtr($value, '-_', '+/').str_repeat('=', (4 - strlen($value) % 4) % 4), true);
        if ($raw === false || self::encode($raw) !== $value) {
            return null; // nicht kanonisch (Restbits ungleich null) oder ungültig
        }

        return $raw;
    }

    public static function encode(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $raw = self::decode($value);
        if ($raw === null || ! in_array(strlen($raw), $this->byteLengths, true)) {
            $fail('The :attribute is invalid.');
        }
    }
}
