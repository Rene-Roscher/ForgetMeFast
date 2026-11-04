<?php

namespace App\Http;

/**
 * Liest die Liste vertrauenswürdiger Reverse Proxys aus der Umgebung (TRUSTED_PROXIES).
 *
 * Ohne diese Angabe vertraut die App keinem Proxy und nimmt als Client-Adresse immer die Adresse der Verbindung. Hinter
 * einem Reverse Proxy (nginx, Caddy, Traefik) wäre das die Adresse des Proxys, und alle Besucher teilten sich ein
 * Throttle-Kontingent. Mit der Liste wird X-Forwarded-For nur von diesen Adressen ernst genommen, von sonst niemandem, damit
 * ein Client sich nicht beliebige Adressen geben und das Throttling umgehen kann.
 */
final class TrustedProxies
{
    /**
     * @return array<int, string>|string|null `*` für alle (nur sinnvoll, wenn der Proxy die einzige Erreichbarkeit ist), eine Liste von
     *                                        Adressen oder CIDR-Bereichen, oder null für keinen
     */
    public static function fromEnv(?string $value): array|string|null
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }
        if ($value === '*') {
            return '*';
        }

        $list = array_values(array_filter(array_map('trim', explode(',', $value)), fn (string $p) => $p !== ''));

        return $list === [] ? null : $list;
    }
}
