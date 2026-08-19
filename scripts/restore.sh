#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

archive="${1:-}"
ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.v2.yml}"
[[ -n "$archive" && -f "$archive" ]] || { echo "Usage: $0 <backup.tar.gz>" >&2; exit 1; }
[[ -f "$archive.sha256" ]] && sha256sum -c "$archive.sha256"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
tar -C "$work" -xzf "$archive"
(
  cd "$work"
  sha256sum -c SHA256SUMS
)

[[ -f "$work/env" ]] || { echo "ERROR: backup missing env" >&2; exit 2; }
cp "$ENV_FILE" "$ENV_FILE.pre-restore.$(date -u +%Y%m%dT%H%M%SZ)" 2>/dev/null || true
cp "$work/env" "$ENV_FILE"
chmod 600 "$ENV_FILE"
set -a; . "$ENV_FILE"; set +a

mkdir -p shared/open-signage shared/cms/library shared/cms/custom
if [[ -f "$work/open-signage.tar" ]]; then rm -rf shared/open-signage; tar -C shared -xf "$work/open-signage.tar"; fi
if [[ -f "$work/xibo-library.tar" ]]; then rm -rf shared/cms/library; mkdir -p shared/cms; tar -C shared/cms -xf "$work/xibo-library.tar"; fi
if [[ -f "$work/xibo-custom.tar" ]]; then rm -rf shared/cms/custom; mkdir -p shared/cms; tar -C shared/cms -xf "$work/xibo-custom.tar"; fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d cms-db
for _ in $(seq 1 60); do
  if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T cms-db mysqladmin ping -ucms -p"${MYSQL_PASSWORD}" --silent >/dev/null 2>&1; then break; fi
  sleep 2
done
[[ -f "$work/xibo-cms.sql" ]] && docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T cms-db mysql -ucms -p"${MYSQL_PASSWORD}" cms < "$work/xibo-cms.sql"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
printf 'Restore completed from %s\n' "$archive"
