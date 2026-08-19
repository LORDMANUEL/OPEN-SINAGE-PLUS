# Open Signage Plus

Open Signage Plus es una capa moderna de administración, automatización y reproducción web construida sobre **Xibo CMS** como motor principal de digital signage.

La meta del proyecto es conservar las capacidades maduras de Xibo —biblioteca, layouts, playlists, displays y scheduling— y ofrecer encima una experiencia propia mucho más simple: PWA, publicación guiada, IA, QR/tickets, kioscos táctiles y un player opcional que funciona directamente en navegador.

## Arquitectura V2

```text
Open Signage Plus PWA
        |
        v
Open Signage API
   |          |
   |          +--> PLUS Web Player scenes
   |
   +--> OAuth2 --> Xibo CMS API
                    |
                    +--> Media
                    +--> Layouts
                    +--> Playlists
                    +--> Displays / Groups
                    +--> Scheduling
```

**Xibo es el motor; Open Signage Plus es el producto y la experiencia de usuario.** Las credenciales de Xibo permanecen en el backend y nunca se exponen al navegador.

## Estado funcional actual

- Login y panel PWA responsive.
- Centro `Motor Xibo` con estado OAuth y lectura de displays, layouts, media, playlists, display groups y schedule.
- Creación de programación y publicación de layouts mediante Open Signage API.
- Biblioteca `Media` con subida binaria hacia Xibo.
- `Studio` guiado para crear layouts draft en Xibo.
- `Studio` para crear escenas del PLUS Web Player.
- Player público `/player/<token>` para navegador sin login administrativo.
- Player con texto, imagen, video y HTML en iframe sandboxed.
- Cache local de la última escena válida para seguir mostrando contenido si se pierde la conexión.
- Persistencia de escenas en volumen Docker.
- PWA con manifest y service worker.
- CI con lint, build, tests backend y Playwright/Chromium.

## Instalación recomendada con Docker

### Requisitos

- Linux con Docker Engine y Docker Compose v2.
- Puertos 8080 para Open Signage Plus, 8081 para administración Xibo durante configuración y 9505 para XMR si se utiliza externamente.
- DNS/TLS mediante reverse proxy en producción.

### 1. Preparar configuración

```bash
cp .env.example .env
```

Defina al menos una contraseña fuerte para MySQL. Xibo puede iniciar sin que Open Signage tenga aún un OAuth client configurado; en ese estado la PWA mostrará `Xibo no configurado` en lugar de derribar el API.

### 2. Levantar el stack

```bash
docker compose -f docker-compose.v2.yml up -d --build
```

Servicios principales:

- Open Signage Plus: `http://SERVIDOR:8080`
- Xibo CMS de administración: `http://SERVIDOR:8081`

### 3. Crear el cliente API en Xibo

En Xibo cree una aplicación OAuth de tipo `client_credentials`. Copie el `client_id` y `client_secret` al `.env`:

```env
XIBO_CLIENT_ID=...
XIBO_CLIENT_SECRET=...
```

Reinicie únicamente el gateway:

```bash
docker compose -f docker-compose.v2.yml up -d open-signage-api
```

Luego entre a **Motor Xibo** y use `Verificar conexión`.

## Flujo de contenido

### Ruta Xibo

```text
Media -> subir archivo -> Xibo Library
Studio -> crear layout draft -> Xibo Layout
Motor Xibo -> publicar -> programar -> displays Xibo
```

### Ruta browser-only

```text
Studio -> crear escena -> Publicar Web Player
       -> /player/<token>
       -> abrir URL en TV / PC / tablet / panel táctil
```

El PLUS Web Player es actualmente un canal complementario. No pretende reemplazar todavía XMDS/XLF completo ni los players Xibo oficiales.

## Desarrollo

Frontend:

```bash
npm ci
npm run dev
```

Backend:

```bash
cd packages/backend
npm ci
npm test
npm start
```

Verificación completa:

```bash
npm run lint
npm run build
cd packages/backend && npm test
```

Los flujos de navegador se validan con Playwright en GitHub Actions.

## Seguridad

- Secrets OAuth solo en backend.
- `X-Powered-By` deshabilitado en Express.
- Timeouts para llamadas Xibo.
- Redacción de tokens/secrets en errores.
- Upload limitado a 200 MiB por solicitud.
- Tokens aleatorios para Web Player.
- Media remota del Web Player limitada a HTTP(S).
- HTML del Web Player se renderiza en `iframe sandbox` sin permisos y se limpia antes de persistir.
- Los archivos de escena se escriben de forma atómica en el volumen de datos.

## Documentación

- `docs/architecture/2026-08-18-open-signage-plus-v2-xibo.md`
- `docs/plans/2026-08-18-open-signage-plus-v2-implementation.md`
- `docs/DEPLOYMENT-V2.md`
- `docs/PLAYER-WEB-V2.md`

## Licencias

Open Signage Plus mantiene su código separado del CMS Xibo y se comunica con él mediante API. Revise siempre las licencias de Xibo y de los componentes de terceros antes de redistribuir una instalación comercial.
