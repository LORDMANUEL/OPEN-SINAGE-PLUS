#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="docker-compose.v2.yml"
ENV_FILE=".env"
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
XIBO_BASE_URL=http://cms-web
XIBO_CLIENT_ID=
XIBO_CLIENT_SECRET=
XIBO_TIMEOUT_MS=10000
MYSQL_PASSWORD=${MYSQL_PASSWORD}
CMS_SERVER_NAME=localhost
AI_PROVIDER=${AI_PROVIDER_VALUE}
AI_BASE_URL=${AI_BASE_URL_VALUE}
AI_MODEL=${AI_MODEL_VALUE}
AI_API_KEY=
AI_TIMEOUT_MS=60000
QUICKCHART_BASE_URL=http://cms-quickchart:3400
QR_TIMEOUT_MS=10000
VITE_API_BASE_URL=
EOF
  chmod 600 "$ENV_FILE"
  echo "Creado .env con secretos aleatorios. Las credenciales OAuth de Xibo quedan pendientes."
else
  echo "Se conserva el .env existente y se migran únicamente claves nuevas que falten."
  if ! env_has_value "ADMIN_EMAIL"; then append_env_if_missing "ADMIN_EMAIL" "$ADMIN_EMAIL_VALUE"; fi
  if ! env_has_value "ADMIN_PASSWORD"; then NEW_ADMIN_PASSWORD="$(random_hex 12)"; append_env_if_missing "ADMIN_PASSWORD" "$NEW_ADMIN_PASSWORD"; fi
  if ! env_has_value "SESSION_SECRET"; then append_env_if_missing "SESSION_SECRET" "$(random_hex 32)"; fi
  append_env_if_missing "SESSION_TTL_SECONDS" "28800"
  append_env_if_missing "OPEN_SIGNAGE_DATA_DIR" "/data"
  chmod 600 "$ENV_FILE"
fi

mkdir -p shared/db shared/backup shared/cms/custom shared/cms/library shared/cms/web/userscripts shared/cms/ca-certs shared/open-signage shared/ollama

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
echo "Xibo CMS (configuración inicial): http://localhost:8081"
if [[ -n "$NEW_ADMIN_PASSWORD" ]]; then
  echo
  echo "CREDENCIALES ADMINISTRATIVAS GENERADAS (guárdelas ahora):"
  echo "Email: $(awk -F= '$1=="ADMIN_EMAIL" {print substr($0,index($0,"=")+1); exit}' "$ENV_FILE")"
  echo "Contraseña: ${NEW_ADMIN_PASSWORD}"
fi

echo
echo "SIGUIENTE PASO:"
echo "1. Ingrese a Open Signage Plus con las credenciales administrativas."
echo "2. Termine el asistente inicial de Xibo en el puerto 8081."
echo "3. Cree una aplicación OAuth client_credentials en Xibo."
echo "4. Coloque XIBO_CLIENT_ID y XIBO_CLIENT_SECRET en .env."
echo "5. Ejecute: docker compose --env-file .env -f $COMPOSE_FILE up -d open-signage-api"
echo "6. Entre en Open Signage Plus > Motor Xibo > Verificar conexión."
if [[ "$WITH_AI" -eq 0 ]]; then echo "7. IA opcional: configure un endpoint compatible o use --with-ai en una instalación nueva."; fi
