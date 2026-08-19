# Rotación de secretos — Open Signage Plus

Este procedimiento evita cambiar secretos de forma que deje servicios desincronizados. Nunca publicar valores reales en commits, issues, PRs o logs.

## Principios

1. Crear un backup verificable antes de rotar credenciales críticas.
2. Rotar primero en el sistema que **emite** la credencial (Xibo/proveedor IA/SMTP) y después actualizar Open Signage Plus.
3. Usar `scripts/setup-wizard.sh` o el panel administrativo; evitar comandos con secretos visibles en historial de shell.
4. Reiniciar solo los servicios que consumen el secreto.
5. Ejecutar `scripts/doctor.sh` y una prueba funcional después de cada rotación.

## SESSION_SECRET

`SESSION_SECRET` firma sesiones administrativas. Rotarlo invalida todas las sesiones existentes.

```bash
./scripts/backup.sh
NEW_SESSION_SECRET="$(openssl rand -hex 32)"
node scripts/env-set.mjs .env SESSION_SECRET "$NEW_SESSION_SECRET"
unset NEW_SESSION_SECRET
docker compose --env-file .env -f docker-compose.v2.yml up -d --force-recreate open-signage-api
```

Después: iniciar sesión nuevamente y ejecutar `./scripts/doctor.sh`.

## Contraseña de administrador/usuarios

Una instalación inicial usa `ADMIN_PASSWORD` para bootstrap; después, la fuente real de contraseñas es `open-signage-plus.sqlite`. **Cambiar solo `ADMIN_PASSWORD` en `.env` no cambia una cuenta ya creada.**

Rotar desde Administración → Usuarios → restablecer contraseña. Esto usa el endpoint RBAC `user:manage` y `scrypt` en backend. Si se perdió todo acceso administrativo, restaurar desde un backup conocido o realizar recuperación controlada offline; no crear una ruta pública de bypass.

## Xibo OAuth

1. Crear/rotar el client secret desde la interfaz administrativa de Xibo.
2. Ejecutar `setup-wizard.sh` y proporcionar Client ID/secret; preferir `XIBO_CLIENT_SECRET_INPUT` para no dejar el valor en historial.
3. Recrear el API:

```bash
docker compose --env-file .env -f docker-compose.v2.yml up -d --force-recreate open-signage-api
```

4. Verificar **Motor Xibo → Verificar conexión**.
5. Revocar el secreto anterior en Xibo después de comprobar el nuevo.

## API de IA

1. Crear una clave nueva en el proveedor.
2. Ejecutar wizard usando `AI_API_KEY_INPUT` o editar desde un canal seguro.
3. Recrear `open-signage-api`.
4. Probar AI Studio/diagnostics.
5. Revocar la clave anterior.

Para Ollama local no existe API key por defecto; mantener Ollama sin publicación directa a Internet.

## SMTP

1. Crear una contraseña/token de aplicación nuevo en el servidor de correo.
2. Configurar con `SMTP_PASSWORD_INPUT` mediante wizard.
3. Recrear API.
4. Ejecutar la notificación de prueba en Planning/Operaciones.
5. Revocar el secreto anterior.

## Webhook de alertas

Crear URL/token nuevo en el receptor, actualizar `ALERT_WEBHOOK_URL`, recrear API y ejecutar una notificación de prueba antes de revocar el webhook anterior.

## MYSQL_PASSWORD

No rotar `MYSQL_PASSWORD` modificando solamente `.env`: MySQL y el CMS deben cambiar la contraseña de la cuenta `cms` coordinadamente. Hacerlo en ventana de mantenimiento, con backup verificado, actualizar la credencial en MySQL y luego `.env`, recrear `cms-web`/`open-signage-api` según corresponda y ejecutar `doctor.sh`.

## Después de cualquier sospecha de exposición

- Rotar todos los secretos potencialmente afectados, no solo el que apareció en pantalla.
- Revisar Auditoría y logs.
- Ejecutar Gitleaks/CodeQL/Trivy mediante `Open Signage Plus Security`.
- Si un secreto llegó al historial Git, **rotarlo primero**; borrar el texto del último commit no revoca una credencial ya expuesta.
- Documentar el incidente sin copiar valores secretos.
