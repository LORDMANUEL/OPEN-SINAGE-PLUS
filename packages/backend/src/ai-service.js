const { normalizeScene } = require('./scene-store');

class AiService {
  constructor({ provider, baseUrl, model, apiKey, fetchImpl = globalThis.fetch, timeoutMs = 60000 }) {
    this.provider = provider || null;
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.model = model || null;
    this.apiKey = apiKey || '';
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  status() {
    return {
      configured: Boolean(this.provider && this.baseUrl && this.model),
      provider: this.provider || null,
      model: this.model || null,
    };
  }

  async generateScene(prompt) {
    if (!this.status().configured) throw new Error('AI service is not configured');
    const cleanPrompt = String(prompt || '').trim().slice(0, 12000);
    if (!cleanPrompt) throw new Error('prompt is required');

    const system = `You create JSON scenes for Open Signage Plus. Return ONLY valid JSON, no markdown.\nSchema: {"name":"string","duration":1..86400,"background":"css color","items":[...]}.\nAllowed item types: text, image, video, html, button, qr. Coordinates x,y,width,height are percentages 0..100.\nText item: {type:"text",text,color,fontSize,align}.\nImage/video: http(s) src only.\nHTML: safe fragment, no scripts or inline event handlers.\nButton: {type:"button",text,action:{type:"openUrl",url:"https://..."}} or {type:"button",text,action:{type:"ticket",queue:"recepcion",prefix:"R"}}.\nQR: {type:"qr",value:"text or https url"}.\nMake layouts readable from several meters away and touch targets large when interactive.`;

    let raw;
    if (this.provider === 'ollama') {
      const payload = await this.#request(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: `${system}\n\nUser request:\n${cleanPrompt}`,
        stream: false,
        format: 'json',
      });
      raw = payload?.response;
    } else if (this.provider === 'compatible') {
      const payload = await this.#request(`${this.baseUrl}/chat/completions`, {
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: cleanPrompt },
        ],
        temperature: 0.4,
      }, this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {});
      raw = payload?.choices?.[0]?.message?.content;
    } else {
      throw new Error(`unsupported AI provider: ${this.provider}`);
    }

    const parsed = parseJsonObject(raw);
    return normalizeScene(parsed);
  }

  async #request(url, body, extraHeaders = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...extraHeaders },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload;
      try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }
      if (!response.ok) throw new Error(`AI provider ${response.status}: ${payload?.error?.message || payload?.error || text || response.statusText}`);
      return payload;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('AI request timed out');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) throw new Error('AI response did not contain scene JSON');
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(stripped);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('scene must be an object');
    return parsed;
  } catch (error) {
    throw new Error(`AI response is not valid scene JSON: ${error.message}`);
  }
}

function createAiServiceFromEnv(env = process.env, fetchImpl = globalThis.fetch) {
  return new AiService({
    provider: String(env.AI_PROVIDER || '').trim().toLowerCase() || null,
    baseUrl: env.AI_BASE_URL,
    model: env.AI_MODEL,
    apiKey: env.AI_API_KEY,
    fetchImpl,
    timeoutMs: Number(env.AI_TIMEOUT_MS || 60000),
  });
}

module.exports = { AiService, createAiServiceFromEnv, parseJsonObject };
