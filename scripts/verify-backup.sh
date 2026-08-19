#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

archive="${1:-}"
[[ -n "$archive" && -f "$archive" ]] || { echo "Usage: $0 <backup.tar.gz>" >&2; exit 1; }

if [[ -f "$archive.sha256" ]]; then
  expected_hash="$(awk 'NR==1 {print $1}' "$archive.sha256")"
  actual_hash="$(sha256sum "$archive" | awk '{print $1}')"
  [[ -n "$expected_hash" && "$expected_hash" == "$actual_hash" ]] || { echo 'ERROR: backup archive checksum mismatch' >&2; exit 2; }
else
  echo "WARN: sidecar checksum not found: $archive.sha256" >&2
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

required=(created-at.txt env xibo-cms.sql SHA256SUMS)
for file in "${required[@]}"; do
  [[ -f "$work/$file" ]] || { echo "ERROR: backup missing $file" >&2; exit 3; }
done

(
  cd "$work"
  sha256sum -c SHA256SUMS
)

grep -q '^MYSQL_PASSWORD=' "$work/env" || { echo 'ERROR: backup env missing MYSQL_PASSWORD' >&2; exit 4; }
[[ -s "$work/xibo-cms.sql" ]] || { echo 'ERROR: Xibo database dump is empty' >&2; exit 4; }

printf 'Backup verified successfully: %s\n' "$archive"
