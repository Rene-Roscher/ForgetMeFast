#!/bin/sh
# Startet die App im Container: Datenbank anlegen, migrieren, Caches bauen, den Aufräumjob jede Minute laufen lassen,
# dann den Webserver. Alles, was geheim ist (APP_KEY), kommt aus der Umgebung und steht nie im Image.
set -eu

# Mit Argumenten (z. B. `docker run IMAGE php artisan key:generate --show`) wird nur dieser Befehl ausgeführt.
if [ "$#" -gt 0 ]; then
	exec "$@"
fi

: "${APP_KEY:?APP_KEY fehlt. Erzeugen mit: docker run --rm IMAGE php artisan key:generate --show}"

mkdir -p "$(dirname "$DB_DATABASE")" storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs
[ -f "$DB_DATABASE" ] || : > "$DB_DATABASE"

php artisan migrate --force --no-interaction
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction

# secrets:prune läuft jede Minute (routes/console.php). Eine einfache Schleife statt eines zweiten Prozess-Managers.
(
	while true; do
		php artisan schedule:run --no-interaction >/dev/null 2>&1 || true
		sleep 60
	done
) &

exec frankenphp run --config /etc/caddy/Caddyfile
