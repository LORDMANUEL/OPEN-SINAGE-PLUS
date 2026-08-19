# Branch protection — Open Signage Plus

Esta política acompaña el modelo `feature/* → alpha → beta → main` y debe reflejarse en GitHub **Rulesets / Branch Protection**. Los nombres indicados aquí coinciden con los jobs que usa el workflow de promoción.

## `alpha`

Objetivo: integración rápida de funcionalidades nuevas sin renunciar a seguridad básica.

- Requerir Pull Request para cambios normales.
- Bloquear force-push y eliminación de la rama.
- Required checks:
  - `release-policy`
  - `lifecycle`
  - `frontend`
  - `backend`
  - `e2e`
  - `security-codeql`
  - `security-secrets`
  - `security-fs`
- `deployment` y `security-images` no son obligatorios para Alpha; se exigen a partir de Beta.
- No exigir aprobación humana mínima mientras el repositorio tenga un único mantenedor. Con más de un mantenedor, exigir al menos 1 aprobación.

## `beta`

Objetivo: estabilización y candidato de release.

- Requerir Pull Request.
- Requerir branch actualizada antes de merge.
- Bloquear force-push y eliminación.
- Required checks:
  - `release-policy`
  - `lifecycle`
  - `frontend`
  - `backend`
  - `e2e`
  - `deployment`
  - `security-codeql`
  - `security-secrets`
  - `security-fs`
  - `security-images`
- Solo fixes, hardening, compatibilidad y cambios expresamente aceptados para el release train.

## `main`

Objetivo: versiones estables únicamente.

- Requerir Pull Request.
- Requerir branch actualizada antes de merge.
- Bloquear force-push y eliminación.
- Required checks: los mismos 10 checks de `beta`.
- No permitir features experimentales directas.
- Los releases estables se etiquetan `vX.Y.Z` desde `main` después de los gates.

## Hotfix

1. Crear `hotfix/<descripcion>` desde `main`.
2. Ejecutar todos los checks estables, incluidos security/lifecycle.
3. Merge a `main`.
4. Propagar el mismo fix a `beta` y `alpha` mediante PR.

## Validación administrativa

Los workflows y checks se versionan en el repositorio, pero la activación efectiva de Rulesets es configuración administrativa de GitHub.

Verificar en **Settings → Rules → Rulesets** que:

- `alpha`, `beta` y `main` estén protegidas;
- force-push y branch deletion estén bloqueados;
- los checks anteriores sean obligatorios;
- un PR con cualquier check rojo no pueda fusionarse.

El issue P0 de Branch Protection solo se cierra después de comprobar esas reglas en GitHub; documentar la intención en código no equivale a protección efectiva.
