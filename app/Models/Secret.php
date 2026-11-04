<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Ein verschlüsseltes Secret. Der Server kennt nur Ciphertext, Verifier und Metadaten (docs/SPEC.md).
 * Die `id` (128 Bit Zufall, base64url) ist zugleich Primär- und öffentlicher Schlüssel (ADR 0003).
 */
class Secret extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'destroyed_at' => 'datetime', 'created_at' => 'datetime'];
    }

    /** Nicht vernichtet und nicht abgelaufen. Unbekannt, abgelaufen, vernichtet und verbraucht sehen danach gleich aus. */
    public function scopeAvailableAt(Builder $query, CarbonInterface $now): Builder
    {
        return $query->whereNull('destroyed_at')->where('expires_at', '>', $now);
    }
}
