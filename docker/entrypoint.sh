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

# Der Webserver läuft als Kind, diese Schleife ist der Hauptprozess und beaufsichtigt ihn:
#  - Stirbt der Webserver, endet das Skript, und der Container startet neu (restart-Richtlinie).
#  - Der Aufräumjob (secrets:prune über `schedule:run`) läuft zu jeder vollen Minute, mit Zeitlimit, damit nichts hängen bleibt.
#  - Jeder erfolgreiche Lauf aktualisiert einen Herzschlag; der HEALTHCHECK meldet "unhealthy", wenn er ausbleibt.
#  - Fehler gehen nach stderr (und damit ins Container-Log), nicht ins Leere.
HEARTBEAT=/tmp/scheduler.heartbeat

frankenphp run --config /etc/caddy/Caddyfile &
server=$!
trap 'kill -TERM "$server" 2>/dev/null; wait "$server"; exit 0' TERM INT

while kill -0 "$server" 2>/dev/null; do
	if timeout 50 php artisan schedule:run --no-interaction >/dev/null; then
		touch "$HEARTBEAT"
	else
		echo "scheduler: schedule:run schlug fehl oder dauerte zu lange (Exit $?)" >&2
	fi
	# bis zur nächsten vollen Minute warten, in Sekundenschritten: So fällt ein toter Webserver sofort auf (und ein Signal
	# wirkt sofort), statt erst nach einer Minute.
	seconds=$(date +%S | sed 's/^0//')
	remaining=$((60 - ${seconds:-0}))
	while [ "$remaining" -gt 0 ] && kill -0 "$server" 2>/dev/null; do
		sleep 1 &
		wait $! || true
		remaining=$((remaining - 1))
	done
done

wait "$server"
