#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

env_file="$tmp/.env"
cat > "$env_file" <<'ENV'
ADMIN_EMAIL=old@example.com
DOMAIN=
WEB_BIND=0.0.0.0
CMS_SERVER_NAME=localhost
XIBO_CLIENT_ID=
XIBO_CLIENT_SECRET=
AI_PROVIDER=
AI_BASE_URL=
AI_MODEL=
AI_API_KEY=
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
ALERT_EMAIL_TO=
ENV

ENV_FILE="$env_file" bash ./scripts/setup-wizard.sh \
  --configure-only --no-start --non-interactive \
  --domain=signage.example.com \
  --admin-email=admin@example.com \
  --xibo-client-id=client-id \
  --xibo-client-secret=client-secret \
  --ai-provider=compatible \
  --ai-base-url=https://ai.example/v1 \
  --ai-model=model-a \
  --smtp-host=smtp.example.com \
  --smtp-user=signage \
  --smtp-password=smtp-secret \
  --smtp-from=signage@example.com \
  --alert-email=ops@example.com

grep -qx 'DOMAIN=signage.example.com' "$env_file"
grep -qx 'WEB_BIND=127.0.0.1' "$env_file"
grep -qx 'CMS_SERVER_NAME=signage.example.com' "$env_file"
grep -qx 'XIBO_CLIENT_ID=client-id' "$env_file"
grep -qx 'XIBO_CLIENT_SECRET=client-secret' "$env_file"
grep -qx 'AI_PROVIDER=compatible' "$env_file"
grep -qx 'AI_BASE_URL=https://ai.example/v1' "$env_file"
grep -qx 'SMTP_PASSWORD=smtp-secret' "$env_file"
grep -qx 'ALERT_EMAIL_TO=ops@example.com' "$env_file"
[[ "$(stat -c '%a' "$env_file")" == '600' ]]

# Re-running the wizard with unrelated changes must never blank existing
# Xibo/SMTP credentials. AI is explicitly disabled here and therefore cleared.
ENV_FILE="$env_file" bash ./scripts/setup-wizard.sh \
  --configure-only --no-start --non-interactive --no-tls \
  --domain=lan.local --admin-email=admin@example.com --ai-provider=none

grep -qx 'WEB_BIND=0.0.0.0' "$env_file"
grep -qx 'AI_PROVIDER=' "$env_file"
grep -qx 'AI_BASE_URL=' "$env_file"
grep -qx 'XIBO_CLIENT_ID=client-id' "$env_file"
grep -qx 'XIBO_CLIENT_SECRET=client-secret' "$env_file"
grep -qx 'SMTP_HOST=smtp.example.com' "$env_file"
grep -qx 'SMTP_PASSWORD=smtp-secret' "$env_file"
grep -qx 'ALERT_EMAIL_TO=ops@example.com' "$env_file"

echo 'Setup wizard self-test passed: TLS/LAN paths and existing secrets preserved'