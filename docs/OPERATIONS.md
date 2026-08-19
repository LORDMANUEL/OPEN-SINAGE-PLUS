# Manual operativo — Open Signage Plus

## 1. Instalación productiva

Requisitos: Linux, Docker Engine, Docker Compose v2, Git y un dominio con DNS hacia el servidor para producción HTTPS.

```bash
git clone https://github.com/LORDMANUEL/OPEN-SINAGE-PLUS.git
cd OPEN-SINAGE-PLUS
chmod +x install.sh scripts/*.sh
./install.sh --admin-email=admin@empresa.com
./scripts/setup-wizard.sh
```

`install.sh` crea secretos, persistencia y stack base. `setup-wizard.sh` completa la configuración productiva sin editar `.env` manualmente: dominio/TLS, correo administrativo, OAuth Xibo, IA y SMTP/alertas. Los secretos se solicitan de forma oculta en modo interactivo; para automatización es preferible usar variables de entorno en vez de argumentos de shell.

### HTTPS

Con dominio configurado el wizard activa el compose TLS con Caddy y establece `WEB_BIND=127.0.0.1` para que el puerto HTTP interno no quede expuesto directamente.

Modo LAN sin TLS:

```bash
./scripts/setup-wizard.sh --no-tls
```

### IA local opcional

En el wizard seleccionar `ollama`, o ejecutar una instalación base con:

```bash
./install.sh --with-ai --ai-model=qwen2.5:1.5b --admin-email=admin@empresa.com
```

En servidores pequeños conviene un proveedor remoto compatible.

## 2. Xibo / primer arranque

1. Acceder a Xibo por `127.0.0.1:8081` mediante consola, VPN o túnel administrativo; no exponer ese puerto a Internet.
2. Completar el wizard nativo Xibo.
3. Crear OAuth `client_credentials`.
4. Ejecutar otra vez `setup-wizard.sh` e introducir Client ID/secret.
5. En PLUS: **Motor Xibo → Verificar conexión**.
6. Abrir `/screen` en la primera pantalla y realizar pairing.

El wizard no inventa ni extrae credenciales OAuth: deja ese único paso explícitamente pendiente si Xibo todavía no fue inicializado.

## 3. Operación por módulos

### Studio / HTML Studio

Crear escena, plantilla/orientación, canvas y timeline. Publicar en Browser Player o utilizar el bridge hacia un playlist Xibo. HTML se ejecuta en iframe sandbox sin privilegios de script.

### Pantallas

Abrir `/screen`, introducir en Studio el código corto y nombrar el dispositivo. Heartbeat, escena actual, errores y Proof of Play se reportan al backend.

### Turnos

Emisión, prioridad, servicio, llamada, transferencia, completado y TTS local. Los endpoints públicos están rate-limited.

### Media

Subida/deduplicación SHA-256 y normalización FFmpeg H.264/AAC. Revisar candidatos huérfanos antes de limpieza.

### Planning / Analytics

Preview de scheduling, conflictos, Proof of Play e interacciones. La telemetría pública se valida contra escenas/dispositivos reales antes de entrar a analytics.

### Empresas / sucursales

Las organizaciones son frontera de autorización. Listados de empresa/sucursal de usuarios no-admin se limitan a memberships.

Los recursos que todavía son globales de despliegue (Xibo/media/scenes/analytics/colas) aplican una política **fail-closed**: con más de una organización activa, un usuario no-admin no puede usarlos hasta que ese recurso tenga scope de organización explícito. Admin conserva operación global. Esto evita afirmar aislamiento multiempresa donde el modelo de datos todavía no lo puede demostrar.

### Formularios y privacidad

Cada formulario nuevo tiene política explícita:

- `consentRequired`: opcional;
- `consentText`: texto visible al usuario;
- `retentionDays`: 1–3650, por defecto 365 días.

Si el consentimiento es obligatorio, el runtime no envía sin aceptación y el backend vuelve a validarlo. La bandera de consentimiento es metadata de control y no se almacena como respuesta de negocio. El backend purga respuestas vencidas periódicamente; desde Administración también existe **Purgar vencidas** con auditoría.

## 4. Diagnóstico y alertas P0

```bash
./scripts/doctor.sh
```

Valida Docker/Compose, `.env`, secretos mínimos, servicios, API/PWA/Xibo, FFmpeg, disco, backup y TLS. Los umbrales se comparten con el monitor del backend:

```env
DISK_FREE_WARN_PERCENT=10
BACKUP_MAX_AGE_HOURS=30
TLS_EXPIRY_WARN_DAYS=21
```

El backend alerta mediante SMTP/Webhook cuando detecta:

- pantallas offline/errores;
- Xibo inaccesible;
- disco por debajo del umbral;
- backup ausente, vencido, sin checksum o con checksum inválido;
- certificado TLS próximo a vencer o inválido.

## 5. Backup programado

Backup manual:

```bash
./scripts/backup.sh
```

Instalar timer diario persistente de systemd:

```bash
sudo ./scripts/install-backup-timer.sh
systemctl status open-signage-plus-backup.timer
systemctl list-timers open-signage-plus-backup.timer
```

El timer usa `UMask=0077`, ejecución diaria con jitter y `Persistent=true`.

El backup incluye dump MySQL Xibo, estado PLUS, librería/custom Xibo y `.env`, con manifiesto interno y SHA-256 lateral. Contiene secretos: guardarlo cifrado o bajo ACL restringida.

Verificación:

```bash
./scripts/verify-backup.sh shared/backups/open-signage-plus-YYYYMMDDTHHMMSSZ.tar.gz
```

## 6. Restore

```bash
./scripts/restore.sh shared/backups/open-signage-plus-YYYYMMDDTHHMMSSZ.tar.gz
```

Antes de extraer valida sidecar SHA-256, paths del archivo e integridad interna; restaura MySQL/PLUS/Xibo y exige health final. Nunca restaurar un archivo cuyo checksum falle.

CI ejecuta un self-test destructivo controlado: **backup → verify → borrar/mutar datos → restore → validar datos + SQL + health**.

## 7. Actualización y rollback

```bash
./scripts/update.sh
```

Requiere working tree limpio. Crea backup, hace fast-forward del branch configurado, instala y valida health. Si install/health falla, hace rollback al SHA previo manteniendo la rama adjunta (no deja HEAD detached).

CI prueba tanto upgrade correcto como update defectuoso + rollback.

## 8. Logs útiles

```bash
docker compose --env-file .env -f docker-compose.v2.yml ps
docker compose --env-file .env -f docker-compose.v2.yml logs --tail=200 open-signage-api
docker compose --env-file .env -f docker-compose.v2.yml logs --tail=200 open-signage-web
docker compose --env-file .env -f docker-compose.v2.yml logs --tail=200 cms-web
docker compose --env-file .env -f docker-compose.v2.yml logs --tail=200 cms-db
```

## 9. Seguridad operativa

- No publicar MySQL, Ollama ni Xibo Admin a Internet.
- Publicar PLUS mediante HTTPS.
- `.env` debe permanecer 600/640.
- Backups se consideran secretos.
- Usar usuarios individuales y RBAC.
- En multiempresa, no eliminar el guard global para “hacer funcionar” un rol: primero añadir scope real al recurso.
- Revisar Auditoría y alertas.
- Rotar secretos después de personal externo, sospecha de exposición o cambio de administrador.
- Consultar `SECURITY.md` y `docs/THREAT-MODEL.md` antes de modificar auth/RBAC/public endpoints/lifecycle.

## 10. CI y seguridad por canal

Alpha exige sobre el SHA exacto:

- `release-policy`
- `lifecycle`
- `frontend`
- `backend`
- `e2e`
- `security-codeql`
- `security-secrets`
- `security-fs`

Beta/Stable añade:

- `deployment`
- `security-images`

Security CI incluye CodeQL, Gitleaks, Trivy filesystem y Trivy de imágenes productivas. Un check rojo bloquea promoción por diseño.

## 11. Contingencias rápidas

- **PLUS no abre:** `doctor.sh` → API/web logs.
- **Xibo no conecta:** OAuth, hora, red API→cms-web.
- **Pantalla offline:** heartbeat/red/local storage; last-known-good sigue siendo fallback.
- **Video incompatible:** Media → Normalizar y subir.
- **Backup crítico:** corregir `cms-db`, crear backup nuevo y verificarlo antes de actualizar.
- **TLS próximo a vencer:** revisar DNS/Caddy y logs del proxy; no deshabilitar validación para silenciar alerta.
- **TENANT_SCOPE_REQUIRED:** no es error accidental; indica que un recurso global no tiene scope suficiente para operar de forma segura en multiempresa.

## 12. Definition of Done operativo

No se promueve una versión si existe un test obligatorio pendiente, un scanner rojo o un PR de release sin resolver. Para Stable también se exige instalación/upgrade/restore y certificación física definida en `MASTER.md`.
