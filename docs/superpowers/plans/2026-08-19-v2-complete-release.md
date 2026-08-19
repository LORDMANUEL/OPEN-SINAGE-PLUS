# Open Signage Plus V2 Complete Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one coherent V2 release branch that exposes browser-first HTML/CSS signage, fixes release metadata/documentation, and passes the existing production CI before merging to `main`.

**Architecture:** Keep Xibo as the signage engine and add HTML Studio as a self-contained PLUS frontend module that publishes the existing `PlayerScene` HTML item type through the already protected `/api/player/scenes` API. Do not execute author HTML in the admin DOM; preview and runtime stay inside sandboxed iframes. Release cleanup remains configuration/documentation only.

**Tech Stack:** React 19, TypeScript 5.9, Vite, Node.js 22, Express 5, Playwright, Docker Compose, Xibo 4.5.

**Spec:** `docs/MODULES.md`

## Global Constraints

- Browser-first playback; no APK requirement.
- HTML authored by users must render only through sandboxed iframes.
- Existing RBAC remains authoritative on backend and reflected in UI.
- No Xibo OAuth or AI secrets may be exposed to the browser.
- Merge only when frontend, backend, deployment and E2E are green on one exact head SHA.

---

### Task 1: HTML Studio E2E contract

**Files:**
- Create: `e2e/tests/html-studio.spec.ts`

**Interfaces:**
- Consumes: existing login flow and `POST /api/player/scenes`.
- Produces: executable E2E contract for navigation, sandboxed preview and publishing.

- [x] **Step 1: Write the failing Playwright test**
- [ ] **Step 2: Run CI and verify RED because HTML Studio navigation does not exist yet**
- [ ] **Step 3: Implement the minimal HTML Studio module**
- [ ] **Step 4: Re-run E2E and verify GREEN**

### Task 2: HTML Studio module

**Files:**
- Create: `src/views/HtmlStudioView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `openSignageApi.createPlayerScene(scene)` and `PlayerScene`.
- Produces: `HTML Studio` navigation entry and publish flow.

- [ ] **Step 1: Build HTML and CSS editors with safe defaults**
- [ ] **Step 2: Build `srcDoc` preview in `<iframe sandbox>`**
- [ ] **Step 3: Publish one full-screen `html` PlayerItem using existing scene API**
- [ ] **Step 4: Show copyable/openable `/player/<token>` result**

### Task 3: Release metadata and installation docs

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/MODULES.md`

**Interfaces:**
- Produces: canonical product identity and `main`-based install instructions.

- [ ] **Step 1: Rename package from temporary scaffold name to `open-signage-plus` and set V2 version**
- [ ] **Step 2: Remove obsolete branch checkout from standard install**
- [ ] **Step 3: Document HTML Studio as part of the Studio module**

### Task 4: Production certification

**Files:**
- Existing `.github/workflows/v2-ci.yml`

**Interfaces:**
- Produces: one exact certified head SHA.

- [ ] **Step 1: Run frontend audit/lint/build**
- [ ] **Step 2: Run backend audit/tests**
- [ ] **Step 3: Run deployment validation, FFmpeg and smoke tests**
- [ ] **Step 4: Run full Playwright Chromium suite including HTML Studio**
- [ ] **Step 5: Merge only the certified head to `main`**
