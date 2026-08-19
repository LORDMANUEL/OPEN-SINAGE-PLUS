const test = require('node:test');
const assert = require('node:assert/strict');
const { createAiServiceFromEnv } = require('../src/ai-service');

test('AI service reports local Ollama configuration and generates a validated scene', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({
      response: JSON.stringify({
        name: 'Promo IA',
        duration: 12,
        background: '#071426',
        items: [
          { type: 'text', text: 'Oferta especial', x: 8, y: 10, width: 84, height: 20 },
          { type: 'button', text: 'Ver promoción', x: 35, y: 70, width: 30, height: 10, action: { type: 'openUrl', url: 'https://example.com/promo' } }
        ]
      })
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const service = createAiServiceFromEnv({
    AI_PROVIDER: 'ollama',
    AI_BASE_URL: 'http://ollama:11434',
    AI_MODEL: 'qwen2.5:1.5b'
  }, fetchImpl);

  assert.deepEqual(service.status(), { configured: true, provider: 'ollama', model: 'qwen2.5:1.5b' });
  const scene = await service.generateScene('Crea una promoción táctil');
  assert.equal(scene.name, 'Promo IA');
  assert.equal(scene.items[1].action.type, 'openUrl');
  assert.equal(calls[0].url, 'http://ollama:11434/api/generate');
  assert.equal(JSON.parse(calls[0].options.body).stream, false);
});

test('AI service can use an OpenAI-compatible chat endpoint without leaking its API key', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ name: 'API Scene', duration: 10, background: '#000000', items: [{ type: 'text', text: 'Hola', x: 0, y: 0, width: 100, height: 100 }] }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const service = createAiServiceFromEnv({
    AI_PROVIDER: 'compatible',
    AI_BASE_URL: 'https://ai.example.com/v1',
    AI_MODEL: 'fast-model',
    AI_API_KEY: 'secret-key'
  }, fetchImpl);

  const scene = await service.generateScene('Hola');
  assert.equal(scene.name, 'API Scene');
  assert.equal(calls[0].url, 'https://ai.example.com/v1/chat/completions');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-key');
  assert.doesNotMatch(JSON.stringify(scene), /secret-key/);
});

test('AI service remains available but reports unconfigured when no provider is set', async () => {
  const service = createAiServiceFromEnv({}, async () => { throw new Error('must not call fetch'); });
  assert.deepEqual(service.status(), { configured: false, provider: null, model: null });
  await assert.rejects(() => service.generateScene('hola'), /not configured/i);
});
