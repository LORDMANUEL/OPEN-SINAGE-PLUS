# Open Signage Plus V2 Release Gate

This release is considered ready only when the exact release branch head passes all four CI jobs: frontend, backend, deployment, and E2E.

The V2 release includes the modular P0/P1 platform already merged to `main` plus final release cleanup and browser-first HTML/CSS authoring.

## Gate

- Product identity is `open-signage-plus`.
- Standard installation uses `main`; no feature-branch checkout is required.
- HTML Studio previews authored markup inside an iframe with the `sandbox` attribute.
- HTML Studio publishes through the existing protected scene API and returns a browser player URL.
- Existing RBAC, Xibo gateway, player, kiosk, media, AI, organizations, forms, planning, operations, lifecycle, and security modules must remain green.
