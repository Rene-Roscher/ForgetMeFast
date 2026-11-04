# syntax=docker/dockerfile:1.7
# Image für ForgetMeFast: FrankenPHP (Caddy mit PHP 8.3), ohne Dev-Abhängigkeiten, als normaler Benutzer, mit SQLite in /data.
# Basis-Images sind auf einen Digest festgenagelt; Dependabot hebt sie an (.github/dependabot.yml).

# --- 1. Oberfläche bauen (Node nur hier, nicht im fertigen Image) ------------------------------------------------------
FROM node:26.12.1-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY vite.config.ts tsconfig.json ./
COPY resources ./resources
COPY public ./public
RUN npm run build

# --- 2. PHP-Abhängigkeiten ---------------------------------------------------------------------------------------------
FROM dunglas/frankenphp:1-php8.3-alpine@sha256:df92e348a4239f51ca5519af0fb578c1eea0ccd427eaf2704d7b44cf9f680d4c AS vendor
COPY --from=composer:2.8@sha256:5248900ab8b5f7f880c2d62180e40960cd87f60149ec9a1abfd62ac72a02577c /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --no-scripts --no-autoloader
COPY . .
RUN composer dump-autoload --no-dev --classmap-authoritative --no-interaction

# --- 3. Laufzeit -------------------------------------------------------------------------------------------------------
FROM dunglas/frankenphp:1-php8.3-alpine@sha256:df92e348a4239f51ca5519af0fb578c1eea0ccd427eaf2704d7b44cf9f680d4c AS runtime
RUN apk upgrade --no-cache && apk add --no-cache tini \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
WORKDIR /app

COPY --from=vendor --chown=www-data:www-data /app /app
COPY --from=assets --chown=www-data:www-data /app/public/build /app/public/build
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint

# Daten (SQLite) liegen in einem Volume; alles andere im Image bleibt unveränderlich.
RUN mkdir -p /data /config /tmp/caddy && chown -R www-data:www-data /data /config /tmp/caddy /app/storage /app/bootstrap/cache \
    && setcap -r /usr/local/bin/frankenphp 2>/dev/null || true

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=warning \
    CACHE_STORE=database \
    SESSION_DRIVER=array \
    DB_CONNECTION=sqlite \
    DB_DATABASE=/data/database.sqlite \
    PORT=8080 \
    XDG_CONFIG_HOME=/config \
    XDG_DATA_HOME=/tmp/caddy

USER www-data
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/up" || exit 1
ENTRYPOINT ["/sbin/tini", "-g", "--", "/usr/local/bin/entrypoint"]
