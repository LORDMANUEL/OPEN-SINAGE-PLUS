# Open Signage Plus V2 + Xibo 4.5.0 Deployment

This stack intentionally keeps Xibo CMS as the signage engine and Open Signage Plus as the user-facing PWA/gateway.

## 1. Prepare configuration

```bash
cp .env.example .env
```

Set a unique alphanumeric `MYSQL_PASSWORD`. Leave `XIBO_CLIENT_ID` and `XIBO_CLIENT_SECRET` placeholders for the first boot.

## 2. Start Xibo and Open Signage containers

```bash
docker compose --env-file .env -f docker-compose.v2.yml up -d --build
```

Initial endpoints:

- Open Signage Plus: `http://SERVER:8080`
- Xibo CMS bootstrap/admin: `http://SERVER:8081`
- XMR: TCP `9505`

The Xibo image is pinned to the official `ghcr.io/xibosignage/xibo-cms:release-4.5.0` container used by Xibo Docker 4.5.0.

## 3. Secure the Xibo admin account

On a fresh Xibo Docker installation the documented default account is `xibo_admin` / `password`. Change that password immediately before exposing the service.

Do not expose the Xibo CMS admin interface publicly unless required. In the target architecture only Open Signage administrators need the Open Signage UI; the API container reaches Xibo over the internal Docker network.

## 4. Create the Open Signage OAuth application in Xibo

In Xibo CMS create an Application allowed to use the `client_credentials` grant. Copy its client ID and client secret into `.env`:

```env
XIBO_CLIENT_ID=...
XIBO_CLIENT_SECRET=...
```

Restart only the Open Signage API:

```bash
docker compose --env-file .env -f docker-compose.v2.yml up -d --build open-signage-api
```

The secret is consumed server-side only and must never be placed in `VITE_*` variables or browser storage.

## 5. Validate the integration

Open `http://SERVER:8080`, sign in to the current V2 admin shell, and select **Motor Xibo**. The page checks:

1. Open Signage API health.
2. OAuth authentication against Xibo `/api/authorize/access_token`.
3. Display listing from Xibo `/api/display`.

API checks can also be performed through the Open Signage endpoint:

```bash
curl http://SERVER:8080/api/health
curl http://SERVER:8080/api/integrations/xibo/status
curl http://SERVER:8080/api/xibo/displays
```

## Scheduling gateway

Open Signage exposes:

```http
POST /api/xibo/schedules
Content-Type: application/json
```

Required Open Signage fields for Phase 1 are `layoutId`, `eventTypeId`, and `displayGroupIds`. The backend converts the payload to the form-encoded request expected by Xibo and sends it to `/api/schedule` with the OAuth Bearer token.

## Security notes

- Terminate TLS at a reverse proxy before production use.
- Do not commit `.env` or Xibo `config.env`.
- Restrict direct access to Xibo port 8081 after bootstrap if the deployment does not require it.
- Keep XMR 9505 reachable only where player architecture requires it.
- Back up `shared/db`, `shared/cms/library`, and `shared/backup`.
- Runtime Xibo compatibility should be checked against each installation's `/swagger.json` before adding new adapter operations.
