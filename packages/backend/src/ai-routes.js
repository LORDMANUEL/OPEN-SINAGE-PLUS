const express = require('express');
const { hasPermission } = require('./platform-store');

function createAiRouter({ aiService, platformStore }) {
  if (!aiService || !platformStore) throw new Error('aiService and platformStore are required');
  const router = express.Router();
  router.use(express.json({ limit: '1mb' }));

  router.get('/health', permitAi, async (_req, res) => res.json({ health: await aiService.health(), diagnostics: aiService.diagnostics() }));

  router.post('/generate-scene', permitAi, async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) return res.status(400).json({ error: 'INVALID_PROMPT', message: 'prompt is required' });
    try {
      const scene = await aiService.generateScene(prompt, { brandKit: loadBrandKit(platformStore) });
      platformStore.audit({ actorEmail: req.auth.email, action: 'ai.scene.generate', resourceType: 'scene', detail: { promptLength: prompt.length }, ip: req.ip });
      return res.json({ scene, diagnostics: aiService.diagnostics() });
    } catch (error) { return res.status(502).json({ error: 'AI_GENERATION_FAILED', message: safeMessage(error) }); }
  });

  router.post('/revise-scene', permitAi, async (req, res) => {
    const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : '';
    if (!instruction || !req.body?.scene) return res.status(400).json({ error: 'INVALID_REVISION', message: 'scene and instruction are required' });
    try {
      const scene = await aiService.reviseScene(req.body.scene, instruction, { brandKit: loadBrandKit(platformStore) });
      platformStore.audit({ actorEmail: req.auth.email, action: 'ai.scene.revise', resourceType: 'scene', detail: { instructionLength: instruction.length }, ip: req.ip });
      return res.json({ scene, diagnostics: aiService.diagnostics() });
    } catch (error) { return res.status(502).json({ error: 'AI_REVISION_FAILED', message: safeMessage(error) }); }
  });

  return router;
}

function loadBrandKit(store) {
  return Object.fromEntries(store.listSettings('brand.').map(item => [item.key.replace(/^brand\./, ''), item.value]));
}
function permitAi(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  if (!hasPermission(req.auth.role, 'ai:use')) return res.status(403).json({ error: 'FORBIDDEN', permission: 'ai:use' });
  return next();
}
function safeMessage(error) { return String(error?.message || 'AI provider error').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 300); }

module.exports = { createAiRouter, loadBrandKit };
