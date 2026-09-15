#!/usr/bin/env bash
# Source this to point your shell at CoursePilot's local PostgreSQL.
#   source scripts/env.sh
#
# scripts/services.sh needs PostgreSQL 16 server binaries (initdb, pg_ctl, psql). They are
# looked up in this order: $CP_PG_BIN, pg_ctl on PATH, then any micromamba env that has them
# (e.g. `micromamba create -n coursepilot -c conda-forge postgresql=16`).
export MAMBA_ROOT_PREFIX="${MAMBA_ROOT_PREFIX:-$HOME/.local/opt/micromamba/root}"
if [ -z "${CP_PG_BIN:-}" ]; then
  if command -v pg_ctl >/dev/null 2>&1; then
    CP_PG_BIN="$(dirname "$(command -v pg_ctl)")"
  else
    for candidate in "$MAMBA_ROOT_PREFIX"/envs/*/bin; do
      if [ -x "$candidate/pg_ctl" ]; then
        CP_PG_BIN="$candidate"
        break
      fi
    done
  fi
fi
export CP_PG_BIN="${CP_PG_BIN:-}"
export PATH="$HOME/.local/bin:${CP_PG_BIN:+$CP_PG_BIN:}$PATH"

export PGHOST=127.0.0.1
export PGPORT="${CP_PGPORT:-5435}"
export PGUSER="${PGUSER:-$(whoami)}"
export PGDATABASE=coursepilot
