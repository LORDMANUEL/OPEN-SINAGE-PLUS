#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.v2.yml}"
SHARED_ROOT="${SHARED_ROOT:-shared}"
[[ -f "$ENV_FILE" ]] || { echo "ERROR: $ENV_FILE not found" >&2; exit 1; }

env_value() { node scripts/env-read.mjs "$ENV_FILE" "$1"; }
MYSQL_PASSWORD="${MYSQL_PASSWORD:-$(env_value MYSQL_PASSWORD)}"
BACKUP_ROOT="${BACKUP_ROOT:-$(env_value BACKUP_ROOT)}"
RETENTION_DAYS="${RETENTION_DAYS:-$(env_value RETENTION_DAYS)}"
BACKUP_ROOT="${BACKUP_ROOT:-$SHARED_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
[[ -n "$MYSQL_PASSWORD" ]] || { echo 'ERROR: MYSQL_PASSWORD missing from env/config' >&2; exit 1; }
[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || { echo 'ERROR: RETENTION_DAYS must be an integer' >&2; exit 1; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$BACKUP_ROOT"

mkdir -p "$work/payload"
printf '%s\n' "$stamp" > "$work/payload/created-at.txt"
cp "$ENV_FILE" "$work/payload/env"
chmod 600 "$work/payload/env"

if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps cms-db --status running --format json 2>/dev/null | grep -q .; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T cms-db \
    mysqldump --single-transaction --routines --triggers -ucms -p"${MYSQL_PASSWORD}" cms > "$work/payload/xibo-cms.sql"
else
  echo "ERROR: cms-db is not running; refusing incomplete backup" >&2
  exit 2
fi

[[ -d "$SHARED_ROOT/open-signage" ]] && tar -C "$SHARED_ROOT" -cf "$work/payload/open-signage.tar" open-signage
[[ -d "$SHARED_ROOT/cms/library" ]] && tar -C "$SHARED_ROOT/cms" -cf "$work/payload/xibo-library.tar" library
[[ -d "$SHARED_ROOT/cms/custom" ]] && tar -C "$SHARED_ROOT/cms" -cf "$work/payload/xibo-custom.tar" custom

(
  cd "$work/payload"
  sha256sum * > SHA256SUMS
)
archive="$BACKUP_ROOT/open-signage-plus-$stamp.tar.gz"
tar -C "$work/payload" -czf "$archive" .
actual_hash="$(sha256sum "$archive" | awk '{print $1}')"
printf '%s  %s\n' "$actual_hash" "$(basename "$archive")" > "$archive.sha256"
chmod 600 "$archive" "$archive.sha256"

find "$BACKUP_ROOT" -type f -name 'open-signage-plus-*.tar.gz*' -mtime "+$RETENTION_DAYS" -delete
printf 'Backup created: %s\n' "$archive"