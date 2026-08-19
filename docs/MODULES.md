# Open Signage Plus — Módulos del sistema

Open Signage Plus se entrega como una plataforma modular. Cada módulo tiene una responsabilidad clara, rutas propias, persistencia definida y pruebas asociadas. Ningún módulo de negocio debe requerir exponer la interfaz nativa de Xibo al usuario final.

## M01 · Núcleo de plataforma

**Responsabilidad:** autenticación, sesiones, RBAC, auditoría, settings y salud base.

- Frontend: `src/context/AppContext.tsx`, `src/views/OperationsView.tsx`.
- Backend: `auth-service.js`, `platform-store.js`, `platform-routes.js`, `health-monitor.js`.
- Persistencia: `/data/open-signage-plus.sqlite`.
- Roles: `admin`, `marketing`, `operator`, `viewer`.
- Gates: tests backend + login/logout E2E + health smoke.

## M02 · Motor Xibo

**Responsabilidad:** actuar como gateway seguro hacia Xibo CMS sin exponer OAuth al navegador.

- Frontend: `IntegrationView.tsx`, `ScreenListView.tsx`.
- Backend: `xibo-integration.js` y rutas `/api/xibo/*`.
- Capacidades: displays, layouts, library, playlists, display groups, publicación y scheduling.
- Secretos: `XIBO_CLIENT_ID` y `XIBO_CLIENT_SECRET` solo en backend.

## M03 · Studio y composición

**Responsabilidad:** crear escenas PLUS sin depender del editor técnico de Xibo.

- Frontend: `StudioView.tsx`, `VisualSceneEditor.tsx`.
- Backend: `scene-store.js`.
- Capacidades: plantillas Retail/Recepción/Menú, drag, posición, tamaño, z-index, undo/redo, 16:9, 9:16, timeline, fade/slide/zoom, publicación browser-first y bridge Webpage a Xibo.
- Persistencia: `/data/player-scenes.json`.

## M04 · Browser Player y flota

**Responsabilidad:** reproducir contenido en TV, PC, tablet o navegador sin APK.

- Frontend: `PlayerScreen.tsx`, `DeviceScreen.tsx`.
- Backend: `device-store.js`, escenas y heartbeat.
- Capacidades: pairing de 6 caracteres, last-known-good offline, precache de media, health heartbeat, resolución/orientación y Proof of Play.
- URLs públicas: `/screen`, `/screen/<device-token>`, `/player/<scene-token>`.

## M05 · Kiosco interactivo

**Responsabilidad:** convertir una escena en flujo táctil controlado.

- Navegación entre escenas mediante acción `scene` con token validado.
- Historial Atrás/Inicio.
- Retorno automático al home por inactividad.
- Botones `openUrl`, `ticket` y navegación interna.
- Sin URLs arbitrarias para navegación interna.

## M06 · Turnos y atención

**Responsabilidad:** emitir, llamar, completar, priorizar y transferir tickets.

- Frontend: `QueueView.tsx`.
- Backend: `queue-store.js` y rutas `/api/queues/*` / `/api/platform/queues/*`.
- Capacidades: prefijo, servicio, cliente, prioridad, escritorio/módulo, métricas de espera/servicio, TTS local del navegador.
- Rate-limit para emisión pública.

## M07 · Media

**Responsabilidad:** biblioteca, deduplicación y normalización de video.

- Frontend: `MediaView.tsx`.
- Backend: `media-catalog.js`, `media-routes.js`, `media-transcoder.js`.
- Capacidades: SHA-256, deduplicación, catálogo, búsqueda, tags, candidatos huérfanos y transcoding FFmpeg H.264/AAC 1080p/720p.
- Gate de deployment: FFmpeg debe existir dentro de la imagen productiva.

## M08 · IA

**Responsabilidad:** asistir creación sin publicar automáticamente.

- Frontend: `AiStudioView.tsx`.
- Backend: `ai-service.js`, `ai-routes.js`.
- Proveedores: Ollama local o API compatible.
- Flujo obligatorio: prompt → JSON → normalización → preview → aprobación explícita → publicación.
- Incluye health/diagnostics y fallback configurable.

## M09 · Empresas, sucursales y membresías

**Responsabilidad:** estructura multiempresa/multisucursal y contexto de usuario.

- Frontend: `BusinessAdminView.tsx`.
- Backend: `organization-store.js`, `organization-routes.js`.
- Entidades: organización, location/sucursal y membership.
- Acceso de administración protegido por RBAC.

## M10 · Formularios

**Responsabilidad:** formularios para kiosco, QR, tablet o captura pública.

- Frontend: diseñador en `BusinessAdminView.tsx` y runtime `FormScreen.tsx`.
- Backend: forms y form responses en plataforma.
- URL pública: `/form/<id>`.
- Respuestas públicas con rate-limit y tamaño limitado.

## M11 · Planning Center

**Responsabilidad:** programación, conflictos y observabilidad de campañas.

- Frontend: `PlanningAnalyticsView.tsx`.
- Backend: `schedule-planner.js`, `schedule-routes.js`, `analytics-store.js`.
- Capacidades: preview por fecha/hora y display group, evento ganador, conflictos, agenda Xibo, Proof of Play, interacciones y canales de alerta.

## M12 · Operaciones y alertas

**Responsabilidad:** salud de plataforma y operación diaria.

- Frontend: `OperationsView.tsx` y pestaña Alertas de Planning Center.
- Backend: health monitor y notification service.
- Canales: SMTP y webhook HTTPS.
- Métricas: flota online/offline, errores player, Xibo, IA, memoria, disco y uptime.

## M13 · Instalación, backup, restore y upgrade

**Responsabilidad:** ciclo de vida del servidor.

- `install.sh`: instalación/migración idempotente.
- `scripts/backup.sh`: Xibo DB + librería + estado PLUS + checksums.
- `scripts/restore.sh`: valida checksums y restaura stack.
- `scripts/update.sh`: backup previo, fast-forward de main, install y rollback si falla health.
- `scripts/doctor.sh`: diagnóstico de Docker, Compose, secretos, disco, servicios, API, PWA, Xibo, FFmpeg y backup.

## M14 · Seguridad

**Responsabilidad:** límites y controles transversales.

- Sesiones firmadas y expirables.
- RBAC en backend, no solo UI.
- Credenciales Xibo/IA solo server-side.
- Rate limiting en auth, tickets, telemetría y formularios públicos.
- CSP/headers de Nginx.
- `iframe sandbox` para HTML.
- URLs remotas restringidas a HTTP(S).
- Auditoría de mutaciones administrativas.
- Uploads con límites y timeouts.

## M15 · CI y certificación

El sistema no se considera liberable hasta que la misma cabeza de commit pase:

1. `frontend`: audit de dependencias productivas, lint y build TypeScript/Vite.
2. `backend`: audit y suite Node.
3. `deployment`: shell syntax, Compose config, Nginx, build backend, FFmpeg runtime, smoke API y build web.
4. `e2e`: Playwright Chromium para login, Xibo, Studio, AI, turnos, player, kiosco, pairing, inventario real, TTS, planning y bridge Xibo.

## Dependencias entre módulos

```text
M01 Núcleo
 ├─ M02 Xibo
 ├─ M03 Studio ── M04 Player ── M05 Kiosco
 │                         └──── M06 Turnos
 ├─ M07 Media
 ├─ M08 IA ────── M03 Studio
 ├─ M09 Empresas ─ M10 Formularios
 ├─ M11 Planning ─ M02 Xibo
 ├─ M12 Operaciones
 └─ M13 Lifecycle

M14 Seguridad y M15 CI son transversales a todos.
```

## Regla de desarrollo

Una función nueva debe pertenecer a un módulo, definir su contrato API si lo necesita, tener persistencia explícita, no saltarse RBAC y agregar una prueba del nivel adecuado. Esto evita volver a crear un monolito difícil de operar.
