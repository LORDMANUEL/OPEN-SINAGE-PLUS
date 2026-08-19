#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

archive="${1:-}"
ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.v2.yml}"
SHARED_ROOT="${SHARED_ROOT:-shared}"
HEALTH_URL="${RESTORE_HEALTH_URL:-http://127.0.0.1:8080/api/health}"
[[ -n "$archive" && -f "$archive" ]] || { echo "Usage: $0 <backup.tar.gz>" >&2; exit 1; }
if [[ -f "$archive.sha256" ]]; then
  expected_hash="$(awk 'NR==1 {print $1}' "$archive.sha256")"
  actual_hash="$(sha256sum "$archive" | awk '{print $1}')"
  [[ -n "$expected_hash" && "$expected_hash" == "$actual_hash" ]] || { echo 'ERROR: backup archive checksum mismatch' >&2; exit 2; }
fi

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
MYSQL_PASSWORD="${MYSQL_PASSWORD:-$(node scripts/env-read.mjs "$ENV_FILE" MYSQL_PASSWORD)}"
[[ -n "$MYSQL_PASSWORD" ]] || { echo 'ERROR: restored env has no MYSQL_PASSWORD' >&2; exit 2; }

mkdir -p "$SHARED_ROOT/open-signage" "$SHARED_ROOT/cms/library" "$SHARED_ROOT/cms/custom"
if [[ -f "$work/open-signage.tar" ]]; then rm -rf "$SHARED_ROOT/open-signage"; tar --no-same-owner --no-same-permissions -C "$SHARED_ROOT" -xf "$work/open-signage.tar"; fi
if [[ -f "$work/xibo-library.tar" ]]; then rm -rf "$SHARED_ROOT/cms/library"; mkdir -p "$SHARED_ROOT/cms"; tar --no-same-owner --no-same-permissions -C "$SHARED_ROOT/cms" -xf "$work/xibo-library.tar"; fi
if [[ -f "$work/xibo-custom.tar" ]]; then rm -rf "$SHARED_ROOT/cms/custom"; mkdir -p "$SHARED_ROOT/cms"; tar --no-same-owner --no-same-permissions -C "$SHARED_ROOT/cms" -xf "$work/xibo-custom.tar"; fi

# RESTORE_RUNNER is a test seam only; production defaults to Docker Compose.
run_compose() {
  if [[ -n "${RESTORE_RUNNER:-}" ]]; then "$RESTORE_RUNNER" "$@"; else docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"; fi
}

run_compose up -d cms-db
ready=0
for _ in $(seq 1 60); do
  if run_compose exec -T cms-db mysqladmin ping -ucms -p"${MYSQL_PASSWORD}" --silent >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[[ "$ready" -eq 1 ]] || { echo 'ERROR: cms-db did not become ready' >&2; exit 3; }
[[ -f "$work/xibo-cms.sql" ]] && run_compose exec -T cms-db mysql -ucms -p"${MYSQL_PASSWORD}" cms < "$work/xibo-cms.sql"
run_compose up -d --build

for _ in $(seq 1 60); do
  if curl --fail --silent --max-time 3 "$HEALTH_URL" | grep -q '"status":"ok"'; then
    printf 'Restore completed and health verified from %s\n' "$archive"
    exit 0
  fi
  sleep 2
done

echo 'ERROR: restore completed but application health check failed' >&2
exit 4