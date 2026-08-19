# Release bootstrap status

This document records the one-time transition from a single `main` branch to permanent `alpha`, `beta`, and `main` channels.

- Stable baseline: `2.0.0`.
- Next release train: `2.1.0`.
- Alpha threshold: 5.
- Beta threshold: 3.
- `alpha` and `beta` were created from the stable baseline before release-engineering code was integrated.
- After this PR merges, both permanent branches must be fast-forwarded to the new stable main head before feature development resumes.
- `bootstrap-v2.yml` creates `v2.0.0` once if the tag is missing.
