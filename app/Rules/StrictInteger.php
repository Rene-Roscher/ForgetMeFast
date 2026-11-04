<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Nur echte JSON-Ganzzahlen, keine numerischen Strings, innerhalb von min..max oder aus einer Liste. */
final class StrictInteger implements ValidationRule
{
    /** @param  list<int>|null  $allowed */
    public function __construct(private readonly int $min = PHP_INT_MIN, private readonly int $max = PHP_INT_MAX, private readonly ?array $allowed = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $ok = is_int($value) && $value >= $this->min && $value <= $this->max
            && ($this->allowed === null || in_array($value, $this->allowed, true));
        if (! $ok) {
            $fail('The :attribute is invalid.');
        }
    }
}
