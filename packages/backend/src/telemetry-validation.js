/**
 * Validate public telemetry against server-owned scene/device state before it
 * reaches analytics persistence. Tokens are untrusted input even when they are
 * syntactically valid; existence and assignment are checked here.
 */
async function validateTelemetryContext({ sceneStore, deviceStore, sceneToken, deviceToken = '' }) {
  const sceneKey = String(sceneToken || '').trim();
  if (!sceneKey) return { ok: false, status: 400, error: 'SCENE_REQUIRED' };

  let scene;
  try { scene = await sceneStore.get(sceneKey); }
  catch { return { ok: false, status: 400, error: 'INVALID_SCENE_TOKEN' }; }
  if (!scene) return { ok: false, status: 404, error: 'SCENE_NOT_FOUND' };

  const deviceKey = String(deviceToken || '').trim();
  if (!deviceKey) return { ok: true, scene, device: null };

  const devices = await deviceStore.list();
  const device = devices.find(item => item.deviceToken === deviceKey);
  if (!device) return { ok: false, status: 404, error: 'DEVICE_NOT_FOUND' };

  const assigned = device.sceneToken || null;
  const current = device.currentSceneToken || null;
  if (assigned && assigned !== sceneKey && current !== sceneKey) {
    return { ok: false, status: 409, error: 'TELEMETRY_SCENE_MISMATCH' };
  }
  return { ok: true, scene, device };
}

module.exports = { validateTelemetryContext };
