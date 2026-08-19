#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="docker-compose.v2.yml"
ENV_FILE=".env"

echo "Open Signage Plus V2 — instalador"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no está instalado o no está en PATH." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 no está disponible (se requiere 'docker compose')." >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "ERROR: no se encontró $COMPOSE_FILE. Ejecute este script desde la raíz del repositorio." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    MYSQL_PASSWORD="$(openssl rand -hex 10)"
  else
    MYSQL_PASSWORD="$(printf '%s' "$(date +%s%N)-${RANDOM}-${RANDOM}" | sha256sum | awk '{print substr($1,1,20)}')"
  fi

  cat > "$ENV_FILE" <<EOF
PORT=3000
XIBO_BASE_URL=http://cms-web
XIBO_CLIENT_ID=
XIBO_CLIENT_SECRET=
XIBO_TIMEOUT_MS=10000
MYSQL_PASSWORD=${MYSQL_PASSWORD}
CMS_SERVER_NAME=localhost
VITE_API_BASE_URL=
EOF
  chmod 600 "$ENV_FILE"
  echo "Creado .env con contraseña MySQL aleatoria. Las credenciales OAuth de Xibo quedan pendientes de configurar."
else
  echo "Se conserva el .env existente."
fi

mkdir -p \
  shared/db \
  shared/backup \
  shared/cms/custom \
  shared/cms/library \
  shared/cms/web/userscripts \
  shared/cms/ca-certs \
  shared/open-signage

echo "Validando configuración Docker..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

echo "Construyendo y levantando servicios..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo
echo "Estado de servicios:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo
echo "Open Signage Plus: http://localhost:8080"
echo "Xibo CMS (configuración inicial): http://localhost:8081"
echo
echo "SIGUIENTE PASO:"
echo "1. Termine el asistente inicial de Xibo en el puerto 8081."
echo "2. Cree una aplicación OAuth client_credentials en Xibo."
echo "3. Coloque XIBO_CLIENT_ID y XIBO_CLIENT_SECRET en .env."
echo "4. Ejecute: docker compose --env-file .env -f $COMPOSE_FILE up -d open-signage-api"
echo "5. Entre en Open Signage Plus > Motor Xibo > Verificar conexión."
