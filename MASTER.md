# MASTER — Open Signage Plus

> Fuente maestra de estado, deuda y orden de trabajo para llevar Open Signage Plus de la V2 funcional a una plataforma productiva certificada.

**Estable actual:** `2.0.0` · **Rama estable:** `main` · **Motor:** Xibo 4.5 · **UX:** Open Signage Plus PWA/API/Browser Player.

## 1. Reglas innegociables

1. `main` recibe solo versiones estables certificadas.
2. `feature/* → alpha → beta → main`.
3. 5 alphas verdes habilitan 1 beta; 3 betas verdes habilitan 1 estable.
4. El contador nunca sustituye CI: una versión roja no se promueve.
5. Cada cambio pertenece a un módulo de `docs/MODULES.md`.
6. RBAC del backend es autoridad; ocultar botones no es seguridad.
7. Secretos Xibo/IA/SMTP nunca llegan al navegador.
8. Toda persistencia debe tener backup, restore y migración.
9. Browser-first es prioridad; wrappers nativos son opcionales.
10. Xibo es motor; la experiencia de usuario pertenece a Open Signage Plus.

## 2. Ciclo de releases

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
                       main
                        ↓
                      vX.Y.Z
```

Hotfix: `main → hotfix/* → main`, y después propagar el arreglo hacia `beta` y `alpha`.

### Release engineering P0

- [ ] Crear ramas permanentes `alpha` y `beta` desde `main`.
- [ ] CI en `alpha`, `beta` y `main`; retirar triggers de ramas feature históricas.
- [ ] Workflow de promoción Alpha → Beta.
- [ ] Workflow de promoción Beta → Stable.
- [ ] Contadores/metadata automáticos de alphas y betas.
- [ ] Tags SemVer y release notes.
- [ ] Proteger `main`, `beta` y `alpha`; sin force-push.
- [ ] Checks obligatorios antes de promoción.
- [ ] Etiquetar la estable actual como `v2.0.0`.

## 3. Estado por módulos

### M01 Núcleo — FUNCIONAL

[x] Login/sesiones · [x] RBAC · [x] usuarios · [x] auditoría · [x] settings/health.  
Pendiente: [ ] P0 recuperación/cambio de contraseña; [ ] P1 2FA/passkeys; [ ] P2 SSO/OIDC.

### M02 Xibo — FUNCIONAL

[x] OAuth server-side · [x] displays/layouts/playlists/grupos/media · [x] publish/schedule · [x] bridge PLUS→Xibo.  
Pendiente: [ ] P0 wizard Xibo/OAuth sin editar `.env`; [ ] P1 widgets/datasets/overlays adicionales.

### M03 Studio — FUNCIONAL

[x] canvas · [x] plantillas · [x] drag/capas · [x] undo/redo · [x] 16:9/9:16 · [x] timeline/animaciones · [x] HTML Studio sandboxed.  
Pendiente: [ ] P1 resize handles; [ ] snap/grid; [ ] multi-select/alineación; [ ] copy/paste; [ ] timeline visual; [ ] más plantillas/Brand Kit.

### M04 Browser Player/flota — FUNCIONAL, NO CERTIFICADO EN TODO HARDWARE

[x] `/screen` · [x] `/player/<token>` · [x] pairing · [x] heartbeat · [x] last-known-good · [x] precache · [x] Proof of Play.  
Pendiente P0: [ ] Chrome/Edge PC; [ ] Raspberry Pi; [ ] Android/Google TV; [ ] Samsung Tizen; [ ] LG webOS; [ ] tablet/panel táctil; [ ] documentar limitaciones/autostart/watchdog.

### M05 Kiosco — FUNCIONAL

[x] navegación segura · [x] Inicio/Atrás · [x] timeout · [x] URL/ticket/scene.  
Pendiente P1: [ ] teclado virtual; [ ] accesibilidad táctil; [ ] perfiles kiosk por SO.

### M06 Turnos — FUNCIONAL

[x] emisión/prioridad/servicio · [x] llamada/transferencia/completado · [x] métricas · [x] TTS.  
Pendiente P1: [ ] configurador visual de colas/servicios/módulos; [ ] SLA/abandono/pausa; [ ] reportes históricos; [ ] voz por dispositivo.

### M07 Media — FUNCIONAL

[x] catálogo · [x] SHA-256/deduplicación · [x] huérfanos · [x] FFmpeg H.264/AAC.  
Pendiente: [ ] P0 cuotas por tenant; [ ] P1 thumbnails/posters; [ ] limpieza segura con rollback; [ ] P2 S3/MinIO/CDN.

### M08 IA — FUNCIONAL

[x] Ollama/API · [x] health/fallback · [x] generar/revisar · [x] aprobación humana.  
Pendiente: [ ] P0 límites de costo/rate por tenant; [ ] P1 imagen generativa; [ ] Brand Kit obligatorio; [ ] traducción; [ ] variantes responsive.

### M09 Empresas/sucursales — BASE FUNCIONAL

[x] organizaciones · [x] sucursales · [x] memberships.  
Pendiente P0: [ ] auditoría endpoint por endpoint del aislamiento tenant; [ ] pruebas negativas cross-tenant. P1: [ ] cuotas/límites.

### M10 Formularios — BASE FUNCIONAL

[x] diseñador/runtime · [x] rate-limit.  
Pendiente: [ ] P0 consentimiento/retención; [ ] P1 CSV/Excel; [ ] webhooks; [ ] campos condicionales.

### M11 Planning/Analytics — BASE FUNCIONAL

[x] preview · [x] conflictos/ganador · [x] Proof of Play/interacciones.  
Pendiente P1: [ ] calendario drag/drop; [ ] dashboards ejecutivos; [ ] agregación/retención histórica.

### M12 Operaciones/alertas — BASE FUNCIONAL

[x] fleet/system health · [x] SMTP/webhook · [x] cooldown.  
Pendiente: [ ] P0 backup/disco/TLS alerts; [ ] P1 incident history/ack; [ ] Slack/Telegram opcional.

### M13 Lifecycle — BASE FUNCIONAL

[x] install · [x] doctor · [x] backup/checksum · [x] restore · [x] update/rollback.  
Pendiente P0: [ ] test backup→restore; [ ] test upgrade desde estable; [ ] backup programado/retención; [ ] disaster restore en VPS/VM limpia.

### M14 Seguridad — BUENA BASE, NO CERRADA

[x] RBAC backend · [x] CORS deny-by-default · [x] trust proxy · [x] rate limits · [x] CSP · [x] sandbox · [x] secretos server-side.  
Pendiente P0: [ ] branch protection; [ ] secret scan/historial; [ ] SAST; [ ] container scan; [ ] rotación de secretos; [ ] threat model; [ ] `SECURITY.md`.

### M15 CI — FUNCIONAL, PENDIENTE DE CANALES

[x] frontend audit/lint/build · [x] backend audit/tests · [x] deployment/FFmpeg/smoke · [x] Playwright.  
Pendiente P0: [ ] alpha/beta/main; [ ] gates por canal; [ ] artefactos en fallos; [ ] instalación completa smoke. P1: [ ] carga/performance.

## 4. P0 — bloqueadores de producción comercial

- [ ] Release engineering Alpha/Beta/Stable completo.
- [ ] Branch protection y required checks.
- [ ] Sincronizar `package-lock.json`: todavía conserva `temp-project`/`0.0.0` aunque `package.json` ya es `open-signage-plus` `2.0.0`.
- [ ] Retirar `.vite/` ya trackeado; `.gitignore` lo ignora, pero sigue en el árbol Git.
- [ ] Revisar/mover/eliminar artefactos ajenos o históricos de raíz: `Plan de Diseño y Manual Técnico del Sistema de Gestión de Taller Automotriz.pdf`, `content.pdf` y `digital-signage-system (1).tsx` si no son referencia requerida.
- [ ] Wizard productivo: dominio/TLS, admin, Xibo OAuth, IA, SMTP y primera pantalla.
- [ ] Certificación física Browser Player.
- [ ] Backup→restore automatizado.
- [ ] Upgrade entre estables automatizado.
- [ ] SAST + secret scan + container scan.
- [ ] Threat model + `SECURITY.md`.
- [ ] Cross-tenant security tests.
- [ ] Política de retención/privacidad para formularios y analytics.
- [ ] Alertas de disco, backup y TLS.
- [ ] Procedimiento de rotación de secretos.
- [ ] Tag/release `v2.0.0`.

## 5. P1 — completar experiencia de producto

- [ ] Studio avanzado: resize/snap/multi-select/alineación/timeline visual.
- [ ] Biblioteca amplia de plantillas por industria.
- [ ] Brand Kit transversal Studio/HTML/IA.
- [ ] Calendar scheduler drag/drop.
- [ ] Campaign Manager visual con aprobación/versiones/rollback.
- [ ] Media thumbnails/posters y limpieza segura.
- [ ] QR dinámico editable + analytics.
- [ ] Turnos: configurador, SLA y reportes.
- [ ] Formularios: export, webhooks, lógica condicional.
- [ ] Widgets controlados: reloj, clima, RSS/JSON, KPI, tabla y gráfica.
- [ ] IA: imágenes, traducción, variantes responsive y límites de costo.
- [ ] Dashboard ejecutivo de uptime/campañas/PoP/QR/tickets/incidentes.
- [ ] Configuración segura de servicios desde UI.
- [ ] Changelog/release notes visibles en administración.

## 6. P2 — escala/enterprise

- [ ] Migrar persistencias JSON restantes cuando se requiera multi-réplica.
- [ ] PostgreSQL/Redis HA.
- [ ] S3/MinIO/CDN.
- [ ] Réplicas API detrás de proxy.
- [ ] SSO/OIDC/SAML/LDAP.
- [ ] HA Xibo/MySQL.
- [ ] Player empaquetado opcional Android/Tauri/Electron.
- [ ] Videowall/sincronización.
- [ ] Marketplace/SDK widgets.
- [ ] MQTT + conectores ERP/CRM/BI.
- [ ] Planes/cuotas/billing si se vuelve SaaS.
- [ ] i18n y WCAG avanzada.

## 7. Orden de ejecución

### Fase A — Release engineering
1. Limpiar metadata/artefactos.
2. Crear `alpha` y `beta` desde estable.
3. CI por canal.
4. Promoción 5 Alpha → Beta y 3 Beta → Stable.
5. Proteger ramas y crear `v2.0.0`.

### Fase B — Hardening
1. `SECURITY.md` + threat model.
2. SAST/secret/container scanning.
3. Cross-tenant tests.
4. Backup/restore/upgrade tests.
5. Wizard/TLS/secretos.
6. Alertas disco/backup/TLS.

### Fase C — Certificación hardware
Chrome/Edge → Raspberry Pi → Android TV → Tizen → webOS → tablet/panel táctil. Documentar resultado y workaround.

### Fase D — UX P1
Studio avanzado → templates/Brand Kit → calendario → widgets → analytics/QR/formularios/turnos → IA.

### Fase E — Candidate
Alpha 1–5 → Beta 1 → fixes → Beta 2 → fixes → Beta 3 → instalación/upgrade/restore/hardware → stable.

## 8. Definition of Done de producción

Una versión solo es **Production Ready** cuando:

- [ ] instalación limpia en VPS soportado termina con el wizard documentado;
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

## 9. Deuda de repositorio confirmada

La revisión de `main` encontró deuda concreta que debe resolverse en Fase A:

- `package.json` ya declara `open-signage-plus` `2.0.0`, pero `package-lock.json` conserva metadata `temp-project` `0.0.0`.
- `.gitignore` ignora `.vite`, pero existe una carpeta `.vite/` trackeada en el repositorio.
- Hay PDFs de otro contexto y un prototipo monolítico de ~74 KB en la raíz; deben clasificarse como documentación histórica válida o retirarse del producto.
- El workflow actual todavía referencia ramas feature históricas y no conoce aún `alpha`/`beta`.
- `main` actualmente no tiene branch protection habilitada.

## 10. Próximo bloque a ejecutar

**Fase A — Release engineering y limpieza**. No iniciar nuevas features P1 hasta que el repositorio tenga canales Alpha/Beta/Stable, metadata limpia, ramas protegidas y `v2.0.0` formalizado.

---

Última regla: este MASTER debe actualizarse al cerrar cada bloque. Marcar `[x]` solo con evidencia de código/prueba/operación; nunca por intención.