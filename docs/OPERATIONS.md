# Manual operativo — Open Signage Plus

## 1. Instalación productiva

Requisitos: Linux, Docker Engine, Docker Compose v2, Git y al menos un dominio/TLS recomendado para producción.

```bash
git clone https://github.com/LORDMANUEL/OPEN-SINAGE-PLUS.git
cd OPEN-SINAGE-PLUS
chmod +x install.sh scripts/*.sh
./install.sh --admin-email=admin@empresa.com
```

El instalador genera secretos cuando faltan, crea persistencia, valida Compose, construye imágenes y levanta el stack.

### IA local opcional

```bash
./install.sh --with-ai --ai-model=qwen2.5:1.5b --admin-email=admin@empresa.com
```

En servidores de pocos recursos conviene usar proveedor remoto compatible y dejar Ollama deshabilitado.

## 2. Primer arranque

1. Abrir Xibo en `http://SERVIDOR:8081` desde una red administrativa.
2. Completar wizard Xibo.
3. Crear OAuth `client_credentials`.
4. Guardar `XIBO_CLIENT_ID` y `XIBO_CLIENT_SECRET` en `.env`.
5. Reiniciar backend:

```bash
docker compose --env-file .env -f docker-compose.v2.yml up -d open-signage-api
```

6. Abrir PLUS en `http://SERVIDOR:8080`.
7. Validar `Motor Xibo` y `Planning Center`.

## 3. Operación por módulos

### Studio

Crear escena, seleccionar plantilla/orientación, editar canvas y timeline. Publicar en Browser Player o insertar la URL publicada como Webpage en un playlist Xibo. Para campañas con aprobación, elegir campaña y pulsar **Guardar nueva versión**.

### Pantallas

Para browser player, abrir `/screen` en la TV. Ingresar en Studio el código de seis caracteres mostrado y nombrar la pantalla. La pantalla conserva su identidad, heartbeat y escena asignada.

### Turnos

Definir cola, prefijo y módulo. Se puede emitir, llamar, completar y habilitar TTS local. Los kioscos pueden emitir el turno directamente desde un botón de escena.

### Media

Subir archivos directos o normalizar videos con FFmpeg. El catálogo usa SHA-256 para deduplicar y permite localizar candidatos huérfanos.

### Planning Center

Elegir fecha/hora y grupo de pantallas para previsualizar qué evento ganará. Revisar Proof of Play, interacciones y estado de SMTP/Webhook.

### Empresas y formularios

Crear organización, sucursales y membresías. Los formularios se diseñan desde la PWA y se publican como `/form/<id>` para QR, tablet o kiosco.

## 4. Diagnóstico

```bash
./scripts/doctor.sh
```

Valida Docker/Compose, `.env`, secretos mínimos, espacio de disco, estado de servicios, API, PWA, Xibo, FFmpeg y último backup.

Para otra URL:

```bash
WEB_URL=https://signage.midominio.com XIBO_URL=http://127.0.0.1:8081 ./scripts/doctor.sh
```

## 5. Backup

```bash
./scripts/backup.sh
```

Incluye dump MySQL de Xibo, estado PLUS, librería/custom Xibo y `.env`. Genera `SHA256SUMS` interno y checksum del archivo. El backup contiene secretos: debe almacenarse cifrado o en almacenamiento con acceso restringido.

Verificar sin restaurar:

```bash
./scripts/verify-backup.sh shared/backups/open-signage-plus-YYYYMMDDTHHMMSSZ.tar.gz
```

## 6. Restore

```bash
./scripts/restore.sh shared/backups/open-signage-plus-YYYYMMDDTHHMMSSZ.tar.gz
```

Restore valida checksum, paths del archive, integridad interna, espera MySQL, restaura datos y exige health final de PLUS.

**Recomendación:** restaurar primero en un VPS/VM de prueba antes de reemplazar producción cuando el incidente no sea urgente.

## 7. Actualización

```bash
./scripts/update.sh
```

Requisitos: working tree limpio y remoto `main`. El flujo crea backup, actualiza por fast-forward, ejecuta instalador y valida health. Si instalación o health falla, revierte el código al commit anterior.

## 8. Logs útiles

```bash
docker compose --env-file .env -f docker-compose.v2.yml ps
docker compose --env-file .env -f docker-compose.v2.yml logs --tail=200 open-signage-api
docker compose --env-file .env -f docker-compose.v2.yml logs --tail=200 open-signage-web
docker compose --env-file .env -f docker-compose.v2.yml logs --tail=200 cms-web
docker compose --env-file .env -f docker-compose.v2.yml logs --tail=200 cms-db
```

## 9. Contingencias

### PLUS no abre

Ejecutar `doctor.sh`, comprobar `open-signage-web` y `open-signage-api`, luego revisar logs.

### Xibo no conecta

Validar `XIBO_BASE_URL`, `XIBO_CLIENT_ID`, `XIBO_CLIENT_SECRET`, hora del servidor y conectividad `open-signage-api -> cms-web`.

### Pantalla queda offline

El Browser Player usa last-known-good cache. Revisar heartbeat, conectividad del dispositivo y que el token no haya sido borrado del almacenamiento local.

### Video no reproduce en una TV

Usar **Normalizar y subir** en Media para convertir a H.264/AAC. Confirmar espacio libre con `doctor.sh`.

### Cola no anuncia voz

TTS depende de Web Speech del navegador. Confirmar checkbox, volumen del dispositivo, idioma/voz disponibles y permisos del navegador.

### Backup falla

No ignorar el fallo: `backup.sh` se niega a producir un backup incompleto si MySQL no está corriendo. Corregir `cms-db` antes de actualizar o restaurar.

## 10. Seguridad operativa

- No publicar MySQL, Ollama ni Xibo admin directamente a Internet.
- Exponer la PWA por HTTPS.
- Mantener `.env` en 600/640.
- Guardar backups como secreto.
- Crear usuarios individuales y usar roles; no compartir admin.
- Revisar Auditoría periódicamente.
- Probar SMTP/Webhook desde Planning Center.
- Mantener el firewall limitado a los puertos realmente necesarios.

## 11. Certificación después de cambios

Antes de liberar una versión debe estar verde, sobre el mismo SHA:

- frontend audit/lint/build;
- backend audit/tests;
- deployment syntax/Compose/Nginx/images/FFmpeg/API smoke;
- Playwright E2E.

No se debe marcar una versión como estable con un gate rojo o una prueba omitida sin explicación.
