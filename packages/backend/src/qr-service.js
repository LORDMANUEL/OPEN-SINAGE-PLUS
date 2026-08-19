class QrService {
  constructor({ baseUrl = process.env.QUICKCHART_BASE_URL || 'http://cms-quickchart:3400', fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async render(value) {
    const text = String(value || '').trim().slice(0, 2000);
    if (!text) throw new Error('QR value is required');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url = `${this.baseUrl}/qr?text=${encodeURIComponent(text)}&format=svg&size=500&margin=2`;
      const response = await this.fetchImpl(url, { headers: { Accept: 'image/svg+xml,image/png' }, signal: controller.signal });
      if (!response.ok) throw new Error(`QR renderer ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      return { contentType: response.headers.get('content-type') || 'image/svg+xml', bytes };
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('QR renderer timed out');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { QrService };
