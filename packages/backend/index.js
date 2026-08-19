const { createApp } = require('./src/app');
const { createXiboIntegrationFromEnv } = require('./src/xibo-integration');
const { SceneStore } = require('./src/scene-store');
const { QueueStore } = require('./src/queue-store');
const { DeviceStore } = require('./src/device-store');
const { PlatformStore } = require('./src/platform-store');
const { createAiServiceFromEnv } = require('./src/ai-service');
const { createAuthServiceFromEnv } = require('./src/auth-service');
const { QrService } = require('./src/qr-service');

async function start() {
  const port = Number(process.env.PORT || 3000);
  const dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data';
  const platformStore = new PlatformStore({ dataDir });
  await platformStore.initialize({ adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD });
  const app = createApp({
    xiboClient: createXiboIntegrationFromEnv(process.env),
    sceneStore: new SceneStore({ dataDir }),
    queueStore: new QueueStore({ dataDir }),
    deviceStore: new DeviceStore({ dataDir }),
    platformStore,
    aiService: createAiServiceFromEnv(process.env),
    authService: createAuthServiceFromEnv(process.env, platformStore),
    qrService: new QrService({ baseUrl: process.env.QUICKCHART_BASE_URL || 'http://cms-quickchart:3400', timeoutMs: Number(process.env.QR_TIMEOUT_MS || 10000) }),
  });

  const server = app.listen(port, () => console.log(`Open Signage API listening on http://localhost:${port}`));
  const shutdown = () => server.close(() => { platformStore.close(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(error => { console.error('Open Signage API failed to start:', error); process.exit(1); });
