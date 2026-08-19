const express = require('express');
const cors = require('cors');

const MAX_MEDIA_BYTES = 200 * 1024 * 1024;

function createApp({ xiboClient, sceneStore = null, aiService = null, queueStore = null, qrService = null }) {
  if (!xiboClient) throw new Error('xiboClient is required');

  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'open-signage-api' });
  });

  app.get('/api/integrations/xibo/status', async (_req, res) => {
    try {
      await xiboClient.authenticate();
      res.json({ connected: true });
    } catch (error) {
      res.json({ connected: false, error: sanitizeError(error) });
    }
  });

  addCollectionRoute(app, '/api/xibo/displays', 'displays', () => xiboClient.getDisplays());
  addCollectionRoute(app, '/api/xibo/layouts', 'layouts', () => xiboClient.getLayouts());
  addCollectionRoute(app, '/api/xibo/library', 'media', () => xiboClient.getLibrary());
  addCollectionRoute(app, '/api/xibo/playlists', 'playlists', () => xiboClient.getPlaylists());
  addCollectionRoute(app, '/api/xibo/display-groups', 'displayGroups', () => xiboClient.getDisplayGroups());
  addCollectionRoute(app, '/api/xibo/schedules', 'schedules', () => xiboClient.getSchedules());

  app.post('/api/xibo/layouts', async (req, res) => {
    const payload = req.body || {};
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const resolutionId = Number(payload.resolutionId || 0);
    const templateLayoutId = Number(payload.layoutId || 0);

    if (!name) return res.status(400).json({ error: 'INVALID_LAYOUT', message: 'name is required' });
    if ((!Number.isInteger(resolutionId) || resolutionId <= 0) && (!Number.isInteger(templateLayoutId) || templateLayoutId <= 0)) {
      return res.status(400).json({ error: 'INVALID_LAYOUT', message: 'resolutionId or layoutId template is required' });
    }

    try {
      const layout = await xiboClient.createLayout({
        name,
        description: typeof payload.description === 'string' ? payload.description.trim() : '',
        resolutionId: resolutionId > 0 ? resolutionId : undefined,
        layoutId: templateLayoutId > 0 ? templateLayoutId : undefined,
        returnDraft: payload.returnDraft !== false,
        code: typeof payload.code === 'string' ? payload.code.trim() : undefined,
      });
      return res.status(201).json({ layout });
    } catch (error) {
      return xiboError(res, error);
    }
  });

  app.post(
    '/api/xibo/library/upload',
    express.raw({ type: () => true, limit: MAX_MEDIA_BYTES }),
    async (req, res) => {
      const fileName = cleanHeader(req.get('x-file-name'));
      const name = cleanHeader(req.get('x-media-name'));
      const tags = cleanHeader(req.get('x-media-tags'));
      const contentType = req.get('content-type') || 'application/octet-stream';

      if (!fileName) return res.status(400).json({ error: 'INVALID_MEDIA', message: 'x-file-name header is required' });
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'INVALID_MEDIA', message: 'binary file body is required' });

      try {
        const media = await xiboClient.uploadMedia({ bytes: req.body, fileName, contentType, name, tags });
        return res.status(201).json({ media: Array.isArray(media) ? media : [media] });
      } catch (error) {
        return xiboError(res, error);
      }
    },
  );

  app.post('/api/xibo/layouts/:layoutId/publish', async (req, res) => {
    const layoutId = Number(req.params.layoutId);
    if (!Number.isInteger(layoutId) || layoutId <= 0) return res.status(400).json({ error: 'INVALID_LAYOUT', message: 'layoutId must be a positive integer' });
    try {
      const layout = await xiboClient.publishLayout(layoutId);
      return res.json({ layout });
    } catch (error) {
      return xiboError(res, error);
    }
  });

  app.post('/api/xibo/schedules', async (req, res) => {
    const payload = req.body || {};
    if (!payload.layoutId || !payload.eventTypeId || !payload.displayGroupIds) {
      return res.status(400).json({ error: 'INVALID_SCHEDULE', message: 'layoutId, eventTypeId and displayGroupIds are required' });
    }
    try {
      const event = await xiboClient.createSchedule(payload);
      return res.status(201).json({ event });
    } catch (error) {
      return xiboError(res, error);
    }
  });

  app.get('/api/ai/status', (_req, res) => {
    return res.json(aiService ? aiService.status() : { configured: false, provider: null, model: null });
  });

  app.post('/api/ai/generate-scene', async (req, res) => {
    if (!aiService) return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'AI service is not configured' });
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) return res.status(400).json({ error: 'INVALID_PROMPT', message: 'prompt is required' });
    try {
      const scene = await aiService.generateScene(prompt);
      return res.json({ scene });
    } catch (error) {
      return res.status(502).json({ error: 'AI_GENERATION_FAILED', message: sanitizeError(error) });
    }
  });

  app.get('/api/qr', async (req, res) => {
    if (!qrService) return res.status(503).json({ error: 'QR_UNAVAILABLE' });
    const value = String(req.query.value || '').trim();
    if (!value) return res.status(400).json({ error: 'INVALID_QR', message: 'value is required' });
    try {
      const rendered = await qrService.render(value);
      res.set('Content-Type', rendered.contentType);
      res.set('Cache-Control', 'public, max-age=300');
      return res.send(rendered.bytes);
    } catch (error) {
      return res.status(502).json({ error: 'QR_RENDER_FAILED', message: sanitizeError(error) });
    }
  });

  app.post('/api/queues/:queue/tickets', async (req, res) => {
    if (!queueStore) return res.status(503).json({ error: 'QUEUE_UNAVAILABLE' });
    try {
      const ticket = await queueStore.issue({ queue: req.params.queue, prefix: req.body?.prefix || 'A', customerName: req.body?.customerName || '' });
      return res.status(201).json({ ticket });
    } catch (error) {
      return res.status(400).json({ error: 'INVALID_TICKET', message: sanitizeError(error) });
    }
  });

  app.get('/api/queues/:queue', async (req, res) => {
    if (!queueStore) return res.status(503).json({ error: 'QUEUE_UNAVAILABLE' });
    try {
      return res.json({ tickets: await queueStore.list(req.params.queue) });
    } catch (error) {
      return res.status(400).json({ error: 'INVALID_QUEUE', message: sanitizeError(error) });
    }
  });

  app.post('/api/queues/:queue/call-next', async (req, res) => {
    if (!queueStore) return res.status(503).json({ error: 'QUEUE_UNAVAILABLE' });
    try {
      const ticket = await queueStore.callNext(req.params.queue, { desk: req.body?.desk || '' });
      if (!ticket) return res.status(404).json({ error: 'NO_WAITING_TICKETS' });
      return res.json({ ticket });
    } catch (error) {
      return res.status(400).json({ error: 'INVALID_QUEUE', message: sanitizeError(error) });
    }
  });

  app.post('/api/queues/:queue/tickets/:ticketId/complete', async (req, res) => {
    if (!queueStore) return res.status(503).json({ error: 'QUEUE_UNAVAILABLE' });
    try {
      const ticket = await queueStore.complete(req.params.queue, req.params.ticketId);
      if (!ticket) return res.status(404).json({ error: 'TICKET_NOT_FOUND' });
      return res.json({ ticket });
    } catch (error) {
      return res.status(400).json({ error: 'INVALID_QUEUE', message: sanitizeError(error) });
    }
  });

  app.post('/api/player/scenes', async (req, res) => {
    if (!sceneStore) return res.status(503).json({ error: 'PLAYER_STORE_UNAVAILABLE' });
    try {
      const created = await sceneStore.create(req.body || {});
      return res.status(201).json(created);
    } catch (error) {
      return res.status(400).json({ error: 'INVALID_SCENE', message: sanitizeError(error) });
    }
  });

  app.put('/api/player/scenes/:token', async (req, res) => {
    if (!sceneStore) return res.status(503).json({ error: 'PLAYER_STORE_UNAVAILABLE' });
    try {
      const scene = await sceneStore.update(req.params.token, req.body || {});
      if (!scene) return res.status(404).json({ error: 'SCENE_NOT_FOUND' });
      return res.json({ scene });
    } catch (error) {
      return res.status(400).json({ error: 'INVALID_SCENE', message: sanitizeError(error) });
    }
  });

  app.get('/api/player/scenes/:token', async (req, res) => {
    if (!sceneStore) return res.status(503).json({ error: 'PLAYER_STORE_UNAVAILABLE' });
    try {
      const scene = await sceneStore.get(req.params.token);
      if (!scene) return res.status(404).json({ error: 'SCENE_NOT_FOUND' });
      res.set('Cache-Control', 'no-store');
      return res.json({ scene });
    } catch (error) {
      return res.status(400).json({ error: 'INVALID_PLAYER_TOKEN', message: sanitizeError(error) });
    }
  });

  app.use((error, _req, res, next) => {
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'MEDIA_TOO_LARGE', message: `Media exceeds ${MAX_MEDIA_BYTES} bytes` });
    return next(error);
  });

  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  return app;
}

function addCollectionRoute(app, path, key, loader) {
  app.get(path, async (_req, res) => {
    try {
      const items = await loader();
      res.json({ [key]: Array.isArray(items) ? items : [] });
    } catch (error) {
      xiboError(res, error);
    }
  });
}

function cleanHeader(value) {
  if (!value) return undefined;
  return String(value).replace(/[\r\n]/g, '').trim().slice(0, 500);
}

function xiboError(res, error) {
  return res.status(502).json({ error: 'XIBO_REQUEST_FAILED', message: sanitizeError(error) });
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : 'Unknown integration error';
  return message
    .replace(/(client_secret|access_token)=([^&\s]+)/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]');
}

module.exports = { createApp, sanitizeError, cleanHeader, MAX_MEDIA_BYTES };
