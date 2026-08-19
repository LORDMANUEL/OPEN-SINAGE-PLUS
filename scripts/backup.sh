#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.v2.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-shared/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
[[ -f "$ENV_FILE" ]] || { echo "ERROR: $ENV_FILE not found" >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a

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

[[ -d shared/open-signage ]] && tar -C shared -cf "$work/payload/open-signage.tar" open-signage
[[ -d shared/cms/library ]] && tar -C shared/cms -cf "$work/payload/xibo-library.tar" library
[[ -d shared/cms/custom ]] && tar -C shared/cms -cf "$work/payload/xibo-custom.tar" custom

(
  cd "$work/payload"
  sha256sum * > SHA256SUMS
)
archive="$BACKUP_ROOT/open-signage-plus-$stamp.tar.gz"
tar -C "$work/payload" -czf "$archive" .
sha256sum "$archive" > "$archive.sha256"
chmod 600 "$archive" "$archive.sha256"

find "$BACKUP_ROOT" -type f -name 'open-signage-plus-*.tar.gz*' -mtime "+$RETENTION_DAYS" -delete
printf 'Backup created: %s\n' "$archive"
