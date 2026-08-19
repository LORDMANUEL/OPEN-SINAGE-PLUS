#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

[[ -z "$(git status --porcelain)" ]] || { echo 'ERROR: working tree has local changes; commit or stash them first.' >&2; exit 1; }
previous="$(git rev-parse HEAD)"
backup_output="$(./scripts/backup.sh)"
echo "$backup_output"

git fetch origin main
git checkout main
git pull --ff-only origin main

if ! ./install.sh; then
  echo 'Install/update failed; rolling code back to previous commit.' >&2
  git checkout "$previous"
  ./install.sh || true
  exit 2
fi

for _ in $(seq 1 60); do
  if curl --fail --silent http://127.0.0.1:8080/api/health | grep -q '"status":"ok"'; then
    echo "Update completed successfully: $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 2
done

echo 'Health check failed after update; rolling back code.' >&2
git checkout "$previous"
./install.sh || true
exit 3
