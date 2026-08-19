const express = require('express');
const os = require('node:os');
const fs = require('node:fs');
const { createApp, requireAuth, createRateLimiter } = require('./src/app');
const { createPlatformRouter } = require('./src/platform-routes');
const { createAiRouter } = require('./src/ai-routes');
const { createScheduleRouter } = require('./src/schedule-routes');
const { createOrganizationRouter } = require('./src/organization-routes');
const { createMediaRouter } = require('./src/media-routes');
const { createXiboIntegrationFromEnv } = require('./src/xibo-integration');
const { SceneStore } = require('./src/scene-store');
const { QueueStore } = require('./src/queue-store');
const { DeviceStore } = require('./src/device-store');
const { PlatformStore, hasPermission } = require('./src/platform-store');
const { OrganizationStore } = require('./src/organization-store');
const { MediaCatalog } = require('./src/media-catalog');
const { MediaTranscoder } = require('./src/media-transcoder');
const { AnalyticsStore } = require('./src/analytics-store');
const { createAiServiceFromEnv } = require('./src/ai-service');
const { createAuthServiceFromEnv } = require('./src/auth-service');
const { createNotificationServiceFromEnv } = require('./src/notification-service');
const { HealthMonitor } = require('./src/health-monitor');
const { QrService } = require('./src/qr-service');

async function start() {
  const port = Number(process.env.PORT || 3000);
  const dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data';
  const platformStore = new PlatformStore({ dataDir });
  await platformStore.initialize({ adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD });
  const organizationStore = new OrganizationStore({ dataDir });
  const mediaCatalog = new MediaCatalog({ dataDir });
  const mediaTranscoder = new MediaTranscoder({ dataDir, ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg', timeoutMs: Number(process.env.FFMPEG_TIMEOUT_MS || 180000) });
  const analyticsStore = new AnalyticsStore({ dataDir });
  const authService = createAuthServiceFromEnv(process.env, platformStore);
  const xiboClient = createXiboIntegrationFromEnv(process.env);
  const deviceStore = new DeviceStore({ dataDir });
  const queueStore = new QueueStore({ dataDir });
  const aiService = createAiServiceFromEnv(process.env);
  const notificationService = createNotificationServiceFromEnv(process.env);
  const healthMonitor = new HealthMonitor({ deviceStore, xiboClient, notificationService, intervalMs: Number(process.env.MONITOR_INTERVAL_MS || 60000), cooldownMs: Number(process.env.ALERT_COOLDOWN_MS || 900000) });
  const qrService = new QrService({ baseUrl: process.env.QUICKCHART_BASE_URL || 'http://cms-quickchart:3400', timeoutMs: Number(process.env.QR_TIMEOUT_MS || 10000) });
  const publicTicketLimit = createRateLimiter({ limit: 60, windowMs: 60_000 });
  const publicFormLimit = createRateLimiter({ limit: 30, windowMs: 60_000 });
  const telemetryLimit = createRateLimiter({ limit: 240, windowMs: 60_000 });
  const baseApp = createApp({ xiboClient, sceneStore: new SceneStore({ dataDir }), queueStore, deviceStore, aiService, authService, qrService });

  const app = express();
  app.disable('x-powered-by');
  app.use('/api/platform', express.json({ limit: '1mb' }), requireAuth(authService), createPlatformRouter({ platformStore }));
  app.use('/api/platform/organizations', requireAuth(authService), createOrganizationRouter({ organizationStore, platformStore }));
  app.use('/api/platform/schedule', requireAuth(authService), createScheduleRouter({ xiboClient, platformStore }));
  app.use('/api/platform/media', requireAuth(authService), permit('media:write'), createMediaRouter({ xiboClient, mediaCatalog, mediaTranscoder, platformStore }));
  app.use('/api/ai', requireAuth(authService), permit('ai:use'), createAiRouter({ aiService, platformStore }));

  app.get('/api/platform/notifications/status', requireAuth(authService), permit('health:read'), (_req, res) => res.json(notificationService.status()));
  app.post('/api/platform/notifications/test', requireAuth(authService), permit('settings:write'), express.json({ limit: '64kb' }), async (req, res) => {
    try { return res.json({ results: await notificationService.send({ subject: req.body?.subject || 'Open Signage Plus test', text: req.body?.text || 'Notificación de prueba', severity: 'info' }) }); }
    catch (error) { return res.status(502).json({ error: 'NOTIFICATION_FAILED', message: String(error.message || 'notification failed').slice(0, 300) }); }
  });

  app.post('/api/player/proof', telemetryLimit, express.json({ limit: '64kb' }), (req, res) => { try { return res.status(201).json({ event: analyticsStore.recordPlayback(req.body || {}) }); } catch (error) { return res.status(400).json({ error: 'INVALID_PROOF', message: String(error.message || 'invalid proof').slice(0, 200) }); } });
  app.post('/api/player/interaction', telemetryLimit, express.json({ limit: '64kb' }), (req, res) => { try { return res.status(201).json({ event: analyticsStore.recordInteraction(req.body || {}) }); } catch (error) { return res.status(400).json({ error: 'INVALID_INTERACTION', message: String(error.message || 'invalid interaction').slice(0, 200) }); } });
  app.get('/api/platform/analytics/summary', requireAuth(authService), permit('health:read'), (req, res) => res.json(analyticsStore.summary({ sinceHours: req.query.hours })));

  app.post('/api/xibo/library/upload', requireAuth(authService), permit('media:write'), express.raw({ type: () => true, limit: 200 * 1024 * 1024 }), async (req, res) => {
    try {
      const bytes = req.body; if (!Buffer.isBuffer(bytes) || bytes.length === 0) return res.status(400).json({ error: 'INVALID_MEDIA' });
      const hash = mediaCatalog.hash(bytes); const duplicate = mediaCatalog.findByHash(hash);
      if (duplicate) { mediaCatalog.touch(duplicate.id); platformStore.audit({ actorEmail: req.auth.email, action: 'media.deduplicated', resourceType: 'media', resourceId: duplicate.id, detail: { sha256: hash, fileName: duplicate.fileName }, ip: req.ip }); return res.status(200).json({ media: [duplicate.xiboPayload], catalog: { ...duplicate, deduplicated: true } }); }
      const fileName = String(req.get('x-file-name') || '').replace(/[\r\n]/g, '').trim().slice(0, 255); if (!fileName) return res.status(400).json({ error: 'INVALID_MEDIA', message: 'x-file-name is required' });
      const displayName = String(req.get('x-media-name') || '').replace(/[\r\n]/g, '').trim().slice(0, 255); const tags = String(req.get('x-media-tags') || '').replace(/[\r\n]/g, '').trim().slice(0, 1000);
      const uploaded = await xiboClient.uploadMedia({ bytes, fileName, contentType: req.get('content-type') || 'application/octet-stream', name: displayName, tags }); const xiboPayload = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      const catalog = mediaCatalog.record({ bytes, fileName, displayName, contentType: req.get('content-type') || '', tags, xiboPayload }); platformStore.audit({ actorEmail: req.auth.email, action: 'media.upload', resourceType: 'media', resourceId: catalog.id, detail: { sha256: catalog.sha256, fileName }, ip: req.ip });
      return res.status(201).json({ media: Array.isArray(uploaded) ? uploaded : [uploaded], catalog });
    } catch (error) { return res.status(502).json({ error: 'MEDIA_UPLOAD_FAILED', message: String(error.message || 'upload failed').slice(0, 300) }); }
  });
  app.get('/api/platform/media/catalog', requireAuth(authService), permit('media:read'), (req, res) => res.json({ media: mediaCatalog.search({ q: req.query.q, tags: req.query.tags, limit: req.query.limit }) }));
  app.get('/api/platform/media/orphans', requireAuth(authService), permit('media:read'), (req, res) => res.json({ media: mediaCatalog.orphanCandidates({ unusedDays: req.query.days }) }));

  app.post('/api/queues/:queue/tickets', publicTicketLimit, express.json({ limit: '64kb' }), async (req, res) => { try { const ticket = await queueStore.issue({ queue: req.params.queue, prefix: req.body?.prefix || 'A', customerName: req.body?.customerName || '', service: req.body?.service || '', priority: req.body?.priority || 0, metadata: req.body?.metadata || {} }); return res.status(201).json({ ticket }); } catch (error) { return res.status(400).json({ error: 'INVALID_TICKET', message: error.message }); } });
  app.get('/api/platform/queues/:queue/stats', requireAuth(authService), permit('queue:read'), async (req, res) => res.json({ stats: await queueStore.stats(req.params.queue) }));
  app.post('/api/platform/queues/:queue/tickets/:ticketId/transfer', requireAuth(authService), permit('queue:operate'), express.json({ limit: '64kb' }), async (req, res) => { try { const ticket = await queueStore.transfer(req.params.queue, req.params.ticketId, req.body || {}); return ticket ? res.json({ ticket }) : res.status(404).json({ error: 'TICKET_NOT_FOUND' }); } catch (error) { return res.status(400).json({ error: 'INVALID_TICKET', message: error.message }); } });

  app.post('/api/player/devices/:deviceToken/heartbeat', express.json({ limit: '64kb' }), async (req, res) => { try { const device = await deviceStore.heartbeat(req.params.deviceToken, req.body || {}); return device ? res.json({ device }) : res.status(404).json({ error: 'DEVICE_NOT_FOUND' }); } catch (error) { return res.status(400).json({ error: 'INVALID_HEARTBEAT', message: error.message }); } });
  app.get('/api/platform/fleet/health', requireAuth(authService), permit('health:read'), async (_req, res) => res.json(await deviceStore.fleetHealth()));
  app.get('/api/platform/system/health', requireAuth(authService), permit('health:read'), async (_req, res) => {
    const started = Date.now(); let xibo = { ok: false, error: 'unavailable' }; try { await xiboClient.authenticate(); xibo = { ok: true }; } catch (error) { xibo = { ok: false, error: String(error.message || 'xibo unavailable').slice(0, 200) }; }
    const stats = fs.statfsSync(dataDir); return res.json({ status: 'ok', checkedAt: new Date().toISOString(), latencyMs: Date.now() - started, node: process.version, uptimeSeconds: Math.round(process.uptime()), hostname: os.hostname(), memory: { rss: process.memoryUsage().rss, heapUsed: process.memoryUsage().heapUsed, freeSystem: os.freemem(), totalSystem: os.totalmem() }, storage: { freeBytes: Number(stats.bavail) * Number(stats.bsize), totalBytes: Number(stats.blocks) * Number(stats.bsize) }, xibo, ai: aiService ? aiService.diagnostics() : { configured: false }, notifications: notificationService.status(), fleet: await deviceStore.fleetHealth(), analytics: analyticsStore.summary({ sinceHours: 24 }) });
  });

  app.get('/q/:slug', (req, res) => { const qr = platformStore.resolveDynamicQr(req.params.slug); if (!qr) return res.status(404).send('QR not found'); return res.redirect(302, qr.destination); });
  app.get('/api/forms/:id', (req, res) => { const form = platformStore.getForm(req.params.id); return form ? res.json({ form }) : res.status(404).json({ error: 'FORM_NOT_FOUND' }); });
  app.post('/api/forms/:id/responses', publicFormLimit, express.json({ limit: '256kb' }), (req, res) => { try { return res.status(201).json({ response: platformStore.submitForm(req.params.id, req.body || {}) }); } catch (error) { return res.status(400).json({ error: 'INVALID_FORM_RESPONSE', message: error.message }); } });

  // RBAC guard for routes served by the base gateway.
  app.use('/api/xibo', requireAuth(authService), xiboPermissionGuard);
  app.use('/api/player/scenes', (req, res, next) => {
    if (req.method === 'GET') return next();
    return requireAuth(authService)(req, res, () => permit('campaign:write')(req, res, next));
  });
  app.post('/api/player/devices/pair', requireAuth(authService), permit('device:pair'));
  app.use('/api/queues', (req, res, next) => {
    if (req.method === 'POST' && /^\/[a-z0-9_-]+\/tickets$/.test(req.path)) return next();
    return requireAuth(authService)(req, res, () => permit(req.method === 'GET' ? 'queue:read' : 'queue:operate')(req, res, next));
  });
  app.use(baseApp);

  const server = app.listen(port, () => { console.log(`Open Signage API listening on http://localhost:${port}`); healthMonitor.start(); });
  const shutdown = () => server.close(() => { healthMonitor.stop(); analyticsStore.close(); mediaCatalog.close(); organizationStore.close(); platformStore.close(); process.exit(0); });
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}

function permit(permission) {
  return (req, res, next) => hasPermission(req.auth?.role, permission) ? next() : res.status(403).json({ error: 'FORBIDDEN', permission });
}
function xiboPermissionGuard(req, res, next) {
  const path = req.path;
  let permission;
  if (path.startsWith('/library')) permission = req.method === 'GET' ? 'media:read' : 'media:write';
  else if (path.startsWith('/schedules')) permission = req.method === 'GET' ? 'schedule:read' : 'schedule:write';
  else if (req.method === 'GET') permission = 'screen:read';
  else permission = 'campaign:write';
  return permit(permission)(req, res, next);
}

start().catch(error => { console.error('Open Signage API failed to start:', error); process.exit(1); });
