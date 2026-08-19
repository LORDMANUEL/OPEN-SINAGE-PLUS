# Security Policy — Open Signage Plus

## System and scope

Open Signage Plus is a browser-first digital-signage, kiosk and queue platform that uses Xibo CMS as its signage engine. This policy covers the PWA, Node.js API, Browser Player, kiosk/form/queue public surfaces, release automation, Docker deployment, Xibo gateway and PLUS persistence.

Primary runtime components:

- `src/`: administrative PWA and public browser runtimes.
- `packages/backend/`: authentication, authorization, tenant scope, Xibo/AI integrations, player/device/queue/form/media APIs and persistence.
- `deploy/`, `docker-compose*.yml`, `install.sh`, `scripts/`: production deployment and lifecycle.
- `.github/workflows/`: CI, security gates and Alpha/Beta/Stable release automation.

Xibo, MySQL, Ollama and other infrastructure services are dependencies/trust boundaries. The product must not rely on exposing their administrative interfaces to untrusted Internet clients.

## Threat model and trust boundaries

### Assets that matter

- Administrative sessions and RBAC identity.
- Xibo OAuth credentials and Xibo content-control privileges.
- AI, SMTP and webhook secrets.
- Tenant/organization memberships and customer data.
- Media, campaigns, schedules, layouts and published scenes.
- Public kiosk/form/queue inputs and ticket data.
- Device pairing tokens and player assignment state.
- Backups, `.env` and lifecycle credentials.
- GitHub release/tag/branch integrity.

### Trust boundaries

1. **Internet/browser → Nginx/PWA/API.** All browser input is untrusted.
2. **Public player/kiosk/form/queue routes → backend.** These routes intentionally accept unauthenticated input and require strict allowlists, size limits and rate limits.
3. **Authenticated user → tenant-scoped business data.** Authentication alone never grants cross-tenant access.
4. **Open Signage API → Xibo/AI/SMTP/webhook services.** Credentials remain server-side; remote responses are untrusted.
5. **Container → host persistent volumes/backups.** Paths, archives and temporary files must not escape approved data roots.
6. **Feature/alpha/beta branches → stable release.** Promotion requires CI gates; tags and release metadata must not bypass the channel policy.

## Security invariants

The following properties must hold:

1. Authorization is enforced in the backend. UI visibility is never an authorization control.
2. Non-admin users can read or mutate only organizations/locations/resources authorized by their memberships and permissions.
3. Tenant identifiers supplied by clients are not trusted as proof of tenant membership.
4. Administrative mutations require a valid non-expired signed session and the specific RBAC permission for the operation.
5. Xibo OAuth secrets, AI API keys, SMTP credentials, session secrets and backup secrets never appear in browser payloads, logs intended for users, or committed files.
6. User-authored HTML runs only in a sandboxed iframe without script privileges unless a future reviewed capability explicitly changes that boundary.
7. External URLs accepted by PLUS are allowlisted by scheme and bounded by timeout/size. Server-side fetches must not become generic SSRF proxies.
8. Public endpoints use request-size limits, validation and rate limiting; they must fail closed on malformed data.
9. Device/scene tokens are cryptographically random and are not sequential identifiers.
10. Backup restore validates integrity and archive paths before extraction; restore/update must fail closed when validation fails.
11. Cross-origin access is denied by default unless an origin is explicitly configured.
12. `main`, `beta` and `alpha` release promotion is based on successful checks for the exact SHA being promoted.
13. Production containers should run with the least privileges practical and expose only required ports.
14. Security failures must not be hidden by mocks, retries that convert failures to success, or skipped mandatory gates.

## Reportable findings and severity context

Reportable issues include, among others:

- Authentication or session bypass.
- Missing/incorrect RBAC on a meaningful operation.
- Cross-tenant read or write access.
- Secret leakage to clients, repository or logs.
- SSRF, path traversal, unsafe archive extraction or arbitrary file write/read.
- XSS/script execution escaping the player HTML sandbox or administrative DOM.
- Command injection into FFmpeg, lifecycle scripts, shell workflows or integrations.
- Unsafe redirect/navigation that crosses documented kiosk trust boundaries.
- Bypass of release gates/tags that could place unverified code in `main`.
- Public-endpoint abuse that realistically causes data corruption, denial of service or unauthorized workflow actions.

Severity should reflect realistic reachability, privilege required, tenant scope, persistence, confidentiality/integrity impact and whether the affected route is Internet-facing.

## Out of scope and accepted limitations

- Denial of service that requires administrator/root access to the host is not treated as an Internet-originating vulnerability by itself.
- Xibo upstream vulnerabilities are tracked as dependency risk unless Open Signage Plus introduces or amplifies the vulnerable path.
- Browser/platform limitations of Tizen/webOS/Android TV are compatibility issues unless they create a security boundary bypass.
- The Browser Player is not a full XMDS/XLF reimplementation; missing Xibo-only features are not security findings by themselves.
- Branch protection is a GitHub repository setting and must be configured separately from code; lack of configuration is an operational P0 until enabled.

## Known limitations and compensating controls

- Some PLUS state remains single-node/local persistence; horizontal multi-replica operation requires the future HA persistence architecture.
- Hardware/browser certification is tracked separately from automated browser tests.
- Public forms, queues and pairing are intentionally reachable without admin authentication; rate limits, bounded schemas and non-sensitive responses are required compensating controls.
- Xibo admin binds to loopback by default; production operators should access it through an administrative network or tunnel rather than expose it directly.

## Vulnerability handling

Do not publish secrets, production credentials or exploit details for an unpatched vulnerability in a public issue. Prefer GitHub Private Vulnerability Reporting when enabled for the repository, or contact the repository owner through a private channel before public disclosure.

## Review rule

Changes touching authentication, RBAC, tenant scoping, public routes, server-side URL fetching, HTML sandboxing, lifecycle scripts, release workflows or secret handling require security-focused tests and the applicable CI/security gates before promotion.
