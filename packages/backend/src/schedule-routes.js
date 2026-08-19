const express = require('express');
const { previewSchedule } = require('./schedule-planner');
const { hasPermission } = require('./platform-store');

function createScheduleRouter({ xiboClient, platformStore }) {
  const router = express.Router();
  router.get('/preview', permit('schedule:read'), async (req, res) => {
    try {
      const events = await xiboClient.getSchedules();
      const result = previewSchedule(events, { at: req.query.at || new Date(), displayGroupId: req.query.displayGroupId || null });
      return res.json(result);
    } catch (error) { return res.status(502).json({ error: 'SCHEDULE_PREVIEW_FAILED', message: safe(error) }); }
  });
  router.post('/publish', express.json({ limit: '256kb' }), permit('schedule:write'), async (req, res) => {
    try {
      const event = await xiboClient.createSchedule(req.body || {});
      platformStore.audit({ actorEmail: req.auth.email, action: 'schedule.create', resourceType: 'schedule', resourceId: String(event?.eventId || event?.id || ''), detail: { layoutId: req.body?.layoutId, displayGroupIds: req.body?.displayGroupIds }, ip: req.ip });
      return res.status(201).json({ event });
    } catch (error) { return res.status(502).json({ error: 'SCHEDULE_CREATE_FAILED', message: safe(error) }); }
  });
  return router;
}
function permit(permission) { return (req, res, next) => hasPermission(req.auth?.role, permission) ? next() : res.status(403).json({ error: 'FORBIDDEN', permission }); }
function safe(error) { return String(error?.message || 'schedule error').slice(0, 300); }
module.exports = { createScheduleRouter };
