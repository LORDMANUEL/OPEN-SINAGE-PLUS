# Open Signage Plus P0/P1 Production Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Open Signage Plus V2 into a production-ready multi-user signage platform with durable platform data, RBAC/audit, resilient players, operational tooling, campaign/version/media/AI workflows, secure deployment and complete CI coverage.

**Architecture:** Keep Xibo as the signage engine and Open Signage Plus as the product layer. Add a Node 22 native SQLite platform database for PLUS-owned entities and workflows while retaining Xibo/MySQL for signage state; use transactional stores and explicit service boundaries so the platform can later migrate to PostgreSQL without changing API contracts.

**Tech Stack:** React 19, TypeScript, Vite, Node.js 22, Express 5, node:sqlite, node:crypto, Xibo CMS 4.5, Docker Compose, Nginx, Playwright.

**Spec:** README.md and docs/superpowers/specs/2026-08-18-open-signage-plus-v2-xibo-design.md

## Global Constraints

- `main` remains stable; implementation occurs on `feat/production-p0-p1`.
- No secrets in browser bundles or repository history.
- All admin mutations require authentication and RBAC authorization.
- AI never auto-publishes without an explicit approval action.
- Browser player must continue rendering last verified content during network loss.
- Every new backend behavior gets Node test coverage; browser workflows get Playwright coverage.
- CI must fail on high-severity runtime dependency vulnerabilities, build failures, failed backend tests, failed deployment smoke tests or failed E2E.

---

### Task 1: Platform database, users, RBAC and audit
- [ ] Add transactional SQLite database and schema migrations.
- [ ] Add users, roles, sessions, audit log and settings tables.
- [ ] Migrate bootstrap admin into database with scrypt password hashes.
- [ ] Add RBAC middleware and admin/operator/marketing/viewer role matrix.
- [ ] Add user and audit APIs with tests.

### Task 2: Campaigns, versions, approvals and brand kit
- [ ] Add campaigns/scenes metadata, versions, approval states and brand settings.
- [ ] Add create/review/approve/publish/rollback APIs with audit records.
- [ ] Add API tests for approval permissions and rollback.

### Task 3: Device heartbeat, health and observability
- [ ] Persist heartbeat metadata: lastSeen, resolution, UA, app version, storage and current scene.
- [ ] Add online/offline derivation and fleet health endpoints.
- [ ] Add system health aggregation for Xibo, storage, AI and QuickChart.

### Task 4: Robust browser player
- [ ] Add versioned local cache manifest and last-known-good scene metadata.
- [ ] Add exponential reconnect, stale-content indicator and watchdog reload.
- [ ] Add fallback scene behavior and heartbeat reporting.
- [ ] Cover offline recovery and pairing in Playwright.

### Task 5: Backup, restore, update and HTTPS-ready deployment
- [ ] Add backup/restore scripts covering PLUS database, Xibo DB/config and media directories.
- [ ] Add retention pruning and integrity manifest.
- [ ] Add safe update script with pre-update backup and health rollback check.
- [ ] Add reverse-proxy/TLS deployment documentation and optional Caddy profile.

### Task 6: Media lifecycle and optimization metadata
- [ ] Add PLUS media catalog metadata, SHA-256 dedupe, tags, dimensions/duration slots and usage state.
- [ ] Add media search/filter API and orphan cleanup reporting.
- [ ] Keep Xibo Library as the underlying signage media store.

### Task 7: Scheduler and campaign targeting
- [ ] Add campaign target sets, recurrence metadata and calendar API.
- [ ] Map publish actions to Xibo scheduling calls.
- [ ] Add conflict/preview endpoint answering what a display should show at a requested time.

### Task 8: QR, forms and ticketing production workflow
- [ ] Add dynamic QR redirect records and scan counters.
- [ ] Add configurable forms and response storage.
- [ ] Extend queues with services, priorities, counters and SLA timestamps.
- [ ] Add tests for priority ordering and QR redirect accounting.

### Task 9: AI production workflow
- [ ] Add provider health, fallback policy and per-provider timeout/cost metadata.
- [ ] Add brand-kit aware prompt context and scene validation.
- [ ] Add conversational revise endpoint that creates a new version instead of mutating approved content.

### Task 10: Frontend production administration
- [ ] Add Users/Roles, Audit, Campaigns, Fleet Health, Brand Kit, Settings, Backups and Dynamic QR views.
- [ ] Replace technical-only status with actionable operational cards and errors.
- [ ] Maintain responsive PWA behavior.

### Task 11: Security and CI gates
- [ ] Add authorization regression tests, security headers checks, CORS/rate-limit tests and secret-pattern scan.
- [ ] Add database migration smoke test, backup/restore smoke test and Docker stack health test.
- [ ] Require all gates on feature PR before merge.

### Task 12: Documentation and release readiness
- [ ] Update README installation for `main` only.
- [ ] Add operator, admin, security, backup/restore and troubleshooting docs.
- [ ] Add version/changelog and release checklist.
- [ ] Run full CI and only merge after the exact head SHA passes.
