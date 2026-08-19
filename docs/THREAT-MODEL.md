# Threat Model — Open Signage Plus

## Purpose

This threat model describes repository-wide security boundaries for Open Signage Plus. It is intentionally broader than a single PR or endpoint and should be reviewed when the deployment model, tenant model, authentication model or public player surfaces change.

## Product surfaces

Open Signage Plus has two primary classes of surface:

1. **Administrative surfaces** — authenticated PWA/API operations for users, organizations, media, Studio, Xibo, scheduling, campaigns, analytics, alerts and configuration.
2. **Public/runtime surfaces** — `/screen`, `/player/<token>`, public forms, public ticket issuance, QR redirects and selected telemetry/heartbeat flows required by signage/kiosk operation.

The backend also acts as a privileged integration gateway to Xibo, AI providers, SMTP/webhooks, FFmpeg and persistent volumes.

## Assets and privileges

| Asset | Impact if compromised |
|---|---|
| Admin/marketing/operator sessions | Unauthorized content, users, queues or configuration |
| Tenant memberships | Cross-company data/control exposure |
| Xibo OAuth credentials | Signage-engine control |
| AI/SMTP/webhook credentials | External-service abuse or data exposure |
| Media/layouts/scenes/schedules | Brand/content integrity |
| Device pairing tokens | Unauthorized screen assignment |
| Forms/tickets/analytics | Customer/operational data exposure or corruption |
| `.env` and backups | Broad credential and data compromise |
| Release tags/branches/workflows | Supply-chain compromise of stable releases |

## Trust boundaries

```text
Untrusted browser / public client
            |
            v
      Nginx / PWA / API
            |
   +--------+---------+------------------+
   |                  |                  |
 Auth/RBAC        Public runtime      File/media
   |                  |                  |
Tenant scope      Player/Kiosk       FFmpeg/storage
   |                  |                  |
   +--------+---------+------------------+
            |
       PLUS backend
            |
   +--------+--------+----------+
   |                 |          |
 Xibo API         AI API     SMTP/Webhook
   |
 Xibo/MySQL/XMR
```

A second boundary exists in source control:

```text
feature/* -> alpha -> beta -> release/vX.Y.Z -> main -> vX.Y.Z
```

CI gates are part of the trust decision for release promotion.

## Attacker-controlled inputs

- Login credentials and Authorization headers.
- Query parameters, JSON bodies, multipart uploads and filenames.
- Public form responses and ticket requests.
- Pairing codes/device metadata/heartbeat fields.
- Scene contents, HTML/CSS and external media URLs authored by permitted users.
- Xibo/AI/webhook/SMTP responses or failures.
- Archive files supplied to restore tooling by an operator.
- Branch/PR contents from contributors.

## Security invariants

1. A valid session does not imply access to every tenant.
2. Every tenant-scoped operation derives authorization from server-side membership/scope, never only from a client-provided organization ID.
3. Administrative mutation requires both authentication and the precise RBAC permission.
4. Public routes expose only the minimum information/function required for runtime operation.
5. Secrets are server-side and redacted from user-facing errors.
6. User-authored HTML cannot execute script in the administrative origin.
7. Remote URL fetches are constrained and cannot reach arbitrary local/private services.
8. Upload/transcoding paths and restore archives cannot escape approved data directories.
9. Rate limiting is applied to public abuse-prone endpoints and authentication.
10. Release promotion cannot create a stable tag from a SHA missing required checks.
11. Backups are integrity-checked before restore; restore/update abort on failure.
12. Cross-origin browser access is opt-in, not reflective by default.

## High-value abuse cases

### A. Cross-tenant enumeration or mutation

**Threat:** a user from Tenant A supplies Tenant B identifiers to list locations, fetch data or mutate resources.

**Required controls:** membership-scoped queries, negative cross-tenant tests, backend RBAC, non-enumerating responses where practical.

### B. Privileged API credential leakage

**Threat:** Xibo/AI/SMTP/session credentials reach the browser or logs.

**Required controls:** server-side integration gateway, secret redaction, `.env` ignored, secret scanning, least-privilege workflow tokens.

### C. Public endpoint abuse

**Threat:** automated ticket/form/pairing/QR requests cause spam, resource exhaustion or state corruption.

**Required controls:** rate limits, bounded payloads, validation, cryptographic tokens, conservative responses and monitoring.

### D. SSRF through integrations/media

**Threat:** an authorized content creator supplies a URL that causes the server to access cloud metadata, localhost or internal services.

**Required controls:** explicit server-side fetch policy, scheme allowlist, DNS/IP validation where server-side fetch is needed, timeouts and response-size bounds. Prefer client/player fetch when server-side access is not required.

### E. HTML/interactive content escapes sandbox

**Threat:** authored HTML executes with administrative-origin privileges.

**Required controls:** `iframe sandbox` without script permission for user HTML, no DOM insertion into admin UI, security regression tests and CSP.

### F. File/archive/FFmpeg abuse

**Threat:** malicious filenames/archive entries/media arguments escape data roots or inject commands.

**Required controls:** generated filenames, argument arrays instead of shell interpolation, upload limits, archive path validation, restricted temporary directories and container isolation.

### G. Supply-chain/release bypass

**Threat:** unverified code is promoted directly to stable or tags are cut from an unverified SHA.

**Required controls:** Alpha/Beta/Stable policy, exact-SHA checks, protected branches/rulesets, pinned/trusted actions, SAST/secret/container gates and auditable release tags.

## Availability and recovery

Important availability failure modes are disk exhaustion, media growth, database corruption, expired TLS, failed backup jobs, Xibo outage and Browser Player connectivity loss. The product should favor last-known-good playback, health alerts, tested backup/restore and fail-closed administrative updates rather than silently corrupting state.

## Assumptions

- Host/root administrators are trusted to manage the server.
- Production firewall/reverse proxy exposes only required services.
- Xibo upstream and container registries are external dependencies and must be patched/scanned.
- Multi-replica PLUS operation is not assumed until shared transactional persistence is implemented.
- Physical access to kiosk hardware is outside the web threat boundary but kiosk mode should minimize escape paths.

## Security test requirements

At minimum, future security-sensitive work must preserve automated tests for:

- authentication/session rejection;
- permission rejection by role;
- cross-tenant negative access;
- CORS deny-by-default;
- rate limits;
- path/archive validation;
- HTML sandboxing;
- release-policy correctness;
- dependency/security scanner gates.

Repository: LORDMANUEL/OPEN-SINAGE-PLUS
Version: feat/p0-security-hardening
