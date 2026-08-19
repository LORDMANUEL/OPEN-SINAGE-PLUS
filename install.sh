#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.v2.yml}"
ENV_FILE="${ENV_FILE:-.env}"
WITH_AI=0
AI_MODEL="${AI_MODEL:-qwen2.5:1.5b}"
ADMIN_EMAIL_VALUE="${ADMIN_EMAIL:-admin@opensignage.local}"
NEW_ADMIN_PASSWORD=""

for arg in "$@"; do
  case "$arg" in
    --with-ai) WITH_AI=1 ;;
    --ai-model=*) AI_MODEL="${arg#*=}" ;;
    --admin-email=*) ADMIN_EMAIL_VALUE="${arg#*=}" ;;
    --help|-h) echo "Uso: ./install.sh [--with-ai] [--ai-model=qwen2.5:1.5b] [--admin-email=admin@empresa.com]"; exit 0 ;;
    *) echo "ERROR: argumento desconocido: $arg" >&2; exit 2 ;;
  esac
done

random_hex() {
  local bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    printf '%s' "$(date +%s%N)-${RANDOM}-${RANDOM}-$$-${bytes}" | sha256sum | awk '{print $1}'
  fi
}

env_has_value() {
  local key="$1"
  awk -F= -v wanted="$key" '$1 == wanted && length(substr($0, index($0,"=")+1)) > 0 { found=1 } END { exit(found ? 0 : 1) }' "$ENV_FILE"
}

append_env_if_missing() {
  local key="$1"
  local value="$2"
  if ! env_has_value "$key"; then
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

env_last_value() {
  local key="$1"
  awk -F= -v wanted="$key" '$1 == wanted { value=substr($0,index($0,"=")+1) } END { print value }' "$ENV_FILE"
}

echo "Open Signage Plus V2 — instalador"
if ! command -v docker >/dev/null 2>&1; then echo "ERROR: Docker no está instalado o no está en PATH." >&2; exit 1; fi
if ! docker compose version >/dev/null 2>&1; then echo "ERROR: Docker Compose v2 no está disponible (se requiere 'docker compose')." >&2; exit 1; fi
if [[ ! -f "$COMPOSE_FILE" ]]; then echo "ERROR: no se encontró $COMPOSE_FILE. Ejecute este script desde la raíz del repositorio." >&2; exit 1; fi

if [[ ! -f "$ENV_FILE" ]]; then
  MYSQL_PASSWORD="$(random_hex 10)"
  NEW_ADMIN_PASSWORD="$(random_hex 12)"
  SESSION_SECRET="$(random_hex 32)"
  if [[ "$WITH_AI" -eq 1 ]]; then AI_PROVIDER_VALUE="ollama"; AI_BASE_URL_VALUE="http://ollama:11434"; AI_MODEL_VALUE="$AI_MODEL"; else AI_PROVIDER_VALUE=""; AI_BASE_URL_VALUE=""; AI_MODEL_VALUE=""; fi
  cat > "$ENV_FILE" <<EOF
PORT=3000
OPEN_SIGNAGE_DATA_DIR=/data
ADMIN_EMAIL=${ADMIN_EMAIL_VALUE}
ADMIN_PASSWORD=${NEW_ADMIN_PASSWORD}
SESSION_SECRET=${SESSION_SECRET}
SESSION_TTL_SECONDS=28800
CORS_ORIGINS=
TRUST_PROXY=loopback, linklocal, uniquelocal
DOMAIN=
WEB_BIND=0.0.0.0
XIBO_BASE_URL=http://cms-web
XIBO_CLIENT_ID=
XIBO_CLIENT_SECRET=
XIBO_TIMEOUT_MS=10000
XIBO_ADMIN_BIND=127.0.0.1
MYSQL_PASSWORD=${MYSQL_PASSWORD}
CMS_SERVER_NAME=localhost
AI_PROVIDER=${AI_PROVIDER_VALUE}
AI_BASE_URL=${AI_BASE_URL_VALUE}
AI_MODEL=${AI_MODEL_VALUE}
AI_API_KEY=
AI_TIMEOUT_MS=60000
QUICKCHART_BASE_URL=http://cms-quickchart:3400
QR_TIMEOUT_MS=10000
ALERT_WEBHOOK_URL=
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
ALERT_EMAIL_TO=
MONITOR_INTERVAL_MS=60000
ALERT_COOLDOWN_MS=900000
DISK_FREE_WARN_PERCENT=10
BACKUP_MAX_AGE_HOURS=30
TLS_EXPIRY_WARN_DAYS=21
BACKUP_ROOT=shared/backups
RETENTION_DAYS=14
VITE_API_BASE_URL=
EOF
  chmod 600 "$ENV_FILE"
  echo "Creado $ENV_FILE con secretos aleatorios. Las credenciales OAuth de Xibo quedan pendientes."
else
  echo "Se conserva el $ENV_FILE existente y se migran únicamente claves nuevas que falten."
  append_env_if_missing "ADMIN_EMAIL" "$ADMIN_EMAIL_VALUE"
  if ! env_has_value "ADMIN_PASSWORD"; then NEW_ADMIN_PASSWORD="$(random_hex 12)"; append_env_if_missing "ADMIN_PASSWORD" "$NEW_ADMIN_PASSWORD"; fi
  append_env_if_missing "SESSION_SECRET" "$(random_hex 32)"
  append_env_if_missing "SESSION_TTL_SECONDS" "28800"
  append_env_if_missing "OPEN_SIGNAGE_DATA_DIR" "/data"
  append_env_if_missing "DOMAIN" ""
  append_env_if_missing "WEB_BIND" "0.0.0.0"
  append_env_if_missing "XIBO_ADMIN_BIND" "127.0.0.1"
  append_env_if_missing "DISK_FREE_WARN_PERCENT" "10"
  append_env_if_missing "BACKUP_MAX_AGE_HOURS" "30"
  append_env_if_missing "TLS_EXPIRY_WARN_DAYS" "21"
  append_env_if_missing "BACKUP_ROOT" "shared/backups"
  append_env_if_missing "RETENTION_DAYS" "14"
  if [[ "$WITH_AI" -eq 1 ]]; then
    append_env_if_missing "AI_PROVIDER" "ollama"
    append_env_if_missing "AI_BASE_URL" "http://ollama:11434"
    append_env_if_missing "AI_MODEL" "$AI_MODEL"
    append_env_if_missing "AI_TIMEOUT_MS" "60000"
  fi
  chmod 600 "$ENV_FILE"
fi

mkdir -p shared/db shared/backup shared/backups shared/cms/custom shared/cms/library shared/cms/web/userscripts shared/cms/ca-certs shared/open-signage shared/ollama

echo "Validando configuración Docker..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

echo "Construyendo y levantando servicios..."
if [[ "$WITH_AI" -eq 1 ]]; then
  docker compose --profile ai --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
  echo "Descargando modelo local ${AI_MODEL}..."
  docker compose --profile ai --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T ollama ollama pull "$AI_MODEL"
  docker compose --profile ai --env-file "$ENV_FILE" -f "$COMPOSE_FILE" restart open-signage-api
else
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
fi

echo
echo "Estado de servicios:"
if [[ "$WITH_AI" -eq 1 ]]; then docker compose --profile ai --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps; else docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps; fi

echo
echo "Open Signage Plus: http://localhost:8080"
echo "Pantalla navegador: http://localhost:8080/screen"
echo "Xibo CMS administrativo: http://127.0.0.1:8081 (usar túnel/red administrativa si es remoto)"
if [[ -n "$NEW_ADMIN_PASSWORD" ]]; then
  echo
  echo "CREDENCIALES ADMINISTRATIVAS GENERADAS (guárdelas ahora):"
  echo "Email: $(env_last_value ADMIN_EMAIL)"
  echo "Contraseña: ${NEW_ADMIN_PASSWORD}"
fi

echo
echo "SIGUIENTE PASO RECOMENDADO:"
echo "Ejecute ./scripts/setup-wizard.sh para dominio/TLS, Xibo OAuth, IA y alertas SMTP."
echo "Si prefiere hacerlo manualmente, complete Xibo, actualice $ENV_FILE y reinicie open-signage-api."
