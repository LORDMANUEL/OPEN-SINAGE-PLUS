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
      res.status(502).json({ connected: false, error: sanitizeError(error) });
    }
  });

  app.get('/api/xibo/displays', async (_req, res) => {
    try {
      const displays = await xiboClient.getDisplays();
      res.json({ displays: Array.isArray(displays) ? displays : [] });
    } catch (error) {
      res.status(502).json({ error: 'XIBO_REQUEST_FAILED', message: sanitizeError(error) });
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
      return res.status(502).json({ error: 'XIBO_REQUEST_FAILED', message: sanitizeError(error) });
    }
  });

  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  return app;
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : 'Unknown integration error';
  return message.replace(/(client_secret|access_token)=([^&\s]+)/gi, '$1=[redacted]');
}

module.exports = { createApp, sanitizeError };