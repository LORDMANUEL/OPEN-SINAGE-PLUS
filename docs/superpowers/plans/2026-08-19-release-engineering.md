# Open Signage Plus Release Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task.

**Goal:** Formalize Alpha → Beta → Stable release channels with 5 alphas per beta and 3 betas per stable, while cleaning release metadata and generated artifacts.

**Architecture:** Permanent `alpha`, `beta`, and `main` branches. Git tags are the source of truth for prerelease counts. A Node release policy engine validates contiguous tags and promotion thresholds; GitHub Actions checks the current SHA before creating tags or promotion PRs.

**Tech Stack:** Node.js 22, Git, GitHub Actions, npm SemVer metadata, existing React/Node/Docker CI.

**Spec:** `MASTER.md` and `docs/RELEASES.md`.

## Tasks

- [x] Implement and locally test release policy, CLI and configuration.
- [x] Add strict 5 Alpha → Beta and 3 Beta → Stable gates.
- [x] Add channel-aware CI for `alpha`, `beta`, `main`.
- [x] Add prerelease/stable tag and release-note automation.
- [x] Add automatic stable preparation branch after beta.3.
- [x] Synchronize `package-lock.json` root metadata without dependency churn.
- [x] Remove tracked `.vite` cache and unrelated legacy artifacts.
- [x] Update README/MASTER and add `docs/RELEASES.md`.
- [ ] Verify GitHub CI on the exact PR head.
- [ ] Merge only the green head and synchronize permanent channel branches.
- [ ] Confirm bootstrap `v2.0.0` tag/release.
- [ ] Apply GitHub branch protection/rulesets (repository administration setting).
