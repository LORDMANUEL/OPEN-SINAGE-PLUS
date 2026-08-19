# Branch protection — Open Signage Plus

Esta política acompaña el modelo `feature/* → alpha → beta → main` y debe reflejarse en GitHub Rulesets/Branch Protection.

## `alpha`

Objetivo: integración rápida de funcionalidades nuevas.

- Requerir Pull Request para cambios normales.
- Bloquear force-push.
- Bloquear eliminación de la rama.
- Required checks:
  - `release-policy`
  - `frontend`
  - `backend`
  - `e2e`
- `deployment` no es obligatorio para Alpha.
- No exigir aprobación humana mínima mientras el repositorio sea mantenido por una sola persona; si se suma equipo, subir a 1 aprobación.

## `beta`

Objetivo: estabilización y candidato de release.

- Requerir Pull Request.
- Bloquear force-push y eliminación.
- Requerir branch actualizada antes de merge.
- Required checks:
  - `release-policy`
  - `frontend`
  - `backend`
  - `e2e`
  - `deployment`
- Solo fixes, hardening, compatibilidad y cambios expresamente aceptados para el release train.

## `main`

Objetivo: versiones estables únicamente.

- Requerir Pull Request.
- Bloquear force-push y eliminación.
- Requerir branch actualizada antes de merge.
- Required checks:
  - `release-policy`
  - `frontend`
  - `backend`
  - `e2e`
  - `deployment`
- No permitir features experimentales directas.
- Los releases estables se etiquetan `vX.Y.Z` desde `main` después de los gates.

## Hotfix

1. Crear `hotfix/<descripcion>` desde `main`.
2. Ejecutar todos los checks estables.
3. Merge a `main`.
4. Propagar el mismo fix a `beta` y `alpha` mediante PR.

## Nota administrativa

Los workflows y checks se versionan en este repositorio. La activación efectiva de Rulesets/Branch Protection es una configuración administrativa de GitHub y debe verificarse en **Settings → Rules → Rulesets** o **Settings → Branches**.
