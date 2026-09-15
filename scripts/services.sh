#!/usr/bin/env bash
# Start/stop the local PostgreSQL used for development and tests.
#
#   ./scripts/services.sh start|stop|status|reset
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/env.sh"

if [ ! -x "${CP_PG_BIN:-}/pg_ctl" ]; then
  echo "PostgreSQL 16 server binaries not found: put pg_ctl on PATH or set CP_PG_BIN (see README)." >&2
  exit 1
fi

STATE="$ROOT/.localdev"
PGDATA="$STATE/pgdata"
LOGS="$STATE/logs"
mkdir -p "$LOGS"

pg_running() { "$CP_PG_BIN/pg_isready" -q -h "$PGHOST" -p "$PGPORT" 2>/dev/null; }

ensure_db() {
  "$CP_PG_BIN/psql" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres \
    -tAc "SELECT 1 FROM pg_database WHERE datname='$1'" | grep -q 1 \
    || "$CP_PG_BIN/createdb" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$1"
}

start() {
  if [ ! -d "$PGDATA" ]; then
    echo "==> initdb $PGDATA"
    "$CP_PG_BIN/initdb" -D "$PGDATA" -U "$PGUSER" --encoding=UTF8 --locale=C >"$LOGS/initdb.log" 2>&1
  fi
  if pg_running; then
    echo "==> postgres already running on :$PGPORT"
  else
    echo "==> starting postgres on :$PGPORT"
    # Unix sockets are disabled: everything connects over TCP, and a socket inside the
    # repo breaks deep clone paths (macOS limits socket paths to 103 bytes).
    "$CP_PG_BIN/pg_ctl" -D "$PGDATA" -l "$LOGS/postgres.log" \
      -o "-p $PGPORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -w start
  fi
  ensure_db "$PGDATABASE"
  ensure_db coursepilot_test
  status
}

stop() {
  [ -d "$PGDATA" ] && "$CP_PG_BIN/pg_ctl" -D "$PGDATA" -m fast -w stop 2>/dev/null || true
  echo "==> stopped"
}

status() {
  pg_running && echo "postgres  UP    $PGHOST:$PGPORT/$PGDATABASE" || echo "postgres  DOWN"
}

reset() { stop; rm -rf "$PGDATA"; echo "==> wiped $PGDATA"; start; }

case "${1:-status}" in
  start) start ;; stop) stop ;; status) status ;; reset) reset ;;
  *) echo "usage: $0 start|stop|status|reset" >&2; exit 2 ;;
esac
