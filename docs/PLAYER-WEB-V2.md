# PLUS Web Player — V2

Open Signage Plus mantiene Xibo como motor principal de señalización y añade un reproductor web opcional para dispositivos que solo necesitan un navegador moderno.

## Flujo funcional

1. `Media` sube recursos al Xibo CMS a través de Open Signage API.
2. `Studio` puede crear un layout draft en Xibo.
3. `Motor Xibo` permite publicar layouts y crear programación para display groups.
4. `Studio` también puede publicar una escena ligera para el PLUS Web Player.
5. La escena obtiene un token aleatorio y una URL `/player/<token>`.
6. El player consulta `/api/player/scenes/<token>` cada 10 segundos y guarda la última escena válida en `localStorage`.
7. Si se pierde la conexión, reproduce la escena en cache e indica estado offline discretamente.

## Seguridad

- Las credenciales OAuth de Xibo solo viven en Open Signage API.
- El upload de media tiene límite de 200 MiB por solicitud.
- Los tokens del Web Player son aleatorios y no contienen IDs internos.
- Las escenas aceptan solo texto, imagen, video y HTML sandboxed.
- URLs de imagen/video se restringen a HTTP(S).
- HTML se renderiza en `iframe sandbox` sin permisos; además se eliminan tags `<script>`, handlers `on*` y `javascript:` comunes antes de persistir.
- El Web Player no expone la sesión administrativa.

## Persistencia

Docker monta `./shared/open-signage:/data`. Las escenas quedan en `/data/player-scenes.json`, escrito de forma atómica para evitar corrupción por escrituras parciales.

## Alcance actual

El PLUS Web Player es un canal adicional. No sustituye todavía al player Xibo ni implementa XMDS/XLF completo. La ruta Xibo sigue siendo la recomendada para scheduling y players Xibo; el player web se usa para browser-only, kioscos y superficies táctiles ligeras mientras se expande la compatibilidad.
