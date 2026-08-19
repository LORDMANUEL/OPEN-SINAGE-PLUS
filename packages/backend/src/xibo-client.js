function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') throw new Error('Xibo baseUrl is required');

  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('Xibo baseUrl must be a valid HTTP(S) URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Xibo baseUrl must use HTTP or HTTPS');
  return value.replace(/\/+$/, '');
}

function appendFormFields(form, payload) {
  for (const [key, value] of Object.entries(payload || {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) form.append(`${key}[]`, String(item));
    } else {
      form.append(key, String(value));
    }
  }
  return form;
}

class XiboClient {
  constructor({ baseUrl, clientId, clientSecret, fetchImpl = globalThis.fetch, timeoutMs = 10000 }) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    if (!clientId) throw new Error('Xibo clientId is required');
    if (!clientSecret) throw new Error('Xibo clientSecret is required');
    if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  async authenticate() {
    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt - 30000) return this.token;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const response = await this.#fetch(`${this.baseUrl}/api/authorize/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const payload = await this.#parseResponse(response);
    if (!payload.access_token) throw new Error('Xibo OAuth response did not contain access_token');

    this.token = payload.access_token;
    this.tokenExpiresAt = now + Number(payload.expires_in || 300) * 1000;
    return this.token;
  }

  async request(path, options = {}) {
    const token = await this.authenticate();
    const headers = { Accept: 'application/json', ...(options.headers || {}), Authorization: `Bearer ${token}` };
    const response = await this.#fetch(`${this.baseUrl}${path}`, { ...options, headers });
    return this.#parseResponse(response);
  }

  async getDisplays() { return this.request('/api/display'); }
  async getLayouts() { return this.request('/api/layout'); }
  async getLibrary() { return this.request('/api/library'); }
  async getPlaylists() { return this.request('/api/playlist'); }
  async getDisplayGroups() { return this.request('/api/displaygroup'); }
  async getSchedules() { return this.request('/api/schedule'); }

  async createLayout(payload) {
    if (!payload?.name || typeof payload.name !== 'string') throw new Error('layout name is required');
    if (!payload.layoutId && !payload.resolutionId) throw new Error('resolutionId or template layoutId is required');

    const body = appendFormFields(new URLSearchParams(), {
      name: payload.name,
      description: payload.description,
      layoutId: payload.layoutId,
      resolutionId: payload.resolutionId,
      returnDraft: payload.returnDraft ?? true,
      code: payload.code,
    });

    return this.request('/api/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  async uploadMedia({ bytes, fileName, contentType = 'application/octet-stream', name, tags, playlistId }) {
    if (!bytes || typeof bytes.byteLength !== 'number' || bytes.byteLength === 0) throw new Error('media bytes are required');
    if (!fileName) throw new Error('fileName is required');

    const form = new FormData();
    const blob = new Blob([bytes], { type: contentType || 'application/octet-stream' });
    form.append('files', blob, fileName);
    if (name) form.append('name', name);
    if (tags) form.append('tags', tags);
    if (playlistId) form.append('playlistId', String(playlistId));

    return this.request('/api/library', {
      method: 'POST',
      body: form,
    });
  }

  async publishLayout(layoutId) {
    if (!Number.isInteger(Number(layoutId)) || Number(layoutId) <= 0) throw new Error('layoutId must be a positive integer');
    return this.request(`/api/layout/publish/${Number(layoutId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
    });
  }

  async createSchedule(payload) {
    const body = appendFormFields(new URLSearchParams(), payload);
    return this.request('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  async #fetch(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try { return await this.fetchImpl(url, { ...options, signal: controller.signal }); }
    catch (error) {
      if (error && error.name === 'AbortError') throw new Error('Xibo request timed out');
      throw error;
    } finally { clearTimeout(timer); }
  }

  async #parseResponse(response) {
    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }
    if (!response.ok) {
      const message = typeof payload === 'object' && payload
        ? payload.message || payload.error || JSON.stringify(payload)
        : String(payload || response.statusText || 'Xibo request failed');
      const error = new Error(`Xibo API ${response.status}: ${message}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }
}

module.exports = { XiboClient, normalizeBaseUrl, appendFormFields };
