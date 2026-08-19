const express = require('express');

function createMediaRouter({ xiboClient, mediaCatalog, mediaTranscoder, platformStore }) {
  const router = express.Router();
  router.post('/transcode-upload', express.raw({ type: () => true, limit: 200 * 1024 * 1024 }), async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'INVALID_MEDIA', message: 'media bytes are required' });
      const fileName = cleanHeader(req.get('x-file-name'));
      if (!fileName) return res.status(400).json({ error: 'INVALID_MEDIA', message: 'x-file-name is required' });
      const preset = req.get('x-transcode-preset') === 'screen-720p' ? 'screen-720p' : 'screen-1080p';
      const output = await mediaTranscoder.transcode(req.body, { fileName, preset });
      const hash = mediaCatalog.hash(output.bytes);
      const duplicate = mediaCatalog.findByHash(hash);
      if (duplicate) {
        mediaCatalog.touch(duplicate.id);
        platformStore.audit({ actorEmail: req.auth.email, action: 'media.transcode.deduplicated', resourceType: 'media', resourceId: duplicate.id, detail: { sha256: hash, fileName }, ip: req.ip });
        return res.json({ media: [duplicate.xiboPayload], catalog: { ...duplicate, deduplicated: true }, transcode: { preset, inputBytes: req.body.length, outputBytes: duplicate.bytes || 0 } });
      }
      const uploaded = await xiboClient.uploadMedia({ bytes: output.bytes, fileName: output.fileName, contentType: output.contentType, name: cleanHeader(req.get('x-media-name')) || output.fileName, tags: cleanHeader(req.get('x-media-tags')) || 'open-signage,transcoded' });
      const xiboPayload = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      const catalog = mediaCatalog.record({ bytes: output.bytes, fileName: output.fileName, displayName: cleanHeader(req.get('x-media-name')) || output.fileName, contentType: output.contentType, tags: cleanHeader(req.get('x-media-tags')) || 'open-signage,transcoded', xiboPayload });
      platformStore.audit({ actorEmail: req.auth.email, action: 'media.transcode.upload', resourceType: 'media', resourceId: catalog.id, detail: { preset, inputBytes: req.body.length, outputBytes: output.bytes.length, sha256: catalog.sha256 }, ip: req.ip });
      return res.status(201).json({ media: Array.isArray(uploaded) ? uploaded : [uploaded], catalog, transcode: { preset, inputBytes: req.body.length, outputBytes: output.bytes.length } });
    } catch (error) {
      return res.status(502).json({ error: 'TRANSCODE_FAILED', message: String(error?.message || 'transcode failed').replace(/\/(?:[^\s:]+\/)+[^\s:]+/g, '[path]').slice(0, 500) });
    }
  });
  return router;
}
function cleanHeader(value) { return String(value || '').replace(/[\r\n\u0000-\u001f]/g, '').trim().slice(0, 500); }
module.exports = { createMediaRouter };
