#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE=system
DRY_RUN=0
BACKUP_TIME="${BACKUP_TIME:-03:15}"

for arg in "$@"; do
  case "$arg" in
    --user) MODE=user ;;
    --dry-run) DRY_RUN=1 ;;
    --time=*) BACKUP_TIME="${arg#*=}" ;;
    --help|-h)
      echo 'Uso: ./scripts/install-backup-timer.sh [--user] [--time=03:15] [--dry-run]'
      exit 0
      ;;
    *) echo "ERROR: argumento desconocido: $arg" >&2; exit 2 ;;
  esac
done

[[ "$BACKUP_TIME" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]] || { echo 'ERROR: --time debe ser HH:MM en formato 24h' >&2; exit 2; }
[[ -x "$ROOT/scripts/backup.sh" ]] || { echo 'ERROR: scripts/backup.sh no es ejecutable' >&2; exit 1; }

hour="${BACKUP_TIME%:*}"
minute="${BACKUP_TIME#*:}"
service="[Unit]
Description=Open Signage Plus verified backup
After=docker.service network-online.target

[Service]
Type=oneshot
WorkingDirectory=\"$ROOT\"
ExecStart=\"$ROOT/scripts/backup.sh\"
UMask=0077
Nice=10
"
timer="[Unit]
Description=Open Signage Plus daily backup timer

[Timer]
OnCalendar=*-*-* ${hour}:${minute}:00
RandomizedDelaySec=15m
Persistent=true
Unit=open-signage-backup.service

[Install]
WantedBy=timers.target
"

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '%s\n--- TIMER ---\n%s\n' "$service" "$timer"
  exit 0
fi

if [[ "$MODE" == user ]]; then
  unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  mkdir -p "$unit_dir"
  printf '%s' "$service" > "$unit_dir/open-signage-backup.service"
  printf '%s' "$timer" > "$unit_dir/open-signage-backup.timer"
  systemctl --user daemon-reload
  systemctl --user enable --now open-signage-backup.timer
  systemctl --user status open-signage-backup.timer --no-pager || true
  echo 'Backup timer instalado para el usuario actual. Para servidores sin sesión persistente, habilite loginctl enable-linger.'
else
  [[ "${EUID:-$(id -u)}" -eq 0 ]] || { echo 'ERROR: modo system requiere root. Use sudo o --user.' >&2; exit 1; }
  printf '%s' "$service" > /etc/systemd/system/open-signage-backup.service
  printf '%s' "$timer" > /etc/systemd/system/open-signage-backup.timer
  chmod 644 /etc/systemd/system/open-signage-backup.service /etc/systemd/system/open-signage-backup.timer
  systemctl daemon-reload
  systemctl enable --now open-signage-backup.timer
  systemctl status open-signage-backup.timer --no-pager || true
  echo 'Backup diario instalado: open-signage-backup.timer'
fi
