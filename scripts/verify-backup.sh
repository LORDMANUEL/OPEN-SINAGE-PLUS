#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

archive="${1:-}"
[[ -n "$archive" && -f "$archive" ]] || { echo "Usage: $0 <backup.tar.gz>" >&2; exit 1; }
[[ -f "$archive.sha256" ]] || { echo "ERROR: sidecar checksum not found: $archive.sha256" >&2; exit 2; }
expected_hash="$(awk 'NR==1 {print $1}' "$archive.sha256")"
actual_hash="$(sha256sum "$archive" | awk '{print $1}')"
[[ "$expected_hash" =~ ^[a-fA-F0-9]{64}$ && "$expected_hash" == "$actual_hash" ]] || { echo 'ERROR: backup archive checksum mismatch' >&2; exit 2; }

validate_tar_paths() {
  local file="$1"
  while IFS= read -r entry; do
    local clean="${entry#./}"
    [[ -n "$clean" ]] || continue
    case "$clean" in
      /*|../*|*/../*|*/..)
        echo "ERROR: unsafe archive path in $(basename "$file"): $entry" >&2
        return 1
        ;;
    esac
  done < <(tar -tf "$file")
}

validate_tar_paths "$archive" || exit 2

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

for nested in open-signage.tar xibo-library.tar xibo-custom.tar; do
  [[ -f "$work/$nested" ]] || continue
  validate_tar_paths "$work/$nested" || exit 2
done

grep -q '^MYSQL_PASSWORD=' "$work/env" || { echo 'ERROR: backup env missing MYSQL_PASSWORD' >&2; exit 4; }
[[ -s "$work/xibo-cms.sql" ]] || { echo 'ERROR: Xibo database dump is empty' >&2; exit 4; }

printf 'Backup verified successfully: %s\n' "$archive"