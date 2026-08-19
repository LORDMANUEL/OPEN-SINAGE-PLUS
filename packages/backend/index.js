const { createApp } = require('./src/app');
const { createXiboIntegrationFromEnv } = require('./src/xibo-integration');
const { SceneStore } = require('./src/scene-store');
const { QueueStore } = require('./src/queue-store');
const { DeviceStore } = require('./src/device-store');
const { createAiServiceFromEnv } = require('./src/ai-service');
const { QrService } = require('./src/qr-service');

const port = Number(process.env.PORT || 3000);
const dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data';
const app = createApp({
  xiboClient: createXiboIntegrationFromEnv(process.env),
  sceneStore: new SceneStore({ dataDir }),
  queueStore: new QueueStore({ dataDir }),
  deviceStore: new DeviceStore({ dataDir }),
  aiService: createAiServiceFromEnv(process.env),
  qrService: new QrService({
    baseUrl: process.env.QUICKCHART_BASE_URL || 'http://cms-quickchart:3400',
    timeoutMs: Number(process.env.QR_TIMEOUT_MS || 10000),
  }),
});

app.listen(port, () => {
  console.log(`Open Signage API listening on http://localhost:${port}`);
});
