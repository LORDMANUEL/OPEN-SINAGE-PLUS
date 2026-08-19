#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

archive="${1:-}"
ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.v2.yml}"
[[ -n "$archive" && -f "$archive" ]] || { echo "Usage: $0 <backup.tar.gz>" >&2; exit 1; }
[[ -f "$archive.sha256" ]] && sha256sum -c "$archive.sha256"

# Reject absolute paths, parent traversal and device-like entries before extraction.
while IFS= read -r entry; do
  clean="${entry#./}"
  [[ -n "$clean" ]] || continue
  case "$clean" in
    /*|../*|*/../*|*/..)
      echo "ERROR: unsafe archive path: $entry" >&2
      exit 2
      ;;
  esac
done < <(tar -tzf "$archive")

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
tar --no-same-owner --no-same-permissions -C "$work" -xzf "$archive"
(
  cd "$work"
  [[ -f SHA256SUMS ]] || { echo 'ERROR: backup missing SHA256SUMS' >&2; exit 2; }
  sha256sum -c SHA256SUMS
)

[[ -f "$work/env" ]] || { echo "ERROR: backup missing env" >&2; exit 2; }
cp "$ENV_FILE" "$ENV_FILE.pre-restore.$(date -u +%Y%m%dT%H%M%SZ)" 2>/dev/null || true
cp "$work/env" "$ENV_FILE"
chmod 600 "$ENV_FILE"
set -a; . "$ENV_FILE"; set +a

mkdir -p shared/open-signage shared/cms/library shared/cms/custom
if [[ -f "$work/open-signage.tar" ]]; then rm -rf shared/open-signage; tar --no-same-owner --no-same-permissions -C shared -xf "$work/open-signage.tar"; fi
if [[ -f "$work/xibo-library.tar" ]]; then rm -rf shared/cms/library; mkdir -p shared/cms; tar --no-same-owner --no-same-permissions -C shared/cms -xf "$work/xibo-library.tar"; fi
if [[ -f "$work/xibo-custom.tar" ]]; then rm -rf shared/cms/custom; mkdir -p shared/cms; tar --no-same-owner --no-same-permissions -C shared/cms -xf "$work/xibo-custom.tar"; fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d cms-db
ready=0
for _ in $(seq 1 60); do
  if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T cms-db mysqladmin ping -ucms -p"${MYSQL_PASSWORD}" --silent >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[[ "$ready" -eq 1 ]] || { echo 'ERROR: cms-db did not become ready' >&2; exit 3; }
[[ -f "$work/xibo-cms.sql" ]] && docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T cms-db mysql -ucms -p"${MYSQL_PASSWORD}" cms < "$work/xibo-cms.sql"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

for _ in $(seq 1 60); do
  if curl --fail --silent --max-time 3 http://127.0.0.1:8080/api/health | grep -q '"status":"ok"'; then
    printf 'Restore completed and health verified from %s\n' "$archive"
    exit 0
  fi
  sleep 2
done

echo 'ERROR: restore completed but application health check failed' >&2
exit 4
