# Open Signage Plus V2 — Xibo-backed Design

## Goal
Build Open Signage Plus as a simplified PWA and orchestration layer on top of Xibo CMS, keeping Xibo as the signage engine while exposing our own UI, AI, QR/ticketing and browser-first player capabilities.

## Architecture

- **Xibo CMS** remains the authoritative signage engine for displays, media, layouts/playlists and schedules.
- **Open Signage API** is the only component allowed to hold Xibo OAuth client credentials. It authenticates with `client_credentials` and translates Open Signage operations into Xibo REST API calls.
- **Open Signage Admin PWA** never talks to Xibo directly. It calls Open Signage API only.
- **Open Signage Web Player** is browser/PWA-first. Native/Electron wrappers are optional, not required for normal playback.
- **PLUS Services** own capabilities that do not belong in Xibo: AI generation, QR/ticketing, guided workflows, audit metadata and interactive business actions.

## Security boundaries

1. Xibo `clientSecret` is server-side only and must never be sent to React/player clients.
2. Xibo base URL is validated as HTTP(S), normalized, and all API calls use explicit timeouts.
3. The gateway never logs OAuth secrets or access tokens.
4. Generated HTML/JS is treated as untrusted content and must ultimately run sandboxed.
5. Browser player pairing uses opaque tokens, not Xibo credentials.

## Phase 1 vertical slice

Phase 1 is complete only when these flows work end-to-end:

1. Open Signage API reports health independently from Xibo.
2. API can authenticate to a configured Xibo CMS with OAuth2 client credentials.
3. API can report Xibo connection status and fetch displays from `GET /api/display`.
4. API can create Xibo schedule events through `POST /api/schedule` using form data.
5. Admin PWA has an Integration view that can inspect gateway/Xibo status and list displays.
6. Browser/PWA foundation is installable and does not require Electron.
7. Automated tests cover URL normalization, token caching, authenticated Xibo requests and gateway routes.
8. GitHub Actions runs frontend build/lint plus backend tests on every V2 push/PR.

## Xibo compatibility

Xibo installations expose a version-specific `swagger.json`; Open Signage must prefer runtime capability discovery in later phases rather than assuming every Xibo release has identical request fields. Phase 1 targets current Xibo REST conventions: OAuth token at `/api/authorize/access_token`, displays at `/api/display`, schedules at `/api/schedule`.

## Later phases

- Media upload and library browsing.
- Layout/playlist authoring adapters.
- Guided designer and reusable templates.
- AI Gateway: local Ollama plus optional cloud providers behind one provider interface.
- QR/ticketing/queue service and touch workflows.
- XLF/XMDS-compatible browser player work where practical, plus offline cache, Proof of Play and heartbeat.
- Multi-tenant domain model, roles, audit, observability and production Docker deployment.

## Non-goals for Phase 1

Phase 1 does not claim full Xibo player protocol compatibility, complete layout editing, production ticketing, or autonomous AI publishing. Those remain explicit subsequent milestones.