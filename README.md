# Open Signage Plus V2

Open Signage Plus es una capa moderna de administración, automatización y reproducción web construida sobre **Xibo CMS** como motor principal de digital signage.

Xibo conserva las funciones maduras de signage —biblioteca, layouts, playlists, displays y programación— mientras Open Signage Plus ofrece una experiencia propia y guiada: PWA, publicación simplificada, IA local/API, QR, turnos, interacción táctil y un player universal basado en navegador.

## Arquitectura

```text
                    Open Signage Plus PWA
                           |
                    sesión administrativa
                           |
                           v
                    Open Signage API
                    /      |       \
                   /       |        \
             Xibo API   PLUS      IA Gateway
               OAuth2   Services   Ollama/API
                 |        |
       Media/Layouts   Scenes / Devices
       Scheduling      QR / Tickets
            |              |
       Xibo Players     Browser Player
                       /screen  /player/<token>
```

**Xibo es el motor; Open Signage Plus es el producto y la experiencia.** Las credenciales OAuth de Xibo y claves de IA permanecen en backend.

## Funciones V2

- PWA responsive propia; no expone la UI nativa de Xibo al usuario operativo.
- Autenticación administrativa real mediante API y sesiones HMAC firmadas; no hay contraseña demo hardcodeada.
- Motor Xibo: displays, layouts, biblioteca, playlists, display groups y scheduling.
- Creación de layouts draft, publicación y programación mediante nuestra API.
- Subida de archivos binarios a Xibo Library desde la PWA.
- Studio para crear escenas browser-first.
- **AI Studio** con preview obligatorio antes de publicar.
- IA local mediante Ollama o endpoint remoto compatible con Chat Completions.
- PLUS Web Player con texto, imagen, video, HTML sandboxed, botones táctiles y QR.
- Acciones táctiles: abrir URL HTTPS/HTTP o emitir turno.
- Sistema persistente de turnos: emitir, listar, llamar siguiente y completar.
- QR generado por el QuickChart local del stack.
- Cache local del último contenido válido para reproducción ante pérdida de conexión.
- Pairing guiado: la TV abre `/screen`, recibe código corto y se vincula desde Studio.
- Identidad persistente del navegador/pantalla y actualización automática de su escena asignada.
- Docker Compose con Xibo 4.5.0, MySQL, XMR, Memcached, QuickChart y servicios Open Signage.
- Ollama es opcional mediante perfil Docker `ai`.
- CI para frontend, backend, deployment y Playwright Chromium.

## Instalación

### Requisitos

- Linux.
- Docker Engine.
- Docker Compose v2 (`docker compose`).
- Puertos 8080/8081 durante la configuración inicial, o reverse proxy equivalente.

### Instalación estándar

```bash
git clone https://github.com/LORDMANUEL/OPEN-SINAGE-PLUS.git
cd OPEN-SINAGE-PLUS
git checkout feat/open-signage-plus-v2-xibo
chmod +x install.sh
./install.sh --admin-email=admin@empresa.com
```

El instalador:

1. valida Docker y Compose;
2. genera contraseña MySQL aleatoria;
3. genera contraseña administrativa aleatoria;
4. genera un secreto de sesión aleatorio;
5. crea `.env` con permiso `600`;
6. prepara volúmenes persistentes;
7. valida `docker compose config`;
8. construye y levanta el stack.

La contraseña administrativa inicial se muestra al final de la instalación. Guárdela.

### Instalación con IA local

```bash
./install.sh --with-ai --ai-model=qwen2.5:1.5b --admin-email=admin@empresa.com
```

Esto habilita el perfil `ai`, levanta Ollama y descarga el modelo indicado. Para servidores sin recursos suficientes, deje Ollama fuera y configure un endpoint API compatible en `.env`:

```env
AI_PROVIDER=compatible
AI_BASE_URL=https://proveedor.example/v1
AI_MODEL=modelo
AI_API_KEY=secreto
```

### Configurar Xibo

Xibo queda disponible inicialmente en:

```text
http://SERVIDOR:8081
```

Termine su wizard, cree una aplicación OAuth `client_credentials` y coloque:

```env
XIBO_CLIENT_ID=...
XIBO_CLIENT_SECRET=...
```

Luego reinicie el gateway:

```bash
docker compose --env-file .env -f docker-compose.v2.yml up -d open-signage-api
```

Entre a Open Signage Plus (`:8080`) y use **Motor Xibo → Verificar conexión**.

## Vincular una pantalla sin APK

En la TV, PC, tablet o navegador kiosco abra:

```text
http://SERVIDOR:8080/screen
```

Aparecerá un código de seis caracteres, por ejemplo:

```text
AB12CD
```

En **Studio**:

1. cree/publica la escena;
2. escriba `AB12CD` en “Vincular pantalla”;
3. asigne un nombre;
4. pulse “Vincular a escena publicada”.

La pantalla empieza a reproducir automáticamente y conserva su identidad en ese navegador. También sigue existiendo la ruta directa:

```text
/player/<scene-token>
```

## IA generativa

AI Studio sigue este flujo deliberadamente:

```text
Prompt
  -> modelo local/API
  -> JSON de escena validado
  -> preview
  -> aprobación humana
  -> publicación
```

La IA no recibe credenciales Xibo y no publica automáticamente. Las escenas generadas pasan por el mismo normalizador que el contenido manual: tipos permitidos, límites de coordenadas, URLs HTTP(S), HTML saneado y acciones táctiles permitidas.

## QR y turnos

Una escena puede contener un QR o un botón táctil con acción `ticket`. Al pulsarlo:

```text
Player táctil
   -> POST /api/queues/<cola>/tickets
   -> R001
   -> modal en pantalla
```

Desde **Turnos** el operador puede llamar al siguiente y completar la atención. Los datos se guardan en el volumen `shared/open-signage`.

## Seguridad

- Sesiones administrativas firmadas con HMAC SHA-256 y vencimiento configurable.
- Comparación de credenciales con `timingSafeEqual` sobre hashes SHA-256.
- Contraseña y secreto de sesión generados en instalación nueva.
- Rutas administrativas protegidas con Bearer session.
- Endpoints públicos limitados al mínimo necesario para player, QR, pairing y emisión de turno.
- Credenciales OAuth Xibo y `AI_API_KEY` solo en servidor.
- `X-Powered-By` deshabilitado.
- Timeouts para Xibo, IA y QR.
- Redacción de secretos/tokens en errores.
- Upload limitado a 200 MiB.
- Tokens de escena y dispositivo aleatorios.
- URLs remotas restringidas a HTTP(S).
- HTML se sanea y renderiza en `iframe sandbox` sin permisos.
- Persistencia JSON mediante reemplazo atómico de archivo.

Para producción, publique únicamente el puerto de Open Signage mediante HTTPS/reverse proxy; mantenga el CMS Xibo administrativo y servicios internos fuera de Internet salvo necesidad explícita.

## Desarrollo y pruebas

```bash
npm ci
npm run lint
npm run build
npx playwright test --project=chromium

cd packages/backend
npm ci
npm test
```

GitHub Actions ejecuta cuatro gates: `frontend`, `backend`, `deployment` y `e2e`.

## Alcance del Web Player

El PLUS Web Player es el canal browser-first de Open Signage Plus y es útil para Smart TV browser, PC, tablet y panel táctil. **No es todavía una reimplementación completa de XMDS/XLF**. Para toda la semántica avanzada de Xibo siguen disponibles sus players; Open Signage Plus mantiene ambos caminos desacoplados.

## Licencias

Open Signage Plus mantiene su aplicación separada del CMS Xibo y lo consume mediante API. Xibo y las imágenes/contenedores de terceros conservan sus respectivas licencias. Revise esas licencias antes de cualquier redistribución comercial.
