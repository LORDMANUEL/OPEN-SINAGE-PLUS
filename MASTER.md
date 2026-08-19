# MASTER — Open Signage Plus

> Fuente maestra para terminar, estabilizar y llevar Open Signage Plus a producción. Si existe contradicción entre una lista informal y este documento, este archivo define el orden de trabajo hasta que se actualice mediante PR.

**Versión estable actual:** `2.0.0`  
**Rama estable:** `main`  
**Arquitectura:** Xibo como motor + Open Signage Plus PWA/API/Browser Player  
**Objetivo:** una instalación reproducible, segura, recuperable, actualizable y certificada en hardware real.

## 1. Reglas del proyecto

1. `main` contiene únicamente versiones estables certificadas.
2. Ninguna función nueva entra directamente a `main`.
3. Cada cambio pertenece a un módulo de `docs/MODULES.md`.
4. Backend RBAC es autoridad; ocultar un botón en UI no es seguridad.
5. Secretos Xibo/IA/SMTP nunca pasan al navegador.
6. Toda persistencia debe tener backup, restore y estrategia de migración.
7. Un release requiere frontend + backend + deployment + E2E verdes sobre el mismo SHA.
8. Una prueba omitida debe quedar documentada; no se llama estable a una cabeza roja.
9. Xibo sigue siendo motor; la UX de usuario final pertenece a Open Signage Plus.
10. Browser-first sigue siendo prioridad; wrappers nativos son opcionales.

## 2. Modelo de releases acordado

```text
feature/*
    ↓
  alpha
    ├── vX.Y.Z-alpha.1
    ├── vX.Y.Z-alpha.2
    ├── vX.Y.Z-alpha.3
    ├── vX.Y.Z-alpha.4
    └── vX.Y.Z-alpha.5
              ↓
             beta
              ├── vX.Y.Z-beta.1
              ├── vX.Y.Z-beta.2
              └── vX.Y.Z-beta.3
                         ↓
                        main
                         ↓
                       vX.Y.Z
```

### Reglas de promoción

- Cada 5 alphas **verdes** se puede crear una beta.
- Cada 3 betas **verdes** se puede crear una estable.
- El contador habilita la promoción; no la obliga.
- Un alpha/beta con gate rojo no cuenta para promoción.
- Beta recibe principalmente fixes, hardening y compatibilidad.
- Stable no recibe features experimentales.
- Hotfix: `main → hotfix/* → main`, y luego el fix se propaga a `beta` y `alpha`.

### Pendiente para automatizar este modelo — P0

- [ ] Crear ramas permanentes `alpha` y `beta` desde la estable actual.
- [ ] Cambiar CI para ejecutar en `alpha`, `beta` y `main` y eliminar ramas feature históricas del trigger.
- [ ] Crear workflow de promoción Alpha → Beta.
- [ ] Crear workflow de promoción Beta → Stable.
- [ ] Añadir contador/metadata de alphas y betas sin depender de conteo manual.
- [ ] Tags SemVer: `alpha.N`, `beta.N`, estable.
- [ ] Generar CHANGELOG/release notes por promoción.
- [ ] Proteger `main`, `beta` y `alpha` contra force-push.
- [ ] Exigir checks obligatorios antes de merge/promoción.

## 3. Estado funcional actual

### M01 Núcleo — FUNCIONAL

- [x] Login y sesión firmada.
- [x] RBAC `admin`, `marketing`, `operator`, `viewer`.
- [x] Usuarios y auditoría.
- [x] Settings y health.
- [ ] P0: 2FA/passkeys para administradores.
- [ ] P0: recuperación/cambio de contraseña administrada desde UI.
- [ ] P1: OIDC/SSO opcional.

### M02 Motor Xibo — FUNCIONAL

- [x] OAuth server-side.
- [x] Displays, layouts, playlists, display groups y media.
- [x] Publicación y scheduling.
- [x] Bridge de escena PLUS a Xibo Webpage widget.
- [ ] P0: wizard guiado para terminar configuración Xibo/OAuth sin editar `.env` manualmente.
- [ ] P1: ampliar mapping a widgets/datasets/overlays Xibo cuando aporte valor.

### M03 Studio — FUNCIONAL

- [x] Canvas, plantillas, capas, drag, undo/redo.
- [x] 16:9 / 9:16.
- [x] Timeline y animaciones.
- [x] HTML Studio con preview sandboxed.
- [ ] P1: resize handles visuales y snap/grid.
- [ ] P1: multi-select/alineación/distribución.
- [ ] P1: copiar/pegar entre escenas.
- [ ] P1: más plantillas comerciales y Brand Kit aplicado al editor.
- [ ] P1: timeline visual tipo pista, no solo campos numéricos.

### M04 Browser Player y flota — FUNCIONAL, REQUIERE CERTIFICACIÓN FÍSICA

- [x] `/screen` y `/player/<token>`.
- [x] Pairing corto.
- [x] Heartbeat y metadata.
- [x] Last-known-good y precache de media.
- [x] Proof of Play.
- [ ] P0: matriz física Chrome/Edge/Raspberry Pi/Android TV/Samsung Tizen/LG webOS/tablet.
- [ ] P0: documentar capacidades y limitaciones por plataforma.
- [ ] P0: watchdog/autostart recomendado por plataforma.
- [ ] P1: screenshot remoto cuando la plataforma lo permita.
- [ ] P1: políticas de cache por cuota/espacio y limpieza LRU.

### M05 Kiosco — FUNCIONAL

- [x] Navegación interna segura.
- [x] Inicio/Atrás.
- [x] Timeout por inactividad.
- [x] Acciones URL/ticket/scene.
- [ ] P1: teclado virtual y accesibilidad táctil avanzada.
- [ ] P1: modo kiosk fullscreen/autostart documentado por SO.

### M06 Turnos — FUNCIONAL

- [x] Emisión, prioridad, servicio, llamada, transferencia y completado.
- [x] Métricas de espera/servicio.
- [x] TTS local.
- [ ] P1: configuración visual de colas/servicios/módulos.
- [ ] P1: SLA/abandono/pausa y reportes históricos avanzados.
- [ ] P1: voz seleccionable por dispositivo/idioma.

### M07 Media — FUNCIONAL

- [x] Catálogo, SHA-256 y deduplicación.
- [x] Detección de candidatos huérfanos.
- [x] FFmpeg H.264/AAC.
- [ ] P0: límites configurables por tenant/sucursal.
- [ ] P1: thumbnails/posters automáticos.
- [ ] P1: limpieza segura de huérfanos con preview y rollback.
- [ ] P2: S3/MinIO/CDN para escala.

### M08 IA — FUNCIONAL

- [x] Ollama o API compatible.
- [x] Health/diagnostics/fallback.
- [x] Generación y revisión de escena.
- [x] Aprobación humana antes de publicar.
- [ ] P0: límites de costo/tokens y rate limits por usuario/tenant.
- [ ] P1: generación/edición de imágenes mediante proveedor desacoplado.
- [ ] P1: Brand Kit obligatorio en generación comercial.
- [ ] P1: traducción y variantes 16:9/9:16 automáticas.

### M09 Empresas/sucursales — FUNCIONAL BASE

- [x] Organizaciones, sucursales y membresías.
- [ ] P0: aislamiento de datos por organización revisado endpoint por endpoint.
- [ ] P0: pruebas negativas cross-tenant.
- [ ] P1: límites/cuotas por tenant.

### M10 Formularios — FUNCIONAL BASE

- [x] Diseñador y runtime público.
- [x] Rate limit.
- [ ] P0: consentimiento/retención configurable para datos personales.
- [ ] P1: export CSV/Excel y webhooks por formulario.
- [ ] P1: campos condicionales y validaciones avanzadas.

### M11 Planning/Analytics — FUNCIONAL BASE

- [x] Preview por fecha/grupo.
- [x] Conflictos y evento ganador.
- [x] Proof of Play e interacciones.
- [ ] P1: calendario visual drag/drop completo.
- [ ] P1: dashboards ejecutivos por sucursal/campaña.
- [ ] P1: retención/agregación de analytics para largo plazo.

### M12 Operaciones/alertas — FUNCIONAL BASE

- [x] Fleet/system health.
- [x] SMTP y webhook.
- [x] Cooldown de alertas.
- [ ] P0: alertas de backup fallido, disco bajo y certificados TLS.
- [ ] P1: historial de incidentes/acknowledgement.
- [ ] P1: integración opcional Slack/Telegram.

### M13 Lifecycle — FUNCIONAL BASE

- [x] `install.sh`.
- [x] `doctor.sh`.
- [x] backup + checksum.
- [x] restore endurecido.
- [x] update + rollback de código.
- [ ] P0: prueba automatizada backup → restore en CI/entorno efímero.
- [ ] P0: prueba de upgrade desde la última estable.
- [ ] P0: backup programado y retención automática documentada/instalable.
- [ ] P0: restore de desastre probado en VPS/VM limpia.

### M14 Seguridad — BUENA BASE, NO CERRADA

- [x] RBAC backend.
- [x] CORS deny-by-default.
- [x] Trust proxy restringido.
- [x] Rate limiting.
- [x] CSP y headers.
- [x] HTML sandboxed.
- [x] Secretos server-side.
- [ ] P0: branch protection en GitHub.
- [ ] P0: secret scanning y revisión de historial.
- [ ] P0: container image scanning.
- [ ] P0: SAST en CI.
- [ ] P0: rotación de secretos desde procedimiento documentado.
- [ ] P0: revisión CSRF/session y threat model formal.
- [ ] P1: 2FA/passkeys.

### M15 CI — FUNCIONAL, DEBE EVOLUCIONAR A CANALES

- [x] frontend audit/lint/build.
- [x] backend audit/tests.
- [x] deployment scripts/Compose/Nginx/images/FFmpeg/API smoke.
- [x] Playwright E2E.
- [ ] P0: adaptar triggers a `alpha`, `beta`, `main`.
- [ ] P0: separar gates rápidos Alpha de gates completos Beta/Stable.
- [ ] P0: artefactos de logs/reportes Playwright en fallos.
- [ ] P0: smoke de instalación completa, no solo imagen backend.
- [ ] P1: load/performance tests programados.

## 4. P0 — bloqueadores antes de declarar producción comercial

Estos puntos tienen prioridad absoluta:

- [ ] Implementar ramas/canales Alpha → Beta → Stable.
- [ ] Proteger ramas y checks obligatorios.
- [ ] Sincronizar metadata de `package-lock.json` con `package.json` (`package-lock` todavía conserva el nombre/version del scaffold histórico).
- [ ] Eliminar del repositorio `.vite/` ya trackeado; está ignorado pero todavía existe en Git.
- [ ] Revisar y retirar/mover artefactos históricos no pertenecientes al producto: PDFs de taller automotriz, `content.pdf` y el prototipo monolítico `digital-signage-system (1).tsx` si no son referencia necesaria.
- [ ] Wizard productivo de primera instalación: dominio, TLS, admin, Xibo OAuth, IA, SMTP y primera pantalla.
- [ ] Certificación física de Browser Player.
- [ ] Test automatizado backup/restore.
- [ ] Test automatizado upgrade entre estables.
- [ ] Security pipeline: SAST + secret scan + container scan.
- [ ] Threat model y SECURITY.md.
- [ ] Pruebas de aislamiento multiempresa.
- [ ] Política de datos/retención para formularios y analytics.
- [ ] Alertas de disco, backup y TLS.
- [ ] Procedimiento de rotación de secretos.
- [ ] Tag inicial de la estable actual como `v2.0.0` y release notes.

## 5. P1 — completar experiencia de producto

- [ ] Studio: resize handles, snap/grid, multi-select, alineación y timeline visual.
- [ ] Biblioteca de plantillas por industria.
- [ ] Brand Kit aplicado a Studio/HTML/IA.
- [ ] Calendar scheduler drag/drop.
- [ ] Campaign Manager más visual con aprobación y rollback.
- [ ] Media thumbnails/posters y limpieza segura.
- [ ] QR dinámico con analytics y edición de destino desde UI.
- [ ] Turnos: configuración visual, SLA y reportes históricos.
- [ ] Formularios: exportación, webhooks y lógica condicional.
- [ ] Widgets controlados: reloj, clima, RSS/JSON, KPI, tabla y gráfica.
- [ ] IA: imágenes, traducción, variantes responsive y límites de costo.
- [ ] Dashboard ejecutivo de uptime, campañas, Proof of Play, QR, tickets e incidentes.
- [ ] Notificaciones adicionales opcionales.
- [ ] Configuración de más secretos/settings desde UI sin exponer valores.
- [ ] Release notes/changelog visibles en panel administrador.

## 6. P2 — escala y enterprise

- [ ] Migrar persistencias JSON restantes a una base transaccional compartida cuando se requiera multi-réplica.
- [ ] PostgreSQL/Redis para alta disponibilidad.
- [ ] S3/MinIO/CDN para media.
- [ ] Varias réplicas API detrás de reverse proxy.
- [ ] SSO/OIDC/SAML/LDAP.
- [ ] HA de Xibo/MySQL.
- [ ] Player empaquetado opcional Android/Tauri/Electron para hardware que lo necesite.
- [ ] Videowall/sincronización avanzada.
- [ ] Marketplace/SDK de widgets.
- [ ] MQTT y conectores ERP/CRM/BI.
- [ ] Cuotas, planes y billing si se comercializa como SaaS.
- [ ] i18n completa y WCAG avanzada.

## 7. Orden de ejecución recomendado

### Fase A — Release engineering

1. Limpiar metadata/artefactos del repo.
2. Crear `alpha` y `beta` desde `main` estable.
3. Actualizar CI por canal.
4. Implementar promoción 5 Alpha → 1 Beta → 3 Beta → Stable.
5. Proteger ramas y etiquetar `v2.0.0`.

### Fase B — Production hardening

1. SECURITY.md + threat model.
2. SAST/secret/container scanning.
3. Cross-tenant tests.
4. Backup/restore/upgrade tests.
5. Wizard + TLS + secretos.
6. Alertas de disco/backup/TLS.

### Fase C — Hardware certification

1. Chrome/Edge PC.
2. Raspberry Pi/Chromium.
3. Android/Google TV browser.
4. Samsung Tizen browser.
5. LG webOS browser.
6. Tablet/panel táctil.
7. Documentar matriz y workaround por plataforma.

### Fase D — UX P1

Studio avanzado, plantillas, calendario, widgets, analytics, QR, formularios, turnos e IA.

### Fase E — Production candidate

1. Crear Alpha 1–5.
2. Promover Beta 1.
3. Corregir y repetir hasta Beta 3.
4. Ejecutar instalación limpia + upgrade + restore + hardware matrix.
5. Promover stable solo con todos los gates verdes.

## 8. Definition of Done para producción

Una versión se considera **Production Ready** únicamente cuando:

- [ ] instalación limpia en VPS soportado termina sin intervención técnica fuera del wizard documentado;
- [ ] HTTPS válido y renovación automática;
- [ ] Xibo OAuth conectado;
- [ ] al menos una pantalla Xibo y una PLUS Browser Player reproducen contenido;
- [ ] offline last-known-good probado;
- [ ] backup y restore probados;
- [ ] upgrade y rollback probados;
- [ ] matriz física mínima completada;
- [ ] aislamiento tenant probado;
- [ ] security gates verdes;
- [ ] frontend/backend/deployment/E2E verdes;
- [ ] `doctor.sh` sin errores críticos;
- [ ] documentación de instalación/operación/contingencia actualizada;
- [ ] tag SemVer y release notes creados;
- [ ] no hay secretos ni artefactos de build trackeados;
- [ ] no hay deuda P0 abierta.

## 9. Deuda/revisión de repositorio detectada

Durante la revisión