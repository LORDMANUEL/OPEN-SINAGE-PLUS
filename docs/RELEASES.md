# Release engineering — Open Signage Plus

## Canales permanentes

- `alpha`: integración de funcionalidades nuevas.
- `beta`: estabilización, fixes, hardening y compatibilidad.
- `main`: únicamente versiones estables.

Las funciones nacen en `feature/*` y entran mediante PR a `alpha`.

## Política 5 → 1 → 3 → 1

Para la versión objetivo indicada en `release.config.json`:

1. se cortan `alpha.1` a `alpha.5`;
2. `alpha.5` habilita PR `alpha → beta`;
3. en `beta` se cortan `beta.1` a `beta.3`;
4. `beta.3` genera una rama `release/vX.Y.Z`, sincroniza `package.json`/`package-lock.json`, avanza `release.config.json` al siguiente ciclo y abre PR a `main`;
5. después del merge estable se corta `vX.Y.Z` desde `main`.

El conteo de alphas/betas se hace por tags Git; no se lleva manualmente. Si falta un número intermedio, la política falla y bloquea la promoción.

## Uso

En GitHub Actions ejecutar **Cut / Promote Release Channel** desde la rama correspondiente:

- `alpha` + channel `alpha`;
- `beta` + channel `beta`;
- `main` + channel `stable`.

El workflow se niega a cortar una versión si los checks requeridos del SHA actual no están verdes.

## Gates

Alpha exige `release-policy`, frontend, backend y E2E. Beta y Stable exigen además deployment completo.

## Preparación estable

Al cortar `beta.3`, el workflow crea automáticamente `release/vX.Y.Z`, actualiza `package.json` y `package-lock.json` con `npm version`, mueve `stableVersion` al release que entra y `nextVersion` al siguiente minor, y abre PR a `main`.

## Bootstrap v2.0.0

El workflow `Bootstrap v2.0.0 Stable Tag` crea una sola vez el tag/release inicial `v2.0.0` al aterrizar esta infraestructura de releases en `main`.

## Hotfix

`main → hotfix/* → main`. Después del merge se debe propagar el mismo fix hacia `beta` y `alpha` mediante PR para no perderlo en el siguiente ciclo.
