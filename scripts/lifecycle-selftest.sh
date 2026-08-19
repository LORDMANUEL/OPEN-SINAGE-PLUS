#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

mkdir -p "$tmp/bin" "$tmp/shared/open-signage" "$tmp/shared/cms/library" "$tmp/shared/cms/custom" "$tmp/backups"
printf 'PLUS_STATE_OK\n' > "$tmp/shared/open-signage/state.txt"
printf 'MEDIA_OK\n' > "$tmp/shared/cms/library/media.txt"
printf 'CUSTOM_OK\n' > "$tmp/shared/cms/custom/custom.txt"
cat > "$tmp/test.env" <<'ENV'
MYSQL_PASSWORD=lifecycle-test-password
ADMIN_EMAIL=lifecycle@example.invalid
ADMIN_PASSWORD=Lifecycle-Test-Password-2026!
SESSION_SECRET=lifecycle-test-session-secret-0123456789abcdef
ENV
printf 'services: {}\n' > "$tmp/compose.yml"

cat > "$tmp/bin/docker" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
args="$*"
if [[ "$args" == *" ps cms-db --status running --format json"* ]]; then
  printf '{"Name":"cms-db"}\n'
  exit 0
fi
if [[ "$args" == *" exec -T cms-db mysqldump "* ]]; then
  printf '%s\n' 'CREATE TABLE lifecycle_test(id INT);' 'INSERT INTO lifecycle_test VALUES (1);'
  exit 0
fi
if [[ "$args" == *" exec -T cms-db mysqladmin ping "* ]]; then exit 0; fi
if [[ "$args" == *" exec -T cms-db mysql "* ]]; then
  cat > "${FAKE_DB_RESTORE:?}"
  exit 0
fi
if [[ "$args" == *" up -d cms-db"* || "$args" == *" up -d --build"* ]]; then exit 0; fi
printf 'Unexpected fake docker call: %s\n' "$args" >&2
exit 91
SH
chmod +x "$tmp/bin/docker"

cat > "$tmp/bin/curl" <<'SH'
#!/usr/bin/env bash
printf '%s\n' '{"status":"ok"}'
SH
chmod +x "$tmp/bin/curl"

export PATH="$tmp/bin:$PATH"
export ENV_FILE="$tmp/test.env"
export COMPOSE_FILE="$tmp/compose.yml"
export SHARED_ROOT="$tmp/shared"
export BACKUP_ROOT="$tmp/backups"
export FAKE_DB_RESTORE="$tmp/imported.sql"
export RETENTION_DAYS=14

./scripts/backup.sh
archive="$(find "$tmp/backups" -maxdepth 1 -type f -name 'open-signage-plus-*.tar.gz' | head -n1)"
[[ -n "$archive" && -f "$archive" ]] || { echo 'backup archive was not created' >&2; exit 1; }
./scripts/verify-backup.sh "$archive"

rm -rf "$tmp/shared/open-signage" "$tmp/shared/cms/library" "$tmp/shared/cms/custom"
mkdir -p "$tmp/shared/open-signage" "$tmp/shared/cms/library" "$tmp/shared/cms/custom"
printf 'CORRUPTED\n' > "$tmp/shared/open-signage/state.txt"

./scripts/restore.sh "$archive"

grep -qx 'PLUS_STATE_OK' "$tmp/shared/open-signage/state.txt"
grep -qx 'MEDIA_OK' "$tmp/shared/cms/library/media.txt"
grep -qx 'CUSTOM_OK' "$tmp/shared/cms/custom/custom.txt"
grep -q 'CREATE TABLE lifecycle_test' "$tmp/imported.sql"

echo 'Lifecycle self-test passed: backup -> verify -> destructive change -> restore -> health'
