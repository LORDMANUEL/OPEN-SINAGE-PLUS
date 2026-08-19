# MASTER — Open Signage Plus

> Fuente maestra de estado, deuda y orden de trabajo. Marcar `[x]` únicamente con evidencia de código/prueba/operación.

**Estable actual:** `2.0.0`  
**Rama estable:** `main`  
**Canales:** `alpha → beta → main`  
**Siguiente ciclo:** `2.1.0`  
**Motor:** Xibo 4.5  
**UX:** Open Signage Plus PWA/API/Browser Player

## 1. Reglas innegociables

1. `main` contiene solo releases estables certificadas.
2. Flujo normal: `feature/* → alpha → beta → main`.
3. 5 alphas verdes habilitan 1 beta; 3 betas verdes habilitan stable.
4. Los contadores nunca sustituyen CI/security gates.
5. Backend RBAC y tenant scope son autoridad; la UI no es control de seguridad.
6. Secretos Xibo/IA/SMTP/sesión no llegan al navegador.
7. Toda persistencia requiere backup, restore, migración y política de retención cuando aplica.
8. Browser-first es prioridad; wrappers nativos son opcionales.
9. Xibo es motor; la experiencia operativa pertenece a Open Signage Plus.
10. En multiempresa, un recurso sin tenant scope explícito debe fallar cerrado para usuarios no-admin.

## 2. Release engineering — Fase A

### Implementado

- [x] `alpha`, `beta`, `main` permanentes.
- [x] SemVer y `release.config.json`.
- [x] secuencia estricta de tags Alpha/Beta.
- [x] workflow 5 Alpha → Beta y 3 Beta → Stable.
- [x] CI diferenciado por canal.
- [x] tag/release inicial `v2.0.0`.
- [x] `package-lock.json` sincronizado.
- [x] `.vite` y artefactos históricos ajenos retirados.
- [x] README/RELEASES/documentación de canales.

### Pendiente administrativo externo

- [ ] **P0 GitHub:** activar Rulesets/Branch Protection reales en `alpha`, `beta` y `main`. Issue #11 contiene los checks exactos. El repositorio confirmó previamente `protected=false`; documentarlo no equivale a habilitarlo.

## 3. Estado por módulos

### M01 Núcleo — FUNCIONAL

- [x] auth/sesiones firmadas.
- [x] RBAC `admin`, `marketing`, `operator`, `viewer`.
- [x] usuarios, reset de contraseña por admin, auditoría, settings y health.
- [ ] P1 2FA/passkeys.
- [ ] P2 SSO/OIDC/SAML/LDAP.

### M02 Motor Xibo — FUNCIONAL

- [x] OAuth server-side.
- [x] displays/layouts/playlists/grupos/media.
- [x] publish/scheduling y bridge PLUS→Xibo.
- [x] wizard productivo acepta OAuth sin editar `.env` manualmente; si Xibo no está inicializado deja el paso explícitamente pendiente.
- [ ] P1 ampliar datasets/widgets/overlays cuando aporte valor.

### M03 Studio / HTML Studio — FUNCIONAL

- [x] canvas/plantillas/drag/capas/undo-redo.
- [x] 16:9 y 9:16.
- [x] timeline y animaciones.
- [x] HTML sandboxed.
- [ ] P1 resize handles, snap/grid, multi-select y timeline visual.

### M04 Browser Player / flota — FUNCIONAL EN CI, CERTIFICACIÓN FÍSICA PENDIENTE

- [x] `/screen`, `/player/<token>`, pairing.
- [x] heartbeat, last-known-good, precache y Proof of Play.
- [x] Proof of Play/interaction valida escenas/dispositivos reales antes de analytics.
- [ ] **P0 hardware:** Chrome/Edge PC real.
- [ ] **P0 hardware:** Raspberry Pi/Chromium.
- [ ] **P0 hardware:** Android/Google TV.
- [ ] **P0 hardware:** Samsung Tizen.
- [ ] **P0 hardware:** LG webOS.
- [ ] **P0 hardware:** tablet/panel táctil.
- [ ] matriz documentada de compatibilidad/autostart/watchdog.

### M05 Kiosco — FUNCIONAL

- [x] navegación segura, Inicio/Atrás, timeout, URL/ticket/scene.
- [ ] P1 teclado virtual/accesibilidad avanzada/perfiles kiosk por SO.

### M06 Turnos — FUNCIONAL

- [x] emisión/prioridad/servicio/llamada/transferencia/completado.
- [x] métricas y TTS local.
- [ ] P1 configurador visual, SLA/abandono/pausa e históricos.

### M07 Media — FUNCIONAL

- [x] catálogo/búsqueda/SHA-256/deduplicación/huérfanos.
- [x] FFmpeg H.264/AAC.
- [ ] P1 thumbnails/posters/limpieza segura.
- [ ] P2 S3/MinIO/CDN.

### M08 IA — FUNCIONAL BASE

- [x] Ollama/API compatible, health/fallback, generar/revisar y aprobación humana.
- [ ] P1 cuotas/costo por tenant, imagen generativa, traducción y Brand Kit obligatorio.

### M09 Empresas/sucursales — AISLAMIENTO ENDURECIDO

- [x] organizaciones/sucursales/memberships.
- [x] listados membership-scoped para no-admin.
- [x] pruebas negativas cross-tenant.
- [x] guard global fail-closed: con >1 organización, un no-admin no usa recursos deployment-global hasta que tengan scope explícito.
- [ ] P1 añadir `organization_id/location_id` a media/scenes/queues/analytics/Xibo mappings para uso multiempresa granular sin restricción global.

### M10 Formularios — PRIVACIDAD P0 IMPLEMENTADA

- [x] diseñador/runtime y rate limit.
- [x] consentimiento configurable y doble validación UI/backend.
- [x] `__consent` no se almacena como dato de negocio.
- [x] `retentionDays` configurable y purga periódica/auditable.
- [ ] P1 CSV/Excel, webhooks y lógica condicional.

### M11 Planning/Analytics — FUNCIONAL BASE

- [x] preview/conflictos/ganador/Proof of Play/interacciones.
- [x] validación de contexto de telemetría pública.
- [ ] P1 calendario drag/drop/dashboard ejecutivo/retención agregada.

### M12 Operaciones/alertas — P0 ENDURECIDO

- [x] fleet/system health, SMTP/webhook, cooldown.
- [x] alerta disco bajo.
- [x] alerta backup ausente/vencido/checksum faltante o inválido.
- [x] alerta TLS próximo a vencer/inválido.
- [x] `doctor.sh` usa los mismos umbrales.
- [ ] P1 historial/ack de incidentes y Slack/Telegram opcional.

### M13 Lifecycle — P0 ENDURECIDO

- [x] install/wizard/doctor.
- [x] backup con dump MySQL + PLUS/Xibo + SHA-256.
- [x] restore path-safe + checksum + health.
- [x] CI self-test backup→mutación destructiva→restore→health.
- [x] update fast-forward + health + rollback sin HEAD detached.
- [x] CI self-test update correcto y update defectuoso/rollback.
- [x] timer diario systemd instalable con UMask 0077/Persistent.
- [ ] validación de disaster restore en VPS/VM real antes de Stable comercial.

### M14 Seguridad — P0 DE CÓDIGO IMPLEMENTADO

- [x] SECURITY.md y threat model.
- [x] RBAC backend, CORS deny-by-default, trust proxy, rate limit, CSP, sandbox y secretos server-side.
- [x] CodeQL SAST.
- [x] Gitleaks secret scan/historial.
- [x] Trivy filesystem/misconfig/secret.
- [x] Trivy imágenes productivas para Beta/Stable.
- [x] seguridad integrada al workflow de promoción.
- [x] aislamiento cross-tenant de organizaciones y fail-closed de recursos globales.
- [ ] P0 administrativo: Branch Protection/Rulesets efectivos (Issue #11).
- [ ] P1 2FA/passkeys.

### M15 CI — ENDURECIDO

Alpha requiere:

- `release-policy`
- `lifecycle`
- `frontend`
- `backend`
- `e2e`
- `security-codeql`
- `security-secrets`
- `security-fs`

Beta/Stable añade `deployment` y `security-images`.

- [x] promotion workflow verifica checks del SHA exacto.
- [x] wizard/lifecycle self-tests.
- [x] npm audits/lint/build/backend tests/E2E.
- [x] Docker/Compose/Nginx/FFmpeg/API smoke.
- [ ] P1 load/performance programado.

## 4. P0 restantes antes de declarar Production Ready comercial

1. [ ] Activar/validar Branch Protection/Rulesets en GitHub (Issue #11).
2. [ ] Completar matriz física Browser Player (PC/RPi/Android TV/Tizen/webOS/tablet).
3. [ ] Ejecutar disaster restore en una VPS/VM limpia real.
4. [ ] Ejecutar instalación productiva real con dominio/DNS/Caddy y verificar renovación TLS.
5. [ ] Validar OAuth con una instancia Xibo real desplegada, no solo mocks/CI.

Estos P0 requieren administración externa o hardware/infraestructura real. No deben marcarse `[x]` únicamente con pruebas unitarias.

## 5. P1 — siguiente ciclo funcional

- Studio avanzado: resize/snap/multi-select/alineación/timeline visual.
- plantillas por industria + Brand Kit transversal.
- scheduler calendario drag/drop.
- Campaign Manager más visual.
- thumbnails/posters y limpieza segura de media.
- QR editable + analytics.
- Turnos SLA/configurador/reportes.
- Formularios export/webhooks/condicionales.
- Widgets controlados (reloj/clima/RSS/JSON/KPI/tabla/gráfica).
- IA imágenes/traducción/variantes responsive/cuotas.
- dashboard ejecutivo e historial de incidentes.
- scope tenant explícito de recursos globales.

## 6. P2 — escala / enterprise

- PostgreSQL/Redis HA y migración de persistencias locales cuando haya multi-réplica.
- S3/MinIO/CDN.
- réplicas API detrás de proxy.
- SSO/OIDC/SAML/LDAP.
- HA Xibo/MySQL.
- player empaquetado opcional Android/Tauri/Electron.
- videowall/sincronización.
- marketplace/SDK widgets.
- MQTT + conectores ERP/CRM/BI.
- planes/cuotas/billing SaaS.
- i18n/WCAG avanzada.

## 7. Definition of Done de producción

Una versión es **Production Ready** únicamente cuando:

- [ ] instalación limpia real finaliza con wizard y HTTPS;
- [ ] Xibo OAuth real conectado;
- [ ] Xibo Player + Browser Player reproducen contenido;
- [ ] offline last-known-good probado en dispositivo;
- [ ] backup/restore y upgrade/rollback probados también fuera de CI;
- [ ] matriz física mínima completada;
- [ ] branch rulesets activos;
- [ ] todos los CI/security gates verdes sobre el mismo SHA;
- [ ] `doctor.sh` sin fallos críticos;
- [ ] manuales actualizados;
- [ ] tag SemVer/release notes;
- [ ] cero PRs de trabajo pendientes para ese release;
- [ ] cero P0 abiertos.

---

Última regla: evidencia antes de estado. Un check omitido, un scanner rojo, un PR abierto o una prueba hardware no ejecutada no se presenta como completado.
