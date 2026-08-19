const express = require('express');
const cors = require('cors');

function createApp({ xiboClient }) {
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

  app.post('/api/xibo/layouts/:layoutId/publish', async (req, res) => {
    const layoutId = Number(req.params.layoutId);
    if (!Number.isInteger(layoutId) || layoutId <= 0) {
      return res.status(400).json({ error: 'INVALID_LAYOUT', message: 'layoutId must be a positive integer' });
    }
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
      return res.status(400).json({
        error: 'INVALID_SCHEDULE',
        message: 'layoutId, eventTypeId and displayGroupIds are required',
      });
    }

    try {
      const event = await xiboClient.createSchedule(payload);
      return res.status(201).json({ event });
    } catch (error) {
      return xiboError(res, error);
    }
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

function xiboError(res, error) {
  return res.status(502).json({ error: 'XIBO_REQUEST_FAILED', message: sanitizeError(error) });
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : 'Unknown integration error';
  return message.replace(/(client_secret|access_token)=([^&\s]+)/gi, '$1=[redacted]');
}

module.exports = { createApp, sanitizeError };
