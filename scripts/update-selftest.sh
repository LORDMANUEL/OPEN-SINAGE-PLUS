#!/usr/bin/env bash
set -Eeuo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

remote="$tmp/remote.git"
seed="$tmp/seed"
work="$tmp/work"
mkdir -p "$tmp/bin"
cat > "$tmp/bin/curl" <<'SH'
#!/usr/bin/env bash
printf '%s\n' '{"status":"ok"}'
SH
chmod +x "$tmp/bin/curl"

git init --bare "$remote" >/dev/null
git init -b main "$seed" >/dev/null
cd "$seed"
git config user.name 'Lifecycle Test'
git config user.email 'lifecycle@example.invalid'
mkdir -p scripts
cp "$root/scripts/update.sh" scripts/update.sh
cat > fake-backup.sh <<'SH'
#!/usr/bin/env bash
echo 'Backup created: fake.tar.gz'
SH
cat > fake-install.sh <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
if [[ -n "${FAIL_VERSION:-}" && -f VERSION && "$(cat VERSION)" == "$FAIL_VERSION" ]]; then exit 42; fi
exit 0
SH
chmod +x scripts/update.sh fake-backup.sh fake-install.sh
printf '1\n' > VERSION
git add . && git commit -m v1 >/dev/null
git remote add origin "$remote"
git push -u origin main >/dev/null

git clone "$remote" "$work" >/dev/null
cd "$work"
git config user.name 'Lifecycle Test'
git config user.email 'lifecycle@example.invalid'

# Publish a good update.
cd "$seed"
printf '2\n' > VERSION
git add VERSION && git commit -m v2 >/dev/null
git push origin main >/dev/null

cd "$work"
PATH="$tmp/bin:$PATH" BACKUP_SCRIPT=./fake-backup.sh INSTALL_SCRIPT=./fake-install.sh UPDATE_REMOTE=origin UPDATE_BRANCH=main UPDATE_HEALTH_URL=http://health.invalid/api/health bash scripts/update.sh
[[ "$(cat VERSION)" == '2' ]]
[[ "$(git branch --show-current)" == 'main' ]]
good_sha="$(git rev-parse HEAD)"

# Publish a bad update: install must fail and local main must roll back to v2.
cd "$seed"
printf '3\n' > VERSION
git add VERSION && git commit -m v3 >/dev/null
git push origin main >/dev/null

cd "$work"
if PATH="$tmp/bin:$PATH" FAIL_VERSION=3 BACKUP_SCRIPT=./fake-backup.sh INSTALL_SCRIPT=./fake-install.sh UPDATE_REMOTE=origin UPDATE_BRANCH=main UPDATE_HEALTH_URL=http://health.invalid/api/health bash scripts/update.sh; then
  echo 'bad update unexpectedly succeeded' >&2
  exit 1
fi
[[ "$(git rev-parse HEAD)" == "$good_sha" ]]
[[ "$(cat VERSION)" == '2' ]]
[[ "$(git branch --show-current)" == 'main' ]]

echo 'Update self-test passed: fast-forward success and failed update rollback keep main attached'
