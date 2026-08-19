#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.v2.yml}"
WEB_URL="${WEB_URL:-http://127.0.0.1:8080}"
XIBO_URL="${XIBO_URL:-http://127.0.0.1:8081}"
BACKUP_ROOT="${BACKUP_ROOT:-shared/backups}"
FAILURES=0
WARNINGS=0

ok() { printf '[OK] %s\n' "$*"; }
warn() { printf '[WARN] %s\n' "$*"; WARNINGS=$((WARNINGS + 1)); }
fail() { printf '[FAIL] %s\n' "$*"; FAILURES=$((FAILURES + 1)); }

printf 'Open Signage Plus doctor\n========================\n'

command -v docker >/dev/null 2>&1 && ok "Docker disponible: $(docker --version | head -n1)" || fail 'Docker no está instalado o no está en PATH'
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then ok "Docker Compose disponible: $(docker compose version --short 2>/dev/null || docker compose version)"; else fail 'Docker Compose v2 no está disponible'; fi
command -v curl >/dev/null 2>&1 && ok 'curl disponible' || fail 'curl no está instalado'

if [[ -f "$ENV_FILE" ]]; then
  ok "$ENV_FILE existe"
  mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || true)"
  [[ "$mode" == '600' || "$mode" == '640' ]] && ok "$ENV_FILE tiene permisos restringidos ($mode)" || warn "$ENV_FILE debería tener permisos 600/640; actual: ${mode:-desconocido}"
  set -a; . "$ENV_FILE"; set +a
  for key in MYSQL_PASSWORD ADMIN_EMAIL ADMIN_PASSWORD SESSION_SECRET; do
    [[ -n "${!key:-}" ]] && ok "$key configurado" || fail "$key falta en $ENV_FILE"
  done
  [[ -n "${XIBO_CLIENT_ID:-}" && -n "${XIBO_CLIENT_SECRET:-}" ]] && ok 'OAuth Xibo configurado' || warn 'OAuth Xibo todavía no está completo'
else
  fail "$ENV_FILE no existe"
fi

if [[ -f "$COMPOSE_FILE" ]] && command -v docker >/dev/null 2>&1; then
  if [[ -f "$ENV_FILE" ]] && docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null 2>&1; then ok 'Docker Compose config válido'; else fail 'Docker Compose config inválido'; fi
else
  fail "$COMPOSE_FILE no existe"
fi

free_kb="$(df -Pk . | awk 'NR==2 {print $4}')"
if [[ "${free_kb:-0}" -ge 5242880 ]]; then ok "Espacio libre suficiente: $((free_kb / 1024)) MB"; elif [[ "${free_kb:-0}" -ge 1048576 ]]; then warn "Espacio libre bajo: $((free_kb / 1024)) MB"; else fail "Espacio libre crítico: $((free_kb / 1024)) MB"; fi

if command -v docker >/dev/null 2>&1 && [[ -f "$ENV_FILE" ]]; then
  for service in cms-db cms-web cms-xmr cms-memcached cms-quickchart open-signage-api open-signage-web; do
    cid="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null || true)"
    if [[ -z "$cid" ]]; then warn "$service no está creado"; continue; fi
    state="$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || true)"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || true)"
    if [[ "$state" == 'running' && ( "$health" == 'healthy' || "$health" == 'none' ) ]]; then ok "$service running${health:+ / $health}"; else fail "$service estado=$state health=$health"; fi
  done
  if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T open-signage-api ffmpeg -version >/dev/null 2>&1; then ok 'FFmpeg disponible en backend'; else warn 'No se pudo validar FFmpeg dentro de open-signage-api'; fi
fi

if curl --fail --silent --max-time 5 "$WEB_URL/api/health" | grep -q '"status":"ok"'; then ok "API responde en $WEB_URL"; else fail "API no responde correctamente en $WEB_URL/api/health"; fi
if curl --fail --silent --max-time 5 -o /dev/null "$WEB_URL/"; then ok "PWA responde en $WEB_URL"; else fail "PWA no responde en $WEB_URL"; fi
if curl --fail --silent --max-time 5 -o /dev/null "$XIBO_URL/"; then ok "Xibo responde en $XIBO_URL"; else warn "Xibo no responde en $XIBO_URL (puede estar ligado solo a otra interfaz)"; fi

latest_backup="$(find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'open-signage-plus-*.tar.gz' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n1 | cut -d' ' -f2- || true)"
if [[ -n "$latest_backup" ]]; then
  age_hours=$(( ( $(date +%s) - $(stat -c %Y "$latest_backup") ) / 3600 ))
  if [[ "$age_hours" -le 48 ]]; then ok "Backup reciente: $latest_backup (${age_hours}h)"; else warn "Último backup tiene ${age_hours}h: $latest_backup"; fi
  [[ -f "$latest_backup.sha256" ]] && (cd "$(dirname "$latest_backup")" && sha256sum -c "$(basename "$latest_backup").sha256" >/dev/null 2>&1) && ok 'Checksum del último backup válido' || warn 'No se pudo validar checksum del último backup'
else
  warn "No hay backups en $BACKUP_ROOT"
fi

printf '\nResumen: %d fallo(s), %d advertencia(s).\n' "$FAILURES" "$WARNINGS"
[[ "$FAILURES" -eq 0 ]]
