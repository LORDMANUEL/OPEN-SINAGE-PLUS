# MASTER — Open Signage Plus

> Fuente maestra de estado, deuda y orden de trabajo para llevar Open Signage Plus de la V2 funcional a producción certificada. Este archivo se actualiza al cerrar cada bloque; `[x]` requiere evidencia.

**Estable actual:** `2.0.0`  
**Rama estable:** `main`  
**Canales permanentes:** `alpha` → `beta` → `main`  
**Siguiente ciclo:** `2.1.0`  
**Motor:** Xibo 4.5  
**UX:** Open Signage Plus PWA/API/Browser Player

## 1. Reglas innegociables

1. `main` recibe únicamente versiones estables certificadas.
2. Desarrollo normal: `feature/* → alpha → beta → main`.
3. Cinco alphas verdes habilitan una beta; tres betas verdes habilitan una estable.
4. El contador no sustituye CI: un tag con gates rojos no se promueve.
5. Cada cambio pertenece a un módulo de `docs/MODULES.md`.
6. RBAC backend es autoridad; ocultar un botón en UI no es seguridad.
7. Secretos Xibo/IA/SMTP nunca llegan al navegador.
8. Toda persistencia necesita backup, restore y migración.
9. Browser-first es prioridad; wrappers nativos son opcionales.
10. Xibo es motor; la experiencia de usuario pertenece a Open Signage Plus.

## 2. Release engineering — Fase A

```text
feature/*
   ↓
 alpha
   ├─ vX.Y.Z-alpha.1
   ├─ vX.Y.Z-alpha.2
   ├─ vX.Y.Z-alpha.3
   ├─ vX.Y.Z-alpha.4
   └─ vX.Y.Z-alpha.5
             ↓
            beta
             ├─ vX.Y.Z-beta.1
             ├─ vX.Y.Z-beta.2
             └─ vX.Y.Z-beta.3
                        ↓
                 release/vX.Y.Z
                        ↓
                       main
                        ↓
                      vX.Y.Z
```

### Implementado

- [x] Ramas permanentes `alpha` y `beta` creadas desde la estable.
- [x] Configuración versionada en `release.config.json` (`stableVersion`, `nextVersion`, 5 alphas, 3 betas).
- [x] Motor Node para parsear tags, calcular siguiente prerelease y validar promociones.
- [x] Secuencia estricta: no se permite saltar `alpha.N` o `beta.N`.
- [x] CLI de release basado en tags Git; no usa contadores manuales.
- [x] CI redefinido para `alpha`, `beta` y `main`; se retiraron triggers de ramas feature históricas.
- [x] Alpha exige policy tests + frontend + backend + E2E.
- [x] Beta/Stable exigen además deployment completo.
- [x] Workflow `Cut / Promote Release Channel` valida los checks del SHA antes de taggear.
- [x] `alpha.5` abre candidato `alpha → beta`.
- [x] `beta.3` prepara `release/vX.Y.Z`, sincroniza package/lock/config y abre PR a `main`.
- [x] Stable crea tag SemVer y GitHub Release.
- [x] Workflow de bootstrap para formalizar la estable inicial `v2.0.0` al aterrizar esta infraestructura en `main`.
- [x] `package-lock.json` sincronizado con `open-signage-plus` `2.0.0` sin alterar el grafo de dependencias.
- [x] `.vite/` retirado del árbol Git; permanece ignorado.
- [x] Retirados del release tree dos PDFs ajenos al producto y el prototipo monolítico original; siguen recuperables desde historial Git.
- [x] Guía operativa en `docs/RELEASES.md`.
- [x] Pruebas locales de release policy/CLI/config/lock: 14 casos verdes antes de subir.

### Pendiente de configuración del repositorio

- [ ] **P0:** habilitar branch protection/rulesets de GitHub para `main`, `beta` y `alpha` (sin force-push y con required checks). Esta operación es configuración administrativa del repositorio, no código.
- [ ] Confirmar ejecución del bootstrap `v2.0.0` después del merge de Fase A.

### Hotfix

`main → hotfix/* → main`. Después del merge, propagar el mismo arreglo hacia `beta` y `alpha` mediante PR.

## 3. Estado por módulos

### M01 Núcleo — FUNCIONAL

- [x] Login/sesiones firmadas.
- [x] RBAC `admin`, `marketing`, `operator`, `viewer`.
- [x] Usuarios, auditoría, settings y health.
- [ ] P0 recuperación/cambio de contraseña administrado desde UI.
- [ ] P1 2FA/passkeys.
- [ ] P2 SSO/OIDC/SAML/LDAP.

### M02 Motor Xibo — FUNCIONAL

- [x] OAuth server-side.
- [x] Displays, layouts, playlists, display groups y media.
- [x] Publish/scheduling.
- [x] Bridge PLUS → Xibo Webpage.
- [ ] P0 wizard Xibo/OAuth sin edición manual de `.env`.
- [ ] P1 ampliar widgets/datasets/overlays cuando aporte valor.

### M03 Studio — FUNCIONAL

- [x] Canvas, plantillas, drag, capas, undo/redo.
- [x] 16:9 / 9:16.
- [x] Timeline y fade/slide/zoom.
- [x] HTML Studio con iframe sandbox.
- [ ] P1 resize handles + snap/grid.
- [ ] P1 multi-select, alineación y distribución.
- [ ] P1 copiar/pegar entre escenas.
- [ ] P1 timeline visual tipo pista.
- [ ] P1 más plantillas y Brand Kit transversal.

### M04 Browser Player / flota — FUNCIONAL, FALTA CERTIFICACIÓN FÍSICA

- [x] `/screen`, `/player/<token>`, pairing.
- [x] Heartbeat y metadata.
- [x] Last-known-good y precache.
- [x] Proof of Play.
- [ ] P0 Chrome/Edge PC real.
- [ ] P0 Raspberry Pi/Chromium.
- [ ] P0 Android/Google TV browser.
- [ ] P0 Samsung Tizen browser.
- [ ] P0 LG webOS browser.
- [ ] P0 tablet/panel táctil.
- [ ] P0 matriz documentada de capacidades/limitaciones/autostart/watchdog.
- [ ] P1 screenshot remoto donde el hardware lo permita.
- [ ] P1 política LRU/cuotas de cache.

### M05 Kiosco — FUNCIONAL

- [x] Navegación interna segura.
- [x] Inicio/Atrás.
- [x] Timeout por inactividad.
- [x] Acciones URL/ticket/scene.
- [ ] P1 teclado virtual.
- [ ] P1 accesibilidad táctil avanzada.
- [ ] P1 perfiles kiosk/autostart por SO.

### M06 Turnos — FUNCIONAL

- [x] Emisión, prioridad, servicio, llamada, transferencia y completado.
- [x] Métricas de espera/servicio.
- [x] TTS local.
- [ ] P1 configurador visual de colas/servicios/módulos.
- [ ] P1 SLA/abandono/pausa.
- [ ] P1 históricos/reportes y voz por dispositivo.

### M07 Media — FUNCIONAL

- [x] Catálogo y búsqueda.
- [x] SHA-256/deduplicación.
- [x] candidatos huérfanos.
- [x] FFmpeg H.264/AAC.
- [ ] P0 cuotas por tenant/sucursal.
- [ ] P1 thumbnails/posters automáticos.
- [ ] P1 limpieza segura con preview/rollback.
- [ ] P2 S3/MinIO/CDN.

### M08 IA — FUNCIONAL

- [x] Ollama/API compatible.
- [x] Health/diagnostics/fallback.
- [x] Generar/revisar escena.
- [x] Aprobación humana antes de publicar.
- [ ] P0 límites de costo/tokens y rate por usuario/tenant.
- [ ] P1 imagen generativa desacoplada.
- [ ] P1 Brand Kit obligatorio para contenido comercial.
- [ ] P1 traducción y variantes responsive automáticas.

### M09 Empresas/sucursales — BASE FUNCIONAL

- [x] Organizaciones, sucursales y memberships.
- [ ] P0 auditoría endpoint por endpoint del aislamiento tenant.
- [ ] P0 pruebas negativas cross-tenant.
- [ ] P1 cuotas/límites por organización.

### M10 Formularios — BASE FUNCIONAL

- [x] Diseñador/runtime público.
- [x] Rate limit.
- [ ] P0 consentimiento y retención configurables.
- [ ] P1 CSV/Excel, webhooks y campos condicionales.

### M11 Planning/Analytics — BASE FUNCIONAL

- [x] Preview por fecha/grupo.
- [x] conflictos/evento ganador.
- [x] Proof of Play/interacciones.
- [ ] P1 calendario drag/drop.
- [ ] P1 dashboard ejecutivo por sucursal/campaña.
- [ ] P1 agregación/retención histórica.

### M12 Operaciones/alertas — BASE FUNCIONAL

- [x] Fleet/system health.
- [x] SMTP/webhook.
- [x] cooldown.
- [ ] P0 alertas de backup fallido, disco bajo y TLS.
- [ ] P1 historial/ack de incidentes.
- [ ] P1 Slack/Telegram opcional.

### M13 Lifecycle — BASE FUNCIONAL

- [x] `install.sh`.
- [x] `doctor.sh`.
- [x] backup + checksum.
- [x] restore endurecido.
- [x] update + rollback de código.
- [ ] P0 test automatizado backup → restore.
- [ ] P0 test upgrade desde última estable.
- [ ] P0 backup programado/retención instalable.
- [ ] P0 disaster restore en VPS/VM limpia.

### M14 Seguridad — BUENA BASE, NO CERRADA

- [x] RBAC backend.
- [x] CORS deny-by-default.
- [x] trust proxy restringido.
- [x] rate limits.
- [x] CSP/headers.
- [x] HTML sandboxed.
- [x] secretos server-side.
- [ ] P0 branch protection/rulesets.
- [ ] P0 secret scanning + revisión de historial.
- [ ] P0 SAST.
- [ ] P0 container image scanning.
- [ ] P0 procedimiento de rotación de secretos.
- [ ] P0 threat model + `SECURITY.md`.
- [ ] P1 2FA/passkeys.

### M15 CI — CANALES IMPLEMENTADOS

- [x] release-policy tests.
- [x] frontend audit/lint/build.
- [x] backend audit/tests.
- [x] E2E Chromium.
- [x] deployment/Compose/Nginx/images/FFmpeg/API smoke para Beta/Stable.
- [x] triggers `alpha`, `beta`, `main`.
- [x] gates diferenciados por canal.
- [ ] P0 artefactos Playwright/logs en fallos.
- [ ] P0 instalación completa efímera smoke.
- [ ] P1 carga/performance programada.

## 4. P0 — bloqueadores de producción comercial restantes

1. [ ] Branch protection/rulesets y required checks en GitHub.
2. [ ] Wizard productivo: dominio/TLS, admin, Xibo OAuth, IA, SMTP y primera pantalla.
3. [ ] Certificación física Browser Player y matriz de compatibilidad.
4. [ ] Backup→restore automatizado.
5. [ ] Upgrade entre estables automatizado.
6. [ ] SAST + secret scan + container scan.
7. [ ] Threat model + `SECURITY.md`.
8. [ ] Cross-tenant security tests.
9. [ ] Política de privacidad/retención para formularios y analytics.
10. [ ] Alertas de disco, backup y certificados TLS.
11. [ ] Procedimiento probado de rotación de secretos.
12. [ ] Recuperación/cambio de contraseña y límites de IA por tenant.

## 5. P1 — completar experiencia de producto

- [ ] Studio: resize/snap/multi-select/alineación/timeline visual.
- [ ] Biblioteca amplia de plantillas por industria.
- [ ] Brand Kit transversal Studio/HTML/IA.
- [ ] Calendar scheduler drag/drop.
- [ ] Campaign Manager visual con aprobación/versiones/rollback.
- [ ] Media thumbnails/posters y limpieza segura.
- [ ] QR dinámico editable + analytics.
- [ ] Turnos: configurador, SLA y reportes.
- [ ] Formularios: export, webhooks y lógica condicional.
- [ ] Widgets controlados: reloj, clima, RSS/JSON, KPI, tabla y gráfica.
- [ ] IA: imágenes, traducción, variantes responsive y límites de costo.
- [ ] Dashboard ejecutivo de uptime/campañas/PoP/QR/tickets/incidentes.
- [ ] Configuración segura de servicios desde UI.
- [ ] Changelog/release notes visibles en administración.

## 6. P2 — escala / enterprise

- [ ] Migrar persistencias JSON restantes cuando se requiera multi-réplica.
- [ ] PostgreSQL/Redis HA.
- [ ] S3/MinIO/CDN.
- [ ] réplicas API detrás de proxy.
- [ ] SSO/OIDC/SAML/LDAP.
- [ ] HA Xibo/MySQL.
- [ ] Player empaquetado opcional Android/Tauri/Electron.
- [ ] Videowall/sincronización avanzada.
- [ ] Marketplace/SDK widgets.
- [ ] MQTT + conectores ERP/CRM/BI.
- [ ] Planes/cuotas/billing si se vuelve SaaS.
- [ ] i18n y WCAG avanzada.

## 7. Orden de ejecución desde aquí

### Fase A — Release engineering

Código completado. Solo queda la configuración administrativa de branch protection y confirmar el bootstrap/tag estable al integrar.

### Fase B — Hardening P0

1. `SECURITY.md` + threat model.
2. SAST/secret/container scanning.
3. cross-tenant tests.
4. backup/restore/upgrade tests.
5. wizard/TLS/secretos.
6. alertas disco/backup/TLS.
7. recuperación de contraseña y límites IA.

### Fase C — Certificación hardware

Chrome/Edge → Raspberry Pi → Android TV → Tizen → webOS → tablet/panel táctil. Documentar resultado y workaround por plataforma.

### Fase D — UX P1

Studio avanzado → templates/Brand Kit → calendario → widgets → analytics/QR/formularios/turnos → IA.

### Fase E — Candidate real

`alpha.1 → alpha.5 → beta.1 → beta.3 → release/vX.Y.Z → instalación/upgrade/restore/hardware → stable`.

## 8. Definition of Done de producción

Una versión solo es **Production Ready** cuando:

- [ ] instalación limpia en VPS soportado termina con wizard documentado;
- [ ] HTTPS válido y renovación automática;
- [ ] Xibo OAuth conectado;
- [ ] Xibo Player y PLUS Browser Player reproducen contenido;
- [ ] offline last-known-good probado;
- [ ] backup/restore probado;
- [ ] upgrade/rollback probado;
- [ ] matriz física mínima completada;
- [ ] aislamiento tenant probado;
- [ ] security gates verdes;
- [ ] frontend/backend/deployment/E2E verdes sobre el mismo SHA;
- [ ] `doctor.sh` sin errores críticos;
- [ ] manuales actualizados;
- [ ] tag SemVer + release notes;
- [ ] sin secretos/build artifacts trackeados;
- [ ] **cero P0 abiertos**.

## 9. Evidencia de Fase A

- Motor release programado primero localmente.
- 14 pruebas Node locales cubren policy, CLI, configuración y lock metadata.
- Lockfile remoto sincronizado sin resolver/actualizar dependencias.
- Los workflows se validan nuevamente en GitHub Actions antes de integrar.
- `docs/RELEASES.md` documenta operación y promoción.

---

Última regla: marcar `[x]` solo después de código/prueba/operación demostrable; nunca por intención.
