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
    --help|-h)
      echo "Uso: ./install.sh [--with-ai] [--ai-model=qwen2.5:1.5b] [--admin-email=admin@empresa.com]"
      exit 0
      ;;
    *) echo "ERROR: argumento desconocido: $arg" >&2; exit 2 ;;
  esac
done

echo "Open Signage Plus V2 — instalador"

if ! command -v docker >/dev/null 2>&1; then echo "ERROR: Docker no está instalado o no está en PATH." >&2; exit 1; fi
if ! docker compose version >/dev/null 2>&1; then echo "ERROR: Docker Compose v2 no está disponible (se requiere 'docker compose')." >&2; exit 1; fi
if [[ ! -f "$COMPOSE_FILE" ]]; then echo "ERROR: no se encontró $COMPOSE_FILE. Ejecute este script desde la raíz del repositorio." >&2; exit 1; fi

if [[ ! -f "$ENV_FILE" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    MYSQL_PASSWORD="$(openssl rand -hex 10)"
    NEW_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)"
    SESSION_SECRET="$(openssl rand -hex 32)"
  else
    RANDOM_SEED="$(printf '%s' "$(date +%s%N)-${RANDOM}-${RANDOM}-$$" | sha256sum | awk '{print $1}')"
    MYSQL_PASSWORD="${RANDOM_SEED:0:20}"
    NEW_ADMIN_PASSWORD="${RANDOM_SEED:20:20}"
    SESSION_SECRET="$(printf '%s' "session-${RANDOM_SEED}-${RANDOM}" | sha256sum | awk '{print $1}')"
  fi
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
  echo "Se conserva el .env existente."
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
echo "CREDENCIALES ADMINISTRATIVAS INICIALES (guárdelas ahora):"
  echo "Email: ${ADMIN_EMAIL_VALUE}"
  echo "Contraseña: ${NEW_ADMIN_PASSWORD}"
fi

echo
echo "SIGUIENTE PASO:"
echo "1. Ingrese a Open Signage Plus con las credenciales anteriores."
echo "2. Termine el asistente inicial de Xibo en el puerto 8081."
echo "3. Cree una aplicación OAuth client_credentials en Xibo."
echo "4. Coloque XIBO_CLIENT_ID y XIBO_CLIENT_SECRET en .env."
echo "5. Ejecute: docker compose --env-file .env -f $COMPOSE_FILE up -d open-signage-api"
echo "6. Entre en Open Signage Plus > Motor Xibo > Verificar conexión."
if [[ "$WITH_AI" -eq 0 ]]; then echo "7. IA opcional: configure un endpoint compatible o instale con perfil Ollama en una instalación nueva usando --with-ai."; fi
