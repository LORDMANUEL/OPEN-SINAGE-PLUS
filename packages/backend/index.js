const express = require('express');
const { createApp, requireAuth } = require('./src/app');
const { createPlatformRouter } = require('./src/platform-routes');
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
  const authService = createAuthServiceFromEnv(process.env, platformStore);
  const baseApp = createApp({
    xiboClient: createXiboIntegrationFromEnv(process.env),
    sceneStore: new SceneStore({ dataDir }),
    queueStore: new QueueStore({ dataDir }),
    deviceStore: new DeviceStore({ dataDir }),
    aiService: createAiServiceFromEnv(process.env),
    authService,
    qrService: new QrService({ baseUrl: process.env.QUICKCHART_BASE_URL || 'http://cms-quickchart:3400', timeoutMs: Number(process.env.QR_TIMEOUT_MS || 10000) }),
  });

  const app = express();
  app.disable('x-powered-by');
  app.use('/api/platform', express.json({ limit: '1mb' }), requireAuth(authService), createPlatformRouter({ platformStore }));
  app.get('/q/:slug', (req, res) => {
    const qr = platformStore.resolveDynamicQr(req.params.slug);
    if (!qr) return res.status(404).send('QR not found');
    return res.redirect(302, qr.destination);
  });
  app.get('/api/forms/:id', (req, res) => {
    const form = platformStore.getForm(req.params.id);
    return form ? res.json({ form }) : res.status(404).json({ error: 'FORM_NOT_FOUND' });
  });
  app.post('/api/forms/:id/responses', express.json({ limit: '256kb' }), (req, res) => {
    try { return res.status(201).json({ response: platformStore.submitForm(req.params.id, req.body || {}) }); }
    catch (error) { return res.status(400).json({ error: 'INVALID_FORM_RESPONSE', message: error.message }); }
  });
  app.use(baseApp);

  const server = app.listen(port, () => console.log(`Open Signage API listening on http://localhost:${port}`));
  const shutdown = () => server.close(() => { platformStore.close(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(error => { console.error('Open Signage API failed to start:', error); process.exit(1); });
