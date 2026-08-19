#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

UPDATE_REMOTE="${UPDATE_REMOTE:-origin}"
UPDATE_BRANCH="${UPDATE_BRANCH:-main}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-./scripts/backup.sh}"
INSTALL_SCRIPT="${INSTALL_SCRIPT:-./install.sh}"
HEALTH_URL="${UPDATE_HEALTH_URL:-http://127.0.0.1:8080/api/health}"

[[ -z "$(git status --porcelain)" ]] || { echo 'ERROR: working tree has local changes; commit or stash them first.' >&2; exit 1; }
current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$UPDATE_BRANCH" ]] || { echo "ERROR: update must run from $UPDATE_BRANCH, current branch is ${current_branch:-detached}." >&2; exit 1; }
[[ -x "$BACKUP_SCRIPT" ]] || { echo "ERROR: backup script is not executable: $BACKUP_SCRIPT" >&2; exit 1; }
[[ -x "$INSTALL_SCRIPT" ]] || { echo "ERROR: install script is not executable: $INSTALL_SCRIPT" >&2; exit 1; }

previous="$(git rev-parse HEAD)"
backup_output="$("$BACKUP_SCRIPT")"
echo "$backup_output"

rollback_code() {
  echo "Rolling $UPDATE_BRANCH back to $previous" >&2
  git checkout "$UPDATE_BRANCH" >/dev/null 2>&1 || true
  git reset --hard "$previous"
  "$INSTALL_SCRIPT" || true
}

git fetch "$UPDATE_REMOTE" "$UPDATE_BRANCH"
git checkout "$UPDATE_BRANCH"
git pull --ff-only "$UPDATE_REMOTE" "$UPDATE_BRANCH"

if ! "$INSTALL_SCRIPT"; then
  echo 'Install/update failed; rolling code back to previous commit.' >&2
  rollback_code
  exit 2
fi

for _ in $(seq 1 60); do
  if curl --fail --silent --max-time 3 "$HEALTH_URL" | grep -q '"status":"ok"'; then
    echo "Update completed successfully: $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 2
done

echo 'Health check failed after update; rolling code back.' >&2
rollback_code
exit 3
