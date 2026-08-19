#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.v2.yml}"
TLS_COMPOSE_FILE="${TLS_COMPOSE_FILE:-docker-compose.tls.yml}"
NON_INTERACTIVE=0
CONFIGURE_ONLY=0
NO_START=0
TLS_ENABLED=1
DOMAIN_VALUE="${DOMAIN:-}"
ADMIN_EMAIL_VALUE="${ADMIN_EMAIL:-admin@opensignage.local}"
XIBO_CLIENT_ID_VALUE="${XIBO_CLIENT_ID_INPUT:-}"
XIBO_CLIENT_SECRET_VALUE="${XIBO_CLIENT_SECRET_INPUT:-}"
AI_PROVIDER_VALUE="${AI_PROVIDER_INPUT:-}"
AI_BASE_URL_VALUE="${AI_BASE_URL_INPUT:-}"
AI_MODEL_VALUE="${AI_MODEL_INPUT:-qwen2.5:1.5b}"
AI_API_KEY_VALUE="${AI_API_KEY_INPUT:-}"
SMTP_HOST_VALUE="${SMTP_HOST_INPUT:-}"
SMTP_PORT_VALUE="${SMTP_PORT_INPUT:-465}"
SMTP_USER_VALUE="${SMTP_USER_INPUT:-}"
SMTP_PASSWORD_VALUE="${SMTP_PASSWORD_INPUT:-}"
SMTP_FROM_VALUE="${SMTP_FROM_INPUT:-}"
ALERT_EMAIL_VALUE="${ALERT_EMAIL_INPUT:-}"

usage() {
  cat <<'EOF'
Open Signage Plus — wizard productivo

Uso interactivo:
  ./scripts/setup-wizard.sh

Automatización:
  ./scripts/setup-wizard.sh --non-interactive --domain=signage.example.com \
    --admin-email=admin@example.com --ai-provider=none

Opciones:
  --domain=HOST
  --admin-email=EMAIL
  --xibo-client-id=ID
  --xibo-client-secret=SECRET          (preferir XIBO_CLIENT_SECRET_INPUT por historial de shell)
  --ai-provider=none|ollama|compatible
  --ai-base-url=URL --ai-model=MODEL --ai-api-key=KEY
  --smtp-host=HOST --smtp-port=465 --smtp-user=USER --smtp-password=SECRET
  --smtp-from=EMAIL --alert-email=EMAIL
  --no-tls                            modo LAN/HTTP
  --non-interactive
  --configure-only                    no ejecuta install.sh inicial
  --no-start                          solo escribe configuración

Variables recomendadas para secretos:
  XIBO_CLIENT_SECRET_INPUT, AI_API_KEY_INPUT, SMTP_PASSWORD_INPUT
EOF
}

for arg in "$@"; do
  case "$arg" in
    --non-interactive) NON_INTERACTIVE=1 ;;
    --configure-only) CONFIGURE_ONLY=1 ;;
    --no-start) NO_START=1 ;;
    --no-tls) TLS_ENABLED=0 ;;
    --domain=*) DOMAIN_VALUE="${arg#*=}" ;;
    --admin-email=*) ADMIN_EMAIL_VALUE="${arg#*=}" ;;
    --xibo-client-id=*) XIBO_CLIENT_ID_VALUE="${arg#*=}" ;;
    --xibo-client-secret=*) XIBO_CLIENT_SECRET_VALUE="${arg#*=}" ;;
    --ai-provider=*) AI_PROVIDER_VALUE="${arg#*=}" ;;
    --ai-base-url=*) AI_BASE_URL_VALUE="${arg#*=}" ;;
    --ai-model=*) AI_MODEL_VALUE="${arg#*=}" ;;
    --ai-api-key=*) AI_API_KEY_VALUE="${arg#*=}" ;;
    --smtp-host=*) SMTP_HOST_VALUE="${arg#*=}" ;;
    --smtp-port=*) SMTP_PORT_VALUE="${arg#*=}" ;;
    --smtp-user=*) SMTP_USER_VALUE="${arg#*=}" ;;
    --smtp-password=*) SMTP_PASSWORD_VALUE="${arg#*=}" ;;
    --smtp-from=*) SMTP_FROM_VALUE="${arg#*=}" ;;
    --alert-email=*) ALERT_EMAIL_VALUE="${arg#*=}" ;;
    --help|-h) usage; exit 0 ;;
    *) echo "ERROR: argumento desconocido: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

set_env() { node "$ROOT/scripts/env-set.mjs" "$ENV_FILE" "$1" "$2"; }
ask() {
  local var="$1" prompt="$2" default="$3" secret="${4:-0}"
  local value="${!var:-}"
  if [[ "$NON_INTERACTIVE" -eq 1 || -n "$value" ]]; then return; fi
  if [[ "$secret" -eq 1 ]]; then
    read -r -s -p "$prompt" value
    echo
  else
    read -r -p "$prompt [$default]: " value
    value="${value:-$default}"
  fi
  printf -v "$var" '%s' "$value"
}

if [[ "$CONFIGURE_ONLY" -eq 0 && ! -f "$ENV_FILE" ]]; then
  echo 'Creando instalación base y secretos...'
  ./install.sh --admin-email="$ADMIN_EMAIL_VALUE"
fi
[[ -f "$ENV_FILE" ]] || { echo "ERROR: $ENV_FILE no existe. Ejecute install.sh o quite --configure-only." >&2; exit 1; }

ask DOMAIN_VALUE 'Dominio público (vacío para LAN)' ''
[[ -n "$DOMAIN_VALUE" ]] || TLS_ENABLED=0
ask XIBO_CLIENT_ID_VALUE 'Xibo OAuth Client ID (puede dejarse vacío)' ''
if [[ "$NON_INTERACTIVE" -eq 0 && -n "$XIBO_CLIENT_ID_VALUE" && -z "$XIBO_CLIENT_SECRET_VALUE" ]]; then
  ask XIBO_CLIENT_SECRET_VALUE 'Xibo OAuth Client Secret: ' '' 1
fi
if [[ "$NON_INTERACTIVE" -eq 0 && -z "$AI_PROVIDER_VALUE" ]]; then
  read -r -p 'IA [none/ollama/compatible] [none]: ' AI_PROVIDER_VALUE
  AI_PROVIDER_VALUE="${AI_PROVIDER_VALUE:-none}"
fi
AI_PROVIDER_VALUE="${AI_PROVIDER_VALUE:-none}"
case "$AI_PROVIDER_VALUE" in
  none) AI_PROVIDER_VALUE=''; AI_BASE_URL_VALUE=''; AI_MODEL_VALUE=''; AI_API_KEY_VALUE='' ;;
  ollama) AI_BASE_URL_VALUE='http://ollama:11434' ;;
  compatible)
    ask AI_BASE_URL_VALUE 'AI Base URL' ''
    [[ -n "$AI_BASE_URL_VALUE" ]] || { echo 'ERROR: AI Base URL es obligatoria para provider compatible.' >&2; exit 2; }
    ;;
  *) echo "ERROR: proveedor IA inválido: $AI_PROVIDER_VALUE" >&2; exit 2 ;;
esac

if [[ "$NON_INTERACTIVE" -eq 0 && -z "$SMTP_HOST_VALUE" ]]; then
  read -r -p 'SMTP host para alertas (vacío = deshabilitado): ' SMTP_HOST_VALUE
fi
if [[ "$NON_INTERACTIVE" -eq 0 && -n "$SMTP_HOST_VALUE" ]]; then
  ask SMTP_USER_VALUE 'SMTP usuario' ''
  [[ -n "$SMTP_PASSWORD_VALUE" ]] || ask SMTP_PASSWORD_VALUE 'SMTP password: ' '' 1
  ask SMTP_FROM_VALUE 'SMTP From' "$ADMIN_EMAIL_VALUE"
  ask ALERT_EMAIL_VALUE 'Destino de alertas' "$ADMIN_EMAIL_VALUE"
fi

set_env ADMIN_EMAIL "$ADMIN_EMAIL_VALUE"
set_env DOMAIN "$DOMAIN_VALUE"
set_env WEB_BIND "$([[ "$TLS_ENABLED" -eq 1 ]] && echo 127.0.0.1 || echo 0.0.0.0)"
[[ -n "$DOMAIN_VALUE" ]] && set_env CMS_SERVER_NAME "$DOMAIN_VALUE"
set_env XIBO_CLIENT_ID "$XIBO_CLIENT_ID_VALUE"
set_env XIBO_CLIENT_SECRET "$XIBO_CLIENT_SECRET_VALUE"
set_env AI_PROVIDER "$AI_PROVIDER_VALUE"
set_env AI_BASE_URL "$AI_BASE_URL_VALUE"
set_env AI_MODEL "$AI_MODEL_VALUE"
set_env AI_API_KEY "$AI_API_KEY_VALUE"
set_env SMTP_HOST "$SMTP_HOST_VALUE"
set_env SMTP_PORT "$SMTP_PORT_VALUE"
set_env SMTP_USER "$SMTP_USER_VALUE"
set_env SMTP_PASSWORD "$SMTP_PASSWORD_VALUE"
set_env SMTP_FROM "$SMTP_FROM_VALUE"
set_env ALERT_EMAIL_TO "$ALERT_EMAIL_VALUE"
chmod 600 "$ENV_FILE"

if [[ "$NO_START" -eq 1 ]]; then
  echo 'Configuración escrita; arranque omitido por --no-start.'
  exit 0
fi

files=(-f "$COMPOSE_FILE")
profiles=()
if [[ "$TLS_ENABLED" -eq 1 ]]; then
  files+=(-f "$TLS_COMPOSE_FILE")
  profiles+=(--profile tls)
fi
if [[ "$AI_PROVIDER_VALUE" == 'ollama' ]]; then profiles+=(--profile ai); fi

echo 'Aplicando configuración y levantando servicios...'
docker compose --env-file "$ENV_FILE" "${files[@]}" "${profiles[@]}" up -d --build
if [[ "$AI_PROVIDER_VALUE" == 'ollama' ]]; then
  docker compose --env-file "$ENV_FILE" "${files[@]}" --profile ai exec -T ollama ollama pull "$AI_MODEL_VALUE"
fi

if [[ -z "$XIBO_CLIENT_ID_VALUE" || -z "$XIBO_CLIENT_SECRET_VALUE" ]]; then
  cat <<'EOF'

PENDIENTE XIBO:
1. Acceda al Xibo CMS por loopback/túnel administrativo en :8081.
2. Complete el wizard de Xibo.
3. Cree una aplicación OAuth client_credentials.
4. Ejecute de nuevo este wizard con --xibo-client-id y el secreto por XIBO_CLIENT_SECRET_INPUT.
EOF
fi

echo
if [[ "$TLS_ENABLED" -eq 1 ]]; then
  echo "Open Signage Plus: https://$DOMAIN_VALUE"
  echo "Primera pantalla: https://$DOMAIN_VALUE/screen"
else
  echo 'Open Signage Plus: http://SERVIDOR:8080'
  echo 'Primera pantalla: http://SERVIDOR:8080/screen'
fi
echo 'Diagnóstico: ./scripts/doctor.sh'
