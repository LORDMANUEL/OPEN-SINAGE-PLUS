const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTelemetryContext } = require('../src/telemetry-validation');

function stores({ scene = { token: 'scene_token_123' }, devices = [] } = {}) {
  return {
    sceneStore: { get: async token => token === scene?.token ? scene : null },
    deviceStore: { list: async () => devices },
  };
}

test('rejects telemetry for an unknown scene', async () => {
  const context = stores();
  const result = await validateTelemetryContext({ ...context, sceneToken: 'unknown_scene_123' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.equal(result.error, 'SCENE_NOT_FOUND');
});

test('accepts telemetry for a real scene without a paired device', async () => {
  const context = stores();
  const result = await validateTelemetryContext({ ...context, sceneToken: 'scene_token_123' });
  assert.equal(result.ok, true);
  assert.equal(result.device, null);
});

test('rejects unknown or mismatched device telemetry', async () => {
  const context = stores({ devices: [{ deviceToken: 'device_token_1234567890', sceneToken: 'other_scene_123', currentSceneToken: 'other_scene_123' }] });
  let result = await validateTelemetryContext({ ...context, sceneToken: 'scene_token_123', deviceToken: 'missing_device_1234567890' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'DEVICE_NOT_FOUND');

  result = await validateTelemetryContext({ ...context, sceneToken: 'scene_token_123', deviceToken: 'device_token_1234567890' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.error, 'TELEMETRY_SCENE_MISMATCH');
});

test('accepts a paired device on its assigned scene', async () => {
  const context = stores({ devices: [{ deviceToken: 'device_token_1234567890', sceneToken: 'scene_token_123', currentSceneToken: 'scene_token_123' }] });
  const result = await validateTelemetryContext({ ...context, sceneToken: 'scene_token_123', deviceToken: 'device_token_1234567890' });
  assert.equal(result.ok, true);
  assert.equal(result.device.deviceToken, 'device_token_1234567890');
});
