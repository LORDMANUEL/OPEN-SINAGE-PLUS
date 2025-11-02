# Digital Signage Enterprise System

Este repositorio contiene el código fuente para el Sistema de Señalización Digital Empresarial, una aplicación full-stack para gestionar pantallas digitales, quioscos y paneles de control.

## Arquitectura

El sistema está diseñado con una arquitectura de microservicios y se compone de los siguientes componentes:

- **Frontend:** Una aplicación de una sola página (SPA) construida con React y Vite que sirve como panel de administración para gestionar el contenido y las pantallas.
- **Backend:** Una API REST construida con Node.js y Express que gestiona la lógica de negocio y se comunica con la base de datos.
- **Reproductor:** Una aplicación de escritorio construida con Electron que muestra el contenido en las pantallas de señalización digital.

## Capturas de Pantalla

*Nota: Las siguientes imágenes son marcadores de posición. No se pudieron generar capturas de pantalla reales debido a un error persistente del servidor de desarrollo de Vite en el entorno de prueba.*

**Pantalla de Inicio de Sesión**
![Pantalla de Inicio de Sesión](https://via.placeholder.com/800x600.png?text=Pantalla+de+Inicio+de+Sesión)

**Dashboard Principal**
![Dashboard Principal](https://via.placeholder.com/800x600.png?text=Dashboard+Principal)

## Instalación y Ejecución

Siga estas instrucciones para configurar y ejecutar el sistema en su entorno local.

### Prerrequisitos

- Node.js (v16 o superior)
- npm (v8 o superior)

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_REPOSITORIO>
```

### 2. Instalar Dependencias

Instale las dependencias para el proyecto raíz, el backend y el reproductor.

```bash
npm install
cd packages/backend && npm install && cd ../..
cd packages/player && npm install && cd ../..
```

### 3. Ejecutar los Servidores

Necesitará ejecutar tanto el servidor de desarrollo del frontend como el servidor del backend.

**Iniciar el Backend (API)**

```bash
cd packages/backend
npm start
```

El servidor de la API se ejecutará en `http://localhost:3000`.

**Iniciar el Frontend (Panel de Administración)**

En una nueva terminal:

```bash
npm run dev
```

El panel de administración estará disponible en `http://localhost:5173`.

### 4. Ejecutar el Reproductor de Electron

Para ejecutar la aplicación de escritorio del reproductor en modo de desarrollo:

```bash
cd packages/player
npm start
```

## Scripts Útiles

- `npm run dev`: Inicia el servidor de desarrollo del frontend.
- `npm start` (en `packages/backend`): Inicia el servidor de la API del backend.
- `npm start` (en `packages/player`): Inicia la aplicación del reproductor de Electron.
- `npm run dist` (en `packages/player`): Empaqueta la aplicación del reproductor para distribución.
