# Open Signage Plus V2 Xibo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first functional Open Signage Plus vertical slice backed by Xibo CMS through a secure server-side OAuth2 gateway and browser-first PWA admin/player foundation.

**Architecture:** Keep Xibo as the signage engine; introduce a server-side adapter that owns Xibo credentials and exposes stable Open Signage routes. The React/Vite frontend consumes only Open Signage API. Browser/PWA is the primary client model; Electron is retained only as a legacy optional wrapper.

**Tech Stack:** React 19, TypeScript, Vite 7, Node.js, Express 5, Node built-in test runner, Playwright, Xibo REST/OAuth2.

**Spec:** `docs/superpowers/specs/2026-08-18-open-signage-plus-v2-xibo-design.md`

## Global Constraints

- Never expose Xibo client secrets to browser code.
- Do not modify `main`; work only on `feat/open-signage-plus-v2-xibo`.
- Browser/PWA first; no APK/Electron requirement for the normal flow.
- All new backend behavior gets tests before production implementation.
- Phase 1 is not marked complete unless CI build/lint/backend tests pass.

---

### Task 1: Xibo OAuth/API adapter

**Files:**
- Create: `packages/backend/test/xibo-client.test.js`
- Create: `packages/backend/src/xibo-client.js`

**Interfaces:**
- Produces: `XiboClient({baseUrl, clientId, clientSecret, fetchImpl})`
- Produces: `authenticate()`, `request(path, options)`, `getDisplays()`, `createSchedule(payload)`

- [ ] Write tests for URL normalization and missing configuration.
- [ ] Run tests and confirm RED because `src/xibo-client.js` does not exist.
- [ ] Implement URL validation/normalization.
- [ ] Add tests for OAuth `client_credentials`, token caching and Authorization header.
- [ ] Run RED, implement minimal authentication/request behavior, then verify GREEN.
- [ ] Add schedule form-encoding test and implementation.

### Task 2: Open Signage API gateway

**Files:**
- Create: `packages/backend/test/app.test.js`
- Create: `packages/backend/src/app.js`
- Modify: `packages/backend/index.js`
- Modify: `packages/backend/package.json`

**Interfaces:**
- Produces: `createApp({xiboClient})`
- Routes: `GET /api/health`, `GET /api/integrations/xibo/status`, `GET /api/xibo/displays`, `POST /api/xibo/schedules`

- [ ] Write route tests with a deterministic fake Xibo adapter and confirm RED.
- [ ] Implement `createApp` with input validation and normalized error responses.
- [ ] Make `index.js` build a real Xibo client strictly from server environment variables.
- [ ] Configure `npm test` as `node --test`.
- [ ] Verify backend tests GREEN.

### Task 3: Admin PWA integration UI

**Files:**
- Create: `src/services/openSignageApi.ts`
- Create: `src/views/IntegrationView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Modify: `index.html`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `/api/health`, `/api/integrations/xibo/status`, `/api/xibo/displays`
- Produces: guided integration screen showing gateway status, Xibo status and registered displays.

- [ ] Add typed API client with explicit errors.
- [ ] Add Integration view with loading/error/connected states.
- [ ] Wire navigation without exposing Xibo credentials.
- [ ] Add manifest/service worker and register it only in supported browsers.
- [ ] Run frontend TypeScript build and lint in CI.

### Task 4: CI and deployment baseline

**Files:**
- Create: `.github/workflows/v2-ci.yml`
- Create: `.env.example`
- Create: `docker-compose.v2.yml`
- Create: `docs/deployment/v2-xibo.md`

**Interfaces:**
- CI produces evidence for frontend build/lint and backend tests.
- Docker baseline wires Open Signage API to an externally supplied Xibo URL or Docker service name while keeping credentials server-side.

- [ ] Add GitHub Actions Node workflow.
- [ ] Document Xibo application creation and OAuth environment variables.
- [ ] Add safe environment template with no real secrets.
- [ ] Add Docker baseline for Open Signage web/API plus Xibo attachment points.
- [ ] Verify workflow results and fix failures before calling Phase 1 complete.